create extension if not exists pgcrypto;

create table if not exists public.access_allowlist (
  email text primary key check (email = lower(email)),
  role text not null default 'sales' check (role in ('admin', 'sales')),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  role text not null check (role in ('admin', 'sales')),
  active boolean not null default true,
  locale text not null default 'ja' check (locale in ('ja', 'ko')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'yolo_japan',
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  expected_count integer,
  observed_count integer not null default 0,
  page_count integer not null default 0,
  new_count integer not null default 0,
  changed_count integer not null default 0,
  missing_count integer not null default 0,
  closed_count integer not null default 0,
  new_organization_count integer not null default 0,
  contact_pending_count integer not null default 0,
  error_count integer not null default 0,
  warnings jsonb not null default '[]'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'yolo_japan',
  source_name text not null,
  normalized_name text not null,
  display_name text not null,
  official_name text,
  organization_type text not null default 'unknown'
    check (organization_type in ('direct_employer', 'agency', 'unknown')),
  official_domain text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, normalized_name)
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  region text,
  locality text,
  street_address text,
  normalized_address text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, normalized_address)
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'yolo_japan',
  source_job_id text not null,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  location_id uuid references public.locations(id) on delete set null,
  title text not null,
  source_url text not null,
  date_posted date,
  valid_through timestamptz,
  employment_type text,
  salary_min numeric,
  salary_max numeric,
  salary_unit text,
  salary_currency text,
  japanese_level text,
  visa_support boolean not null default false,
  foreigner_friendly boolean not null default false,
  qualification_support boolean not null default false,
  housing_support boolean not null default false,
  detail_checked_at timestamptz,
  listing_hash text not null,
  source_hash text not null,
  status text not null default 'active' check (status in ('active', 'missing', 'closed')),
  consecutive_missing_count integer not null default 0,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_job_id)
);

create table if not exists public.job_versions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  source_run_id uuid references public.source_runs(id) on delete set null,
  source_hash text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (job_id, source_hash)
);

create table if not exists public.contact_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  kind text not null check (kind in ('website', 'phone', 'email', 'contact_form', 'visit_address')),
  value text not null,
  source_url text not null,
  confidence text not null default 'medium' check (confidence in ('high', 'medium', 'low')),
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, kind, value)
);

create table if not exists public.sales_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  stage text not null default 'unreviewed'
    check (stage in ('unreviewed', 'researching', 'contact_ready', 'contacted', 'follow_up', 'meeting', 'proposal', 'won', 'lost', 'do_not_contact')),
  priority text not null default 'normal' check (priority in ('high', 'normal', 'low')),
  fit_score integer not null default 0 check (fit_score between 0 and 70),
  demand_score integer not null default 0 check (demand_score between 0 and 30),
  total_score integer generated always as (fit_score + demand_score) stored,
  grade text generated always as (
    case when fit_score + demand_score >= 70 then 'A'
         when fit_score + demand_score >= 45 then 'B'
         else 'C' end
  ) stored,
  score_reasons jsonb not null default '[]'::jsonb,
  next_action_at timestamptz,
  notes text,
  do_not_contact boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sales_leads_organization_only_unique
  on public.sales_leads (organization_id) where location_id is null;
create unique index if not exists sales_leads_organization_location_unique
  on public.sales_leads (organization_id, location_id) where location_id is not null;

