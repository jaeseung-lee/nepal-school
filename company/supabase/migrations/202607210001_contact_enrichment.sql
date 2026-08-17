-- Corporate contact enrichment, review readiness, and one-row-per-job export.
-- This is a forward-only migration and intentionally leaves the original sales
-- dashboard migrations unchanged.

alter table public.locations
  add column if not exists postal_code text,
  add column if not exists country_code text not null default 'JP';

alter table public.organizations
  add column if not exists corporate_number text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.locations'::regclass
      and conname = 'locations_country_code_check'
  ) then
    alter table public.locations
      add constraint locations_country_code_check
      check (country_code ~ '^[A-Z]{2}$');
  end if;
end;
$$;

create table if not exists public.contact_enrichment_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'partial', 'failed')),
  requested_limit integer not null default 10 check (requested_limit between 1 and 50),
  claimed_count integer not null default 0 check (claimed_count >= 0),
  completed_count integer not null default 0 check (completed_count >= 0),
  candidate_count integer not null default 0 check (candidate_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_enrichment_tasks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.contact_enrichment_runs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'found', 'partial', 'ambiguous', 'not_found', 'failed')),
  retry_count integer not null default 0 check (retry_count between 0 and 3),
  claim_token uuid,
  claimed_at timestamptz,
  lease_expires_at timestamptz,
  completed_at timestamptz,
  next_retry_at timestamptz,
  candidate_count integer not null default 0 check (candidate_count >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, organization_id)
);

alter table public.contact_candidates
  add column if not exists normalized_value text,
  add column if not exists department text,
  add column if not exists purpose text,
  add column if not exists is_primary boolean not null default false,
  add column if not exists discovery_method text not null default 'manual',
  add column if not exists enrichment_run_id uuid references public.contact_enrichment_runs(id) on delete set null,
  add column if not exists last_checked_at timestamptz not null default now(),
  add column if not exists address_postal_code text,
  add column if not exists address_country_code text,
  add column if not exists address_region text,
  add column if not exists address_locality text,
  add column if not exists address_street text,
  add column if not exists address_type text;

alter table public.contact_candidates
  drop constraint if exists contact_candidates_kind_check;

