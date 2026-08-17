import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/202607210001_contact_enrichment.sql",
  import.meta.url,
);

test("contact enrichment migration adds structured company and address fields", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /alter table public\.locations[\s\S]*add column if not exists postal_code text[\s\S]*add column if not exists country_code text not null default 'JP'/i);
  assert.match(sql, /alter table public\.organizations\s+add column if not exists corporate_number text/i);
  for (const kind of ["official_name", "corporate_number", "official_address"]) {
    assert.match(sql, new RegExp(`'${kind}'`));
  }
  for (const column of [
    "normalized_value",
    "department",
    "purpose",
    "is_primary",
    "discovery_method",
    "enrichment_run_id",
    "last_checked_at",
    "address_postal_code",
    "address_country_code",
    "address_region",
    "address_locality",
    "address_street",
    "address_type",
  ]) {
    assert.match(sql, new RegExp(`add column if not exists ${column}\\b`, "i"));
  }
  assert.match(sql, /create unique index if not exists contact_candidates_normalized_unique\s+on public\.contact_candidates \(organization_id, kind, normalized_value\)/i);
  assert.ok(
    sql.indexOf("contact_candidates_source_url_http_check") >
      sql.indexOf("update public.contact_candidates\nset normalized_value"),
    "legacy normalization must run before the new URL check is installed",
  );
});

test("contact enrichment claims and completion are service-role-only", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /create table if not exists public\.contact_enrichment_runs/i);
  assert.match(sql, /create table if not exists public\.contact_enrichment_tasks/i);
  assert.match(sql, /lease_expires_at timestamptz/i);
  assert.match(sql, /retry_count integer not null default 0 check \(retry_count between 0 and 3\)/i);
  assert.match(sql, /grant select \([\s\S]*organization_id[\s\S]*last_error[\s\S]*\) on public\.contact_enrichment_tasks to authenticated/i);
  assert.doesNotMatch(sql, /grant select \([\s\S]*claim_token[\s\S]*\) on public\.contact_enrichment_tasks to authenticated/i);
  assert.match(sql, /create or replace function public\.claim_contact_enrichment_tasks\(p_limit integer default 10\)/i);
  assert.match(sql, /new_lease_expires_at := now\(\) \+ interval '90 minutes'/i);
  assert.match(sql, /for update of o skip locked/i);
  assert.match(sql, /from public\.contact_enrichment_runs r[\s\S]*where r\.id = target_run_id[\s\S]*for update/i);
  assert.match(sql, /create or replace function public\.complete_contact_enrichment_task\([\s\S]*p_claim_token uuid[\s\S]*p_outcome text/i);
  assert.match(sql, /create or replace function public\.import_contact_enrichment_result\([\s\S]*p_claim_token uuid[\s\S]*p_candidates jsonb/i);
  assert.match(sql, /select t\.\*[\s\S]*for update[\s\S]*jsonb_to_recordset\(candidate_document\)[\s\S]*on conflict \(organization_id, kind, normalized_value\) do update/i);
  assert.match(sql, /where existing_candidate\.status = 'pending'/i);
  assert.match(sql, /c\.kind = 'email' and c\.status in \('pending', 'verified'\)/i);
  assert.match(sql, /grant execute on function public\.claim_contact_enrichment_tasks\(integer\) to service_role/i);
  assert.match(sql, /grant execute on function public\.complete_contact_enrichment_task\(uuid, uuid, uuid, text, text, integer\)\s+to service_role/i);
  assert.match(sql, /grant execute on function public\.import_contact_enrichment_result\(uuid, uuid, uuid, text, jsonb, text\)\s+to service_role/i);
  assert.doesNotMatch(sql, /grant execute on function public\.claim_contact_enrichment_tasks\(integer\) to authenticated/i);
  assert.doesNotMatch(sql, /grant execute on function public\.complete_contact_enrichment_task[^;]*to authenticated/i);
  assert.doesNotMatch(sql, /grant execute on function public\.import_contact_enrichment_result[^;]*to authenticated/i);
});

test("review state, readiness, and one-row-per-job export are enforced in SQL", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /old\.status in \('verified', 'rejected'\)[\s\S]*new\.status = 'pending'[\s\S]*new\.discovery_method = 'automated'/i);
  assert.match(sql, /create trigger project_verified_candidate_to_organization[\s\S]*after insert or update of status, value, normalized_value on public\.contact_candidates/i);
  assert.match(sql, /with ranked_verified_candidates as \([\s\S]*update public\.organizations o[\s\S]*official_domain = coalesce\(projected\.official_domain, o\.official_domain\)/i);
  assert.match(sql, /create or replace view public\.organization_contact_readiness\s+with \(security_invoker = true\)/i);
  assert.match(sql, /verified_address\.id as official_address_candidate_id/i);
  assert.match(sql, /when coalesce\(candidate_stats\.has_verified_official_address, false\)[\s\S]*candidate_stats\.has_verified_direct_contact/i);
  assert.match(sql, /create or replace view public\.sales_job_export\s+with \(security_invoker = true\)/i);
  assert.match(sql, /jsonb_agg\([\s\S]*filter \(where c\.status = 'verified'\) as verified_candidates/i);
  assert.match(sql, /filter \(where c\.status = 'pending'\) as pending_candidates/i);
  assert.match(sql, /where c\.organization_id = o\.id\s+and c\.status <> 'rejected'/i);
  assert.match(sql, /revoke all on table public\.sales_job_export from public, anon/i);
  assert.match(sql, /grant select on table public\.sales_job_export to authenticated/i);
});