create table if not exists public.sales_activities (
  id uuid primary key default gen_random_uuid(),
  sales_lead_id uuid not null references public.sales_leads(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  activity_type text not null
    check (activity_type in ('note', 'email', 'phone', 'visit', 'meeting', 'follow_up', 'stage_change')),
  notes text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists jobs_status_last_seen_idx on public.jobs (status, last_seen_at desc);
create index if not exists jobs_organization_idx on public.jobs (organization_id, status);
create index if not exists jobs_date_posted_idx on public.jobs (date_posted desc);
create index if not exists source_runs_started_idx on public.source_runs (started_at desc);
create index if not exists sales_leads_follow_up_idx on public.sales_leads (next_action_at) where next_action_at is not null;
create index if not exists contact_candidates_status_idx on public.contact_candidates (status, organization_id);
create index if not exists sales_activities_lead_idx on public.sales_activities (sales_lead_id, occurred_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_access_allowlist_updated_at on public.access_allowlist;
create trigger set_access_allowlist_updated_at before update on public.access_allowlist
for each row execute function public.set_updated_at();
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at before update on public.organizations
for each row execute function public.set_updated_at();
drop trigger if exists set_locations_updated_at on public.locations;
create trigger set_locations_updated_at before update on public.locations
for each row execute function public.set_updated_at();
drop trigger if exists set_jobs_updated_at on public.jobs;
create trigger set_jobs_updated_at before update on public.jobs
for each row execute function public.set_updated_at();
drop trigger if exists set_contact_candidates_updated_at on public.contact_candidates;
create trigger set_contact_candidates_updated_at before update on public.contact_candidates
for each row execute function public.set_updated_at();
drop trigger if exists set_sales_leads_updated_at on public.sales_leads;
create trigger set_sales_leads_updated_at before update on public.sales_leads
for each row execute function public.set_updated_at();

revoke all on function public.set_updated_at() from public, anon, authenticated;

create or replace function public.sync_allowlisted_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  allowed public.access_allowlist%rowtype;
begin
  select * into allowed
  from public.access_allowlist
  where email = lower(new.email) and active = true;

  if found then
    insert into public.profiles (id, email, display_name, role, active)
    values (
      new.id,
      lower(new.email),
      coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
      allowed.role,
      true
    )
    on conflict (id) do update set
      email = excluded.email,
      display_name = coalesce(excluded.display_name, public.profiles.display_name),
      role = excluded.role,
      active = true;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.sync_allowlisted_profile();

revoke all on function public.sync_allowlisted_profile() from public, anon, authenticated;

create or replace function public.activate_my_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_email text;
  allowed public.access_allowlist%rowtype;
  result public.profiles%rowtype;
begin
  select lower(email) into current_email from auth.users where id = auth.uid();
  if current_email is null then
    raise exception 'not_authenticated';
  end if;

  select * into allowed from public.access_allowlist
  where email = current_email and active = true;
  if not found then
    delete from public.profiles where id = auth.uid();
    raise exception 'not_allowlisted';
  end if;

  insert into public.profiles (id, email, display_name, role, active)
  select id, current_email,
    coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name'),
    allowed.role, true
  from auth.users where id = auth.uid()
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    role = allowed.role,
    active = true
  returning * into result;

  return result;
end;
$$;

create or replace function public.current_internal_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active = true;
$$;

create or replace function public.is_internal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_internal_role() in ('admin', 'sales');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_internal_role() = 'admin';
$$;

revoke all on function public.activate_my_profile() from public, anon;
revoke all on function public.current_internal_role() from public, anon;
revoke all on function public.is_internal_user() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.activate_my_profile() to authenticated;
grant execute on function public.current_internal_role() to authenticated;
grant execute on function public.is_internal_user() to authenticated;
grant execute on function public.is_admin() to authenticated;

alter table public.access_allowlist enable row level security;
alter table public.profiles enable row level security;
alter table public.source_runs enable row level security;
alter table public.organizations enable row level security;
alter table public.locations enable row level security;
alter table public.jobs enable row level security;
alter table public.job_versions enable row level security;
alter table public.contact_candidates enable row level security;
alter table public.sales_leads enable row level security;
alter table public.sales_activities enable row level security;

create policy "admins_manage_allowlist" on public.access_allowlist
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "internal_read_profiles" on public.profiles
for select to authenticated using (public.is_internal_user());
create policy "admins_update_profiles" on public.profiles
for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "internal_read_runs" on public.source_runs
for select to authenticated using (public.is_internal_user());
create policy "admins_manage_runs" on public.source_runs
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "internal_read_organizations" on public.organizations
for select to authenticated using (public.is_internal_user());
create policy "admins_manage_organizations" on public.organizations
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "internal_read_locations" on public.locations
for select to authenticated using (public.is_internal_user());
create policy "admins_manage_locations" on public.locations
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "internal_read_jobs" on public.jobs
for select to authenticated using (public.is_internal_user());
create policy "admins_manage_jobs" on public.jobs
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "internal_read_job_versions" on public.job_versions
for select to authenticated using (public.is_internal_user());
create policy "admins_manage_job_versions" on public.job_versions
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "internal_read_contacts" on public.contact_candidates
for select to authenticated using (public.is_internal_user());
create policy "internal_create_contacts" on public.contact_candidates
for insert to authenticated with check (public.is_internal_user());
create policy "internal_update_contacts" on public.contact_candidates
for update to authenticated using (public.is_internal_user()) with check (public.is_internal_user());
create policy "admins_delete_contacts" on public.contact_candidates
for delete to authenticated using (public.is_admin());

create policy "internal_read_leads" on public.sales_leads
for select to authenticated using (public.is_internal_user());
create policy "internal_create_leads" on public.sales_leads
for insert to authenticated with check (public.is_admin());
create policy "internal_update_leads" on public.sales_leads
for update to authenticated using (public.is_internal_user()) with check (public.is_internal_user());
create policy "admins_delete_leads" on public.sales_leads
for delete to authenticated using (public.is_admin());

create policy "internal_read_activities" on public.sales_activities
for select to authenticated using (public.is_internal_user());
create policy "internal_create_activities" on public.sales_activities
for insert to authenticated with check (public.is_internal_user());
create policy "admins_delete_activities" on public.sales_activities
for delete to authenticated using (public.is_admin());

create or replace function public.protect_sales_lead_system_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and not public.is_admin() then
    new.organization_id = old.organization_id;
    new.location_id = old.location_id;
    new.fit_score = old.fit_score;
    new.demand_score = old.demand_score;
    new.score_reasons = old.score_reasons;
    new.created_at = old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_sales_lead_system_fields on public.sales_leads;
create trigger protect_sales_lead_system_fields
before update on public.sales_leads
for each row execute function public.protect_sales_lead_system_fields();

revoke all on function public.protect_sales_lead_system_fields() from public, anon, authenticated;