alter table public.contact_candidates
  add constraint contact_candidates_kind_check
  check (
    kind in (
      'official_name',
      'corporate_number',
      'official_address',
      'website',
      'phone',
      'email',
      'contact_form',
      'visit_address'
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.contact_candidates'::regclass
      and conname = 'contact_candidates_discovery_method_check'
  ) then
    alter table public.contact_candidates
      add constraint contact_candidates_discovery_method_check
      check (discovery_method in ('automated', 'manual'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.contact_candidates'::regclass
      and conname = 'contact_candidates_address_type_check'
  ) then
    alter table public.contact_candidates
      add constraint contact_candidates_address_type_check
      check (
        address_type is null
        or address_type in ('registered_office', 'head_office', 'facility', 'other')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.contact_candidates'::regclass
      and conname = 'contact_candidates_address_country_code_check'
  ) then
    alter table public.contact_candidates
      add constraint contact_candidates_address_country_code_check
      check (address_country_code is null or address_country_code ~ '^[A-Z]{2}$');
  end if;

end;
$$;

create or replace function public.normalize_contact_candidate_value(
  candidate_kind text,
  candidate_value text
)
returns text
language plpgsql
immutable
strict
set search_path = pg_catalog
as $$
declare
  compact_value text := btrim(candidate_value);
  digits text;
begin
  if candidate_kind = 'email' then
    return lower(compact_value);
  elsif candidate_kind = 'phone' then
    digits := regexp_replace(compact_value, '[^0-9]', '', 'g');
    if compact_value like '+%' and digits ~ '^810[0-9]{9,10}$' then
      return '+81' || substring(digits from 4);
    elsif compact_value like '+%' then
      return '+' || digits;
    elsif digits ~ '^0[0-9]{9,10}$' then
      return '+81' || substring(digits from 2);
    end if;
    return digits;
  elsif candidate_kind = 'corporate_number' then
    return regexp_replace(compact_value, '[^0-9]', '', 'g');
  elsif candidate_kind in ('website', 'contact_form') then
    return regexp_replace(compact_value, '/+$', '');
  end if;
  return lower(regexp_replace(compact_value, '[[:space:]　]+', ' ', 'g'));
end;
$$;

revoke all on function public.normalize_contact_candidate_value(text, text)
  from public, anon, authenticated;

update public.contact_candidates
set normalized_value = public.normalize_contact_candidate_value(kind, value)
where normalized_value is null or btrim(normalized_value) = '';

alter table public.contact_candidates
  alter column normalized_value set not null;

-- A legacy database may contain case/punctuation variants that collapse to the
-- same normalized key. Keep the strongest reviewed evidence before enforcing
-- the new unique identity; no downstream table references candidate IDs.
with ranked_candidates as (
  select
    c.id,
    row_number() over (
      partition by c.organization_id, c.kind, c.normalized_value
      order by
        case c.status when 'verified' then 0 when 'pending' then 1 else 2 end,
        case c.confidence when 'high' then 0 when 'medium' then 1 else 2 end,
        c.is_primary desc,
        c.reviewed_at desc nulls last,
        c.created_at,
        c.id
    ) as duplicate_rank
  from public.contact_candidates c
)
delete from public.contact_candidates c
using ranked_candidates ranked
where c.id = ranked.id
  and ranked.duplicate_rank > 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.contact_candidates'::regclass
      and conname = 'contact_candidates_source_url_http_check'
  ) then
    -- Added after legacy backfill/deduplication so an old malformed URL does not
    -- make that migration update fail. NOT VALID still protects future writes.
    alter table public.contact_candidates
      add constraint contact_candidates_source_url_http_check
      check (source_url ~* '^https?://[^[:space:]]+$') not valid;
  end if;
end;
$$;

create unique index if not exists contact_candidates_normalized_unique
  on public.contact_candidates (organization_id, kind, normalized_value);

create index if not exists contact_candidates_readiness_idx
  on public.contact_candidates (organization_id, status, kind);
create index if not exists contact_candidates_enrichment_run_idx
  on public.contact_candidates (enrichment_run_id)
  where enrichment_run_id is not null;
create index if not exists contact_enrichment_tasks_due_idx
  on public.contact_enrichment_tasks (status, next_retry_at, lease_expires_at);
create index if not exists contact_enrichment_tasks_organization_idx
  on public.contact_enrichment_tasks (organization_id, created_at desc);
create index if not exists contact_enrichment_runs_started_idx
  on public.contact_enrichment_runs (started_at desc);

create or replace function public.prepare_contact_candidate()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.normalized_value is null or btrim(new.normalized_value) = '' then
    new.normalized_value := public.normalize_contact_candidate_value(new.kind, new.value);
  else
    new.normalized_value := btrim(new.normalized_value);
  end if;

  if new.normalized_value = '' then
    raise exception 'contact candidate normalized value must not be empty';
  end if;

  if tg_op = 'UPDATE'
     and old.status in ('verified', 'rejected')
     and new.status = 'pending'
     and new.discovery_method = 'automated' then
    new.status := old.status;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_contact_candidate on public.contact_candidates;
create trigger prepare_contact_candidate
before insert or update on public.contact_candidates
for each row execute function public.prepare_contact_candidate();

revoke all on function public.prepare_contact_candidate()
  from public, anon, authenticated;

create or replace function public.project_verified_candidate_to_organization()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  replacement_value text;
begin
  if new.kind not in ('official_name', 'corporate_number', 'website') then
    return new;
  end if;

  if new.status = 'verified' then
    if new.kind = 'official_name' then
      update public.organizations set official_name = new.value where id = new.organization_id;
    elsif new.kind = 'corporate_number' then
      update public.organizations set corporate_number = new.normalized_value where id = new.organization_id;
    elsif new.kind = 'website' then
      update public.organizations set official_domain = new.value where id = new.organization_id;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'verified' and new.status = 'rejected' then
    select c.value
    into replacement_value
    from public.contact_candidates c
    where c.organization_id = new.organization_id
      and c.kind = new.kind
      and c.status = 'verified'
      and c.id <> new.id
    order by c.is_primary desc, c.reviewed_at desc nulls last, c.created_at desc
    limit 1;

    if new.kind = 'official_name' then
      update public.organizations
      set official_name = replacement_value
      where id = new.organization_id and official_name = old.value;
    elsif new.kind = 'corporate_number' then
      update public.organizations
      set corporate_number = case
        when replacement_value is null then null
        else public.normalize_contact_candidate_value('corporate_number', replacement_value)
      end
      where id = new.organization_id and corporate_number = old.normalized_value;
    elsif new.kind = 'website' then
      update public.organizations
      set official_domain = replacement_value
      where id = new.organization_id and official_domain = old.value;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists project_verified_candidate_to_organization on public.contact_candidates;
create trigger project_verified_candidate_to_organization
after insert or update of status, value, normalized_value on public.contact_candidates
for each row execute function public.project_verified_candidate_to_organization();

revoke all on function public.project_verified_candidate_to_organization()
  from public, anon, authenticated;

-- Project any verified legacy candidates that predate the trigger. This uses
-- the same priority rule as rejection fallback and leaves manually populated
-- organization fields alone when no verified candidate exists.
with ranked_verified_candidates as (
  select
    c.organization_id,
    c.kind,
    c.value,
    c.normalized_value,
    row_number() over (
      partition by c.organization_id, c.kind
      order by c.is_primary desc, c.reviewed_at desc nulls last, c.created_at desc, c.id desc
    ) as candidate_rank
  from public.contact_candidates c
  where c.status = 'verified'
    and c.kind in ('official_name', 'corporate_number', 'website')
), projected_candidates as (
  select
    ranked.organization_id,
    max(ranked.value) filter (where ranked.kind = 'official_name') as official_name,
    max(ranked.normalized_value) filter (where ranked.kind = 'corporate_number') as corporate_number,
    max(ranked.value) filter (where ranked.kind = 'website') as official_domain
  from ranked_verified_candidates ranked
  where ranked.candidate_rank = 1
  group by ranked.organization_id
)
update public.organizations o
set
  official_name = coalesce(projected.official_name, o.official_name),
  corporate_number = coalesce(projected.corporate_number, o.corporate_number),
  official_domain = coalesce(projected.official_domain, o.official_domain)
from projected_candidates projected
where o.id = projected.organization_id;

drop trigger if exists set_contact_enrichment_runs_updated_at on public.contact_enrichment_runs;
create trigger set_contact_enrichment_runs_updated_at
before update on public.contact_enrichment_runs
for each row execute function public.set_updated_at();

drop trigger if exists set_contact_enrichment_tasks_updated_at on public.contact_enrichment_tasks;
create trigger set_contact_enrichment_tasks_updated_at
before update on public.contact_enrichment_tasks
for each row execute function public.set_updated_at();

alter table public.contact_enrichment_runs enable row level security;
alter table public.contact_enrichment_tasks enable row level security;

drop policy if exists "internal_read_contact_enrichment_runs" on public.contact_enrichment_runs;
create policy "internal_read_contact_enrichment_runs"
on public.contact_enrichment_runs
for select to authenticated
using (public.is_internal_user());

drop policy if exists "internal_read_contact_enrichment_tasks" on public.contact_enrichment_tasks;
create policy "internal_read_contact_enrichment_tasks"
on public.contact_enrichment_tasks
for select to authenticated
using (public.is_internal_user());

revoke all on table public.contact_enrichment_runs from public, anon, authenticated;
revoke all on table public.contact_enrichment_tasks from public, anon, authenticated;
grant select on table public.contact_enrichment_runs to authenticated;
grant select (
  id,
  run_id,
  organization_id,
  status,
  retry_count,
  claimed_at,
  lease_expires_at,
  completed_at,
  next_retry_at,
  candidate_count,
  last_error,
  created_at,
  updated_at
) on public.contact_enrichment_tasks to authenticated;
grant all on table public.contact_enrichment_runs to service_role;
grant all on table public.contact_enrichment_tasks to service_role;

create or replace view public.organization_contact_readiness
with (security_invoker = true)
as
select
  o.id as organization_id,
  case
    when coalesce(candidate_stats.has_verified_official_address, false)
      and coalesce(candidate_stats.has_verified_direct_contact, false) then 'ready'
    when coalesce(candidate_stats.pending_candidate_count, 0) > 0 then 'review_pending'
    when coalesce(candidate_stats.verified_candidate_count, 0) > 0 then 'partial'
    else 'missing'
  end as contact_readiness,
  coalesce(candidate_stats.has_verified_official_address, false) as has_verified_official_address,
  coalesce(candidate_stats.has_verified_direct_contact, false) as has_verified_direct_contact,
  coalesce(candidate_stats.verified_candidate_count, 0)::integer as verified_candidate_count,
  coalesce(candidate_stats.pending_candidate_count, 0)::integer as pending_candidate_count,
  verified_address.official_address,
  verified_address.source_url as official_address_source_url,
  latest_task.status as last_enrichment_status,
  coalesce(latest_task.completed_at, latest_task.claimed_at, latest_task.created_at) as last_enriched_at,
  verified_address.id as official_address_candidate_id
from public.organizations o
left join lateral (
  select
    bool_or(c.kind = 'official_address' and c.status = 'verified')
      as has_verified_official_address,
    bool_or(c.kind in ('email', 'phone', 'contact_form') and c.status = 'verified')
      as has_verified_direct_contact,
    count(*) filter (where c.status = 'verified') as verified_candidate_count,
    count(*) filter (where c.status = 'pending') as pending_candidate_count
  from public.contact_candidates c
  where c.organization_id = o.id
) candidate_stats on true
left join lateral (
  select
    c.id,
    nullif(
      concat_ws(
        ' ',
        case
          when nullif(btrim(c.address_postal_code), '') is not null
            then '〒' || btrim(c.address_postal_code)
        end,
        coalesce(
          nullif(concat_ws(' ', c.address_region, c.address_locality, c.address_street), ''),
          nullif(btrim(c.value), '')
        )
      ),
      ''
    ) as official_address,
    c.source_url
  from public.contact_candidates c
  where c.organization_id = o.id
    and c.kind = 'official_address'
    and c.status = 'verified'
  order by c.is_primary desc, c.reviewed_at desc nulls last, c.created_at desc
  limit 1
) verified_address on true
left join lateral (
  select t.status, t.completed_at, t.claimed_at, t.created_at
  from public.contact_enrichment_tasks t
  where t.organization_id = o.id
  order by t.created_at desc, t.id desc
  limit 1
) latest_task on true;

-- Keep all existing sales_company_list columns in their original order so
-- CREATE OR REPLACE remains backward compatible. New columns are appended.
create or replace view public.sales_company_list
with (security_invoker = true)
as
select
  sl.id as lead_id,
  o.id as organization_id,
  o.display_name as organization_name,
  o.organization_type,
  o.official_domain,
  sl.total_score,
  sl.grade,
  sl.stage,
  sl.owner_id,
  p.display_name as owner_display_name,
  p.email as owner_email,
  sl.next_action_at,
  coalesce(job_stats.active_job_count, 0)::integer as active_job_count,
  case
    when contact_stats.verified_count > 0 then 'verified'
    when contact_stats.pending_count > 0 then 'pending'
    when contact_stats.total_count = 0 then 'none'
    else 'rejected'
  end as contact_status,
  lower(concat_ws(' ', o.display_name, o.official_name, o.official_domain, o.corporate_number)) as search_text,
  o.official_name,
  o.corporate_number,
  readiness.contact_readiness,
  readiness.official_address,
  readiness.official_address_source_url,
  readiness.last_enrichment_status,
  readiness.last_enriched_at
from public.sales_leads sl
join public.organizations o on o.id = sl.organization_id
left join public.profiles p on p.id = sl.owner_id
left join public.organization_contact_readiness readiness
  on readiness.organization_id = o.id
left join lateral (
  select count(*) filter (where j.status = 'active') as active_job_count
  from public.jobs j
  where j.organization_id = o.id
) job_stats on true
left join lateral (
  select
    count(*) as total_count,
    count(*) filter (where c.status = 'verified') as verified_count,
    count(*) filter (where c.status = 'pending') as pending_count
  from public.contact_candidates c
  where c.organization_id = o.id
) contact_stats on true
where sl.location_id is null;

create or replace view public.sales_job_export
with (security_invoker = true)
as
select
  j.id,
  j.source_job_id,
  j.organization_id,
  j.location_id,
  j.title,
  j.source_url,
  j.date_posted,
  j.valid_through,
  j.employment_type,
  j.status,
  j.first_seen_at,
  o.display_name as organization_name,
  o.official_name,
  o.organization_type,
  o.corporate_number,
  o.official_domain,
  l.region,
  l.locality,
  l.street_address,
  l.postal_code,
  l.country_code,
  j.salary_min,
  j.salary_max,
  j.salary_unit,
  j.salary_currency,
  j.japanese_level,
  j.visa_support,
  j.foreigner_friendly,
  j.qualification_support,
  j.housing_support,
  sl.total_score,
  sl.grade,
  sl.stage,
  sl.owner_id,
  p.display_name as owner_display_name,
  p.email as owner_email,
  sl.next_action_at,
  readiness.contact_readiness,
  readiness.official_address,
  readiness.official_address_source_url,
  readiness.last_enrichment_status,
  readiness.last_enriched_at,
  coalesce(candidate_json.verified_candidates, '[]'::jsonb) as verified_candidates,
  coalesce(candidate_json.pending_candidates, '[]'::jsonb) as pending_candidates
from public.jobs j
join public.organizations o on o.id = j.organization_id
left join public.locations l on l.id = j.location_id
left join public.sales_leads sl
  on sl.organization_id = j.organization_id
  and sl.location_id is null
left join public.profiles p on p.id = sl.owner_id
left join public.organization_contact_readiness readiness
  on readiness.organization_id = o.id
left join lateral (
  select
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'kind', c.kind,
        'value', c.value,
        'normalized_value', c.normalized_value,
        'status', c.status,
        'source_url', c.source_url,
        'confidence', c.confidence,
        'department', c.department,
        'purpose', c.purpose,
        'is_primary', c.is_primary,
        'address_postal_code', c.address_postal_code,
        'address_country_code', c.address_country_code,
        'address_region', c.address_region,
        'address_locality', c.address_locality,
        'address_street', c.address_street,
        'address_type', c.address_type,
        'last_checked_at', c.last_checked_at
      )
      order by c.kind, c.is_primary desc, c.created_at
    ) filter (where c.status = 'verified') as verified_candidates,
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'kind', c.kind,
        'value', c.value,
        'normalized_value', c.normalized_value,
        'status', c.status,
        'source_url', c.source_url,
        'confidence', c.confidence,
        'department', c.department,
        'purpose', c.purpose,
        'is_primary', c.is_primary,
        'address_postal_code', c.address_postal_code,
        'address_country_code', c.address_country_code,
        'address_region', c.address_region,
        'address_locality', c.address_locality,
        'address_street', c.address_street,
        'address_type', c.address_type,
        'last_checked_at', c.last_checked_at
      )
      order by c.kind, c.is_primary desc, c.created_at
    ) filter (where c.status = 'pending') as pending_candidates
  from public.contact_candidates c
  where c.organization_id = o.id
    and c.status <> 'rejected'
) candidate_json on true;

