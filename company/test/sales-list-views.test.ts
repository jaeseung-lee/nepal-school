import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../supabase/migrations/202607160002_sales_list_views.sql", import.meta.url);

test("sales list views are read-only, RLS-aware, and internal-only", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /create or replace view public\.sales_job_list\s+with \(security_invoker = true\)/i);
  assert.match(sql, /create or replace view public\.sales_company_list\s+with \(security_invoker = true\)/i);
  assert.match(sql, /where sl\.location_id is null/i);
  assert.match(sql, /revoke all on table public\.sales_job_list from public, anon/i);
  assert.match(sql, /grant select on table public\.sales_job_list to authenticated/i);
  assert.match(sql, /revoke all on table public\.sales_company_list from public, anon/i);
  assert.match(sql, /grant select on table public\.sales_company_list to authenticated/i);
});
