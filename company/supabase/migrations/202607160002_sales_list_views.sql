create index if not exists jobs_status_date_posted_id_idx
  on public.jobs (status, date_posted desc, id desc);
create index if not exists locations_region_idx
  on public.locations (region);
create index if not exists organizations_type_name_idx
  on public.organizations (organization_type, display_name);
create index if not exists sales_leads_stage_score_idx
  on public.sales_leads (stage, total_score desc, id);
create index if not exists sales_leads_grade_score_idx
  on public.sales_leads (grade, total_score desc, id);
create index if not exists sales_leads_owner_score_idx
  on public.sales_leads (owner_id, total_score desc, id);
create index if not exists contact_candidates_organization_status_idx
  on public.contact_candidates (organization_id, status);

create or replace view public.sales_job_list
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
  j.employment_type,
  j.status,
  j.first_seen_at,
  o.display_name as organization_name,
  o.organization_type,
  o.official_domain,
  l.region,
  l.locality,
  l.street_address,
  sl.total_score,
  sl.grade,
  lower(concat_ws(' ', j.title, j.source_job_id, o.display_name, o.official_domain)) as search_text
from public.jobs j
join public.organizations o on o.id = j.organization_id
left join public.locations l on l.id = j.location_id
left join public.sales_leads sl
  on sl.organization_id = j.organization_id
  and sl.location_id is null;

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
  lower(concat_ws(' ', o.display_name, o.official_name, o.official_domain)) as search_text
from public.sales_leads sl
join public.organizations o on o.id = sl.organization_id
left join public.profiles p on p.id = sl.owner_id
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

revoke all on table public.sales_job_list from public, anon;
revoke all on table public.sales_company_list from public, anon;
grant select on table public.sales_job_list to authenticated;
grant select on table public.sales_company_list to authenticated;

comment on view public.sales_job_list is
  'RLS-aware, read-only projection for paginated internal job lists.';
comment on view public.sales_company_list is
  'RLS-aware, one-row-per-organization projection for paginated internal company lists.';