revoke all on table public.organization_contact_readiness from public, anon;
revoke all on table public.sales_company_list from public, anon;
revoke all on table public.sales_job_export from public, anon;
grant select on table public.organization_contact_readiness to authenticated;
grant select on table public.sales_company_list to authenticated;
grant select on table public.sales_job_export to authenticated;

comment on view public.organization_contact_readiness is
  'RLS-aware organization contact readiness based only on human-verified candidates.';
comment on view public.sales_job_export is
  'RLS-aware one-row-per-job export projection with aggregated, non-rejected contact candidates.';

create or replace function public.refresh_contact_enrichment_run(target_run_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  task_total integer;
  task_active integer;
  task_complete integer;
  task_failed integer;
  candidates_found integer;
begin
  -- Serialize refreshes for tasks in the same run. Without this lock, two
  -- concurrent completions can each observe the other task as still running.
  perform 1
  from public.contact_enrichment_runs r
  where r.id = target_run_id
  for update;
  if not found then
    return;
  end if;

  select
    count(*),
    count(*) filter (where t.status in ('queued', 'running')),
    count(*) filter (where t.status not in ('queued', 'running')),
    count(*) filter (where t.status = 'failed'),
    coalesce(sum(t.candidate_count), 0)
  into task_total, task_active, task_complete, task_failed, candidates_found
  from public.contact_enrichment_tasks t
  where t.run_id = target_run_id;

  update public.contact_enrichment_runs r
  set
    claimed_count = task_total,
    completed_count = task_complete,
    candidate_count = candidates_found,
    error_count = task_failed,
    status = case
      when task_active > 0 then 'running'
      when task_total = 0 then 'succeeded'
      when task_failed = task_total then 'failed'
      when task_failed > 0 then 'partial'
      else 'succeeded'
    end,
    finished_at = case when task_active = 0 then coalesce(r.finished_at, now()) else null end
  where r.id = target_run_id;
end;
$$;

revoke all on function public.refresh_contact_enrichment_run(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.claim_contact_enrichment_tasks(p_limit integer default 10)
returns table (
  run_id uuid,
  task_id uuid,
  organization_id uuid,
  claim_token uuid,
  lease_expires_at timestamptz,
  missing_fields text[],
  organization_name text,
  organization_type text,
  location_hints jsonb,
  existing_candidates jsonb
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  selected_organization_ids uuid[] := '{}'::uuid[];
  selected_organization_id uuid;
  expired_run_id uuid;
  new_run_id uuid;
  new_task_id uuid;
  new_claim_token uuid;
  new_lease_expires_at timestamptz;
  previous_retry_count integer;
  organization_row record;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 50 then
    raise exception 'p_limit must be between 1 and 50';
  end if;

  -- Expired work is closed before selecting a replacement. The immediate due
  -- time lets the next worker safely resume with a new token.
  for expired_run_id in
    with expired as (
      update public.contact_enrichment_tasks t
      set
        status = 'failed',
        completed_at = now(),
        next_retry_at = case when t.retry_count < 3 then now() else null end,
        last_error = coalesce(t.last_error, 'lease_expired')
      where t.status = 'running'
        and t.lease_expires_at <= now()
      returning t.run_id
    )
    select distinct expired.run_id from expired
  loop
    perform public.refresh_contact_enrichment_run(expired_run_id);
  end loop;

  -- Lock organizations rather than a queue snapshot. Concurrent claim calls
  -- therefore skip an organization already selected by another transaction.
  for selected_organization_id in
    select o.id
    from public.organizations o
    join public.sales_leads sl
      on sl.organization_id = o.id
      and sl.location_id is null
    left join public.organization_contact_readiness readiness
      on readiness.organization_id = o.id
    left join lateral (
      select t.status, t.retry_count, t.next_retry_at, t.completed_at, t.lease_expires_at
      from public.contact_enrichment_tasks t
      where t.organization_id = o.id
      order by t.created_at desc, t.id desc
      limit 1
    ) latest_task on true
    where exists (
      select 1 from public.jobs j
      where j.organization_id = o.id and j.status = 'active'
    )
      and not coalesce((
        latest_task.status = 'running'
        and latest_task.lease_expires_at > now()
      ), false)
      and (
        latest_task.status is null
        or latest_task.status = 'queued'
        or (
          latest_task.status = 'failed'
          and latest_task.retry_count < 3
          and latest_task.next_retry_at is not null
          and latest_task.next_retry_at <= now()
        )
        or (
          latest_task.status in ('ambiguous', 'not_found')
          and latest_task.completed_at <= now() - interval '30 days'
        )
        or (
          latest_task.status in ('found', 'partial')
          and latest_task.completed_at <= now() - case
            when readiness.contact_readiness = 'ready' then interval '90 days'
            else interval '30 days'
          end
        )
      )
    order by sl.total_score desc, o.created_at, o.id
    for update of o skip locked
    limit p_limit
  loop
    selected_organization_ids := array_append(selected_organization_ids, selected_organization_id);
  end loop;

  if cardinality(selected_organization_ids) = 0 then
    return;
  end if;

  insert into public.contact_enrichment_runs (status, requested_limit, claimed_count)
  values ('running', p_limit, cardinality(selected_organization_ids))
  returning id into new_run_id;

  foreach selected_organization_id in array selected_organization_ids
  loop
    select coalesce(
      (
        select case when t.status = 'failed' then t.retry_count + 1 else 0 end
        from public.contact_enrichment_tasks t
        where t.organization_id = selected_organization_id
        order by t.created_at desc, t.id desc
        limit 1
      ),
      0
    ) into previous_retry_count;

    new_claim_token := gen_random_uuid();
    new_lease_expires_at := now() + interval '90 minutes';
    insert into public.contact_enrichment_tasks (
      run_id,
      organization_id,
      status,
      retry_count,
      claim_token,
      claimed_at,
      lease_expires_at
    ) values (
      new_run_id,
      selected_organization_id,
      'running',
      least(previous_retry_count, 3),
      new_claim_token,
      now(),
      new_lease_expires_at
    )
    returning id into new_task_id;

    select o.display_name, o.organization_type, o.official_name, o.corporate_number, o.official_domain
    into organization_row
    from public.organizations o
    where o.id = selected_organization_id;

    run_id := new_run_id;
    task_id := new_task_id;
    organization_id := selected_organization_id;
    claim_token := new_claim_token;
    lease_expires_at := new_lease_expires_at;
    organization_name := organization_row.display_name;
    organization_type := organization_row.organization_type;

    select array_remove(array[
      case when organization_row.official_name is null and not exists (
        select 1 from public.contact_candidates c
        where c.organization_id = selected_organization_id
          and c.kind = 'official_name' and c.status in ('pending', 'verified')
      ) then 'official_name' end,
      case when organization_row.corporate_number is null and not exists (
        select 1 from public.contact_candidates c
        where c.organization_id = selected_organization_id
          and c.kind = 'corporate_number' and c.status in ('pending', 'verified')
      ) then 'corporate_number' end,
      case when not exists (
        select 1 from public.contact_candidates c
        where c.organization_id = selected_organization_id
          and c.kind = 'official_address' and c.status in ('pending', 'verified')
      ) then 'official_address' end,
      case when organization_row.official_domain is null and not exists (
        select 1 from public.contact_candidates c
        where c.organization_id = selected_organization_id
          and c.kind = 'website' and c.status in ('pending', 'verified')
      ) then 'website' end,
      case when not exists (
        select 1 from public.contact_candidates c
        where c.organization_id = selected_organization_id
          and c.kind = 'phone' and c.status in ('pending', 'verified')
      ) then 'phone' end,
      case when not exists (
        select 1 from public.contact_candidates c
        where c.organization_id = selected_organization_id
          and c.kind = 'email' and c.status in ('pending', 'verified')
      ) then 'email' end,
      case when not exists (
        select 1 from public.contact_candidates c
        where c.organization_id = selected_organization_id
          and c.kind = 'contact_form' and c.status in ('pending', 'verified')
      ) then 'contact_form' end
    ], null) into missing_fields;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'location_id', hint.id,
          'region', hint.region,
          'locality', hint.locality,
          'street_address', hint.street_address,
          'postal_code', hint.postal_code,
          'country_code', hint.country_code,
          'active_job_count', hint.active_job_count
        )
        order by hint.active_job_count desc, hint.region, hint.locality
      ),
      '[]'::jsonb
    )
    into location_hints
    from (
      select
        l.id,
        l.region,
        l.locality,
        l.street_address,
        l.postal_code,
        l.country_code,
        count(j.id) filter (where j.status = 'active')::integer as active_job_count
      from public.locations l
      left join public.jobs j on j.location_id = l.id
      where l.organization_id = selected_organization_id
      group by l.id, l.region, l.locality, l.street_address, l.postal_code, l.country_code
    ) hint;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'kind', c.kind,
          'value', c.value,
          'normalized_value', c.normalized_value,
          'status', c.status,
          'source_url', c.source_url,
          'confidence', c.confidence,
          'department', c.department,
          'purpose', c.purpose,
          'is_primary', c.is_primary,
          'address_postal_code', c.address_postal_code,
          'address_country_code', c.address_country_code,
          'address_region', c.address_region,
          'address_locality', c.address_locality,
          'address_street', c.address_street,
          'address_type', c.address_type,
          'last_checked_at', c.last_checked_at
        )
        order by c.kind, c.status, c.created_at
      ),
      '[]'::jsonb
    )
    into existing_candidates
    from public.contact_candidates c
    where c.organization_id = selected_organization_id;

    return next;
  end loop;
end;
$$;

create or replace function public.complete_contact_enrichment_task(
  p_run_id uuid,
  p_organization_id uuid,
  p_claim_token uuid,
  p_outcome text,
  p_error_message text default null,
  p_candidate_count integer default 0
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  claimed_task public.contact_enrichment_tasks%rowtype;
  retry_at timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_outcome not in ('found', 'partial', 'ambiguous', 'not_found', 'failed') then
    raise exception 'invalid contact enrichment outcome';
  end if;
  if p_candidate_count < 0 then
    raise exception 'p_candidate_count must not be negative';
  end if;

  select t.*
  into claimed_task
  from public.contact_enrichment_tasks t
  where t.run_id = p_run_id
    and t.organization_id = p_organization_id
    and t.claim_token = p_claim_token
  for update;

  if not found then
    return false;
  end if;

  -- A repeated importer call with the same token/outcome is harmless.
  if claimed_task.status <> 'running' then
    return claimed_task.status = p_outcome;
  end if;
  if claimed_task.lease_expires_at <= now() then
    return false;
  end if;

  retry_at := case
    when p_outcome <> 'failed' then null
    when claimed_task.retry_count = 0 then now() + interval '1 day'
    when claimed_task.retry_count = 1 then now() + interval '3 days'
    when claimed_task.retry_count = 2 then now() + interval '7 days'
    else null
  end;

  update public.contact_enrichment_tasks t
  set
    status = p_outcome,
    completed_at = now(),
    next_retry_at = retry_at,
    candidate_count = p_candidate_count,
    last_error = case when p_outcome = 'failed' then p_error_message else null end
  where t.id = claimed_task.id;

  perform public.refresh_contact_enrichment_run(p_run_id);
  return true;
end;
$$;

create or replace function public.import_contact_enrichment_result(
  p_run_id uuid,
  p_organization_id uuid,
  p_claim_token uuid,
  p_outcome text,
  p_candidates jsonb,
  p_error_message text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  claimed_task public.contact_enrichment_tasks%rowtype;
  candidate_document jsonb;
  imported_candidate_count integer;
  completion_succeeded boolean;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_outcome not in ('found', 'partial', 'ambiguous', 'not_found', 'failed') then
    raise exception 'invalid contact enrichment outcome';
  end if;

  -- The task lock is acquired before parsing or writing any candidate. A stale
  -- worker can therefore never leave candidate rows behind.
  select t.*
  into claimed_task
  from public.contact_enrichment_tasks t
  where t.run_id = p_run_id
    and t.organization_id = p_organization_id
    and t.claim_token = p_claim_token
  for update;

  if not found then
    return false;
  end if;
  if claimed_task.status <> 'running' then
    -- Do not re-import or change the recorded count on an idempotent replay.
    return claimed_task.status = p_outcome;
  end if;
  if claimed_task.lease_expires_at <= now() then
    return false;
  end if;

  candidate_document := coalesce(p_candidates, '[]'::jsonb);
  if jsonb_typeof(candidate_document) <> 'array' then
    raise exception 'p_candidates must be a JSON array';
  end if;
  if jsonb_array_length(candidate_document) > 200 then
    raise exception 'p_candidates must contain at most 200 items';
  end if;
  if p_outcome in ('found', 'partial') and jsonb_array_length(candidate_document) = 0 then
    raise exception '% outcome requires at least one candidate', p_outcome;
  end if;
  if p_outcome in ('ambiguous', 'not_found', 'failed')
     and jsonb_array_length(candidate_document) <> 0 then
    raise exception '% outcome must not include candidates', p_outcome;
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(candidate_document) as candidate_input(location_id uuid)
    where candidate_input.location_id is not null
      and not exists (
        select 1
        from public.locations l
        where l.id = candidate_input.location_id
          and l.organization_id = p_organization_id
      )
  ) then
    raise exception 'candidate location does not belong to claimed organization';
  end if;

  select count(*)::integer
  into imported_candidate_count
  from (
    select distinct
      candidate_input.kind,
      coalesce(
        nullif(btrim(candidate_input.normalized_value), ''),
        public.normalize_contact_candidate_value(candidate_input.kind, candidate_input.value)
      ) as normalized_value
    from jsonb_to_recordset(candidate_document) as candidate_input(
      kind text,
      value text,
      normalized_value text
    )
  ) unique_candidates;

  with parsed_candidates as (
    select
      candidate_input.location_id,
      candidate_input.kind,
      candidate_input.value,
      coalesce(
        nullif(btrim(candidate_input.normalized_value), ''),
        public.normalize_contact_candidate_value(candidate_input.kind, candidate_input.value)
      ) as normalized_value,
      candidate_input.source_url,
      coalesce(candidate_input.confidence, 'medium') as confidence,
      candidate_input.notes,
      candidate_input.department,
      candidate_input.purpose,
      coalesce(candidate_input.is_primary, false) as is_primary,
      coalesce(candidate_input.last_checked_at, now()) as last_checked_at,
      candidate_input.address_postal_code,
      candidate_input.address_country_code,
      candidate_input.address_region,
      candidate_input.address_locality,
      candidate_input.address_street,
      candidate_input.address_type
    from jsonb_to_recordset(candidate_document) as candidate_input(
      location_id uuid,
      kind text,
      value text,
      normalized_value text,
      source_url text,
      confidence text,
      notes text,
      department text,
      purpose text,
      is_primary boolean,
      last_checked_at timestamptz,
      address_postal_code text,
      address_country_code text,
      address_region text,
      address_locality text,
      address_street text,
      address_type text
    )
  ), ranked_candidates as (
    select
      parsed.*,
      row_number() over (
        partition by parsed.kind, parsed.normalized_value
        order by
          case parsed.confidence when 'high' then 0 when 'medium' then 1 else 2 end,
          parsed.is_primary desc,
          parsed.last_checked_at desc
      ) as duplicate_rank
    from parsed_candidates parsed
  )
  insert into public.contact_candidates as existing_candidate (
    organization_id,
    location_id,
    kind,
    value,
    normalized_value,
    source_url,
    confidence,
    notes,
    department,
    purpose,
    is_primary,
    discovery_method,
    enrichment_run_id,
    last_checked_at,
    address_postal_code,
    address_country_code,
    address_region,
    address_locality,
    address_street,
    address_type
  )
  select
    p_organization_id,
    candidate.location_id,
    candidate.kind,
    candidate.value,
    candidate.normalized_value,
    candidate.source_url,
    candidate.confidence,
    candidate.notes,
    candidate.department,
    candidate.purpose,
    candidate.is_primary,
    'automated',
    p_run_id,
    candidate.last_checked_at,
    candidate.address_postal_code,
    candidate.address_country_code,
    candidate.address_region,
    candidate.address_locality,
    candidate.address_street,
    candidate.address_type
  from ranked_candidates candidate
  where candidate.duplicate_rank = 1
  on conflict (organization_id, kind, normalized_value) do update
  set
    location_id = excluded.location_id,
    value = excluded.value,
    source_url = excluded.source_url,
    confidence = excluded.confidence,
    notes = excluded.notes,
    department = excluded.department,
    purpose = excluded.purpose,
    is_primary = excluded.is_primary,
    discovery_method = 'automated',
    enrichment_run_id = excluded.enrichment_run_id,
    last_checked_at = excluded.last_checked_at,
    address_postal_code = excluded.address_postal_code,
    address_country_code = excluded.address_country_code,
    address_region = excluded.address_region,
    address_locality = excluded.address_locality,
    address_street = excluded.address_street,
    address_type = excluded.address_type
  -- Reviewer-approved/rejected evidence is immutable to automation. The row is
  -- merely left untouched when its normalized identity already exists.
  where existing_candidate.status = 'pending';

  completion_succeeded := public.complete_contact_enrichment_task(
    p_run_id,
    p_organization_id,
    p_claim_token,
    p_outcome,
    p_error_message,
    imported_candidate_count
  );
  if not completion_succeeded then
    raise exception 'contact enrichment claim is no longer active';
  end if;
  return true;
end;
$$;

revoke all on function public.claim_contact_enrichment_tasks(integer)
  from public, anon, authenticated;
revoke all on function public.complete_contact_enrichment_task(uuid, uuid, uuid, text, text, integer)
  from public, anon, authenticated;
revoke all on function public.import_contact_enrichment_result(uuid, uuid, uuid, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.claim_contact_enrichment_tasks(integer) to service_role;
grant execute on function public.complete_contact_enrichment_task(uuid, uuid, uuid, text, text, integer)
  to service_role;
grant execute on function public.import_contact_enrichment_result(uuid, uuid, uuid, text, jsonb, text)
  to service_role;

comment on function public.claim_contact_enrichment_tasks(integer) is
  'Atomically claims up to p_limit due organizations for 90 minutes; service role only.';
comment on function public.complete_contact_enrichment_task(uuid, uuid, uuid, text, text, integer) is
  'Idempotently completes an active enrichment claim and schedules bounded failure retries.';
comment on function public.import_contact_enrichment_result(uuid, uuid, uuid, text, jsonb, text) is
  'Atomically validates a claim, imports pending evidence, and completes the task; service role only.';
