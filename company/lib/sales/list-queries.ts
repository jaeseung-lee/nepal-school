import type { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  escapeLikePattern,
  pageRange,
  type CompanyListParams,
  type JobListParams,
} from "@/lib/sales/listing";

type SalesSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

const JOB_LIST_COLUMNS = "id,source_job_id,organization_id,title,source_url,date_posted,employment_type,status,first_seen_at,organization_name,organization_type,region,locality,street_address,total_score,grade";
const COMPANY_LIST_COLUMNS = "lead_id,organization_id,organization_name,organization_type,official_domain,total_score,grade,stage,owner_id,owner_display_name,owner_email,next_action_at,active_job_count,contact_status";

export type JobListRow = {
  id: string;
  source_job_id: string;
  organization_id: string;
  title: string;
  source_url: string;
  date_posted: string | null;
  employment_type: string | null;
  status: string;
  first_seen_at: string;
  organization_name: string;
  organization_type: string;
  region: string | null;
  locality: string | null;
  street_address: string | null;
  total_score: number | null;
  grade: string | null;
};

export type CompanyListRow = {
  lead_id: string;
  organization_id: string;
  organization_name: string;
  organization_type: string;
  official_domain: string | null;
  total_score: number;
  grade: string;
  stage: string;
  owner_id: string | null;
  owner_display_name: string | null;
  owner_email: string | null;
  next_action_at: string | null;
  active_job_count: number;
  contact_status: string;
};

function jobListQuery(client: SalesSupabaseClient, params: JobListParams, withCount: boolean) {
  let query = client
    .from("sales_job_list")
    .select(JOB_LIST_COLUMNS, { count: withCount ? "exact" : undefined })
    .order("date_posted", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (params.q) query = query.ilike("search_text", `%${escapeLikePattern(params.q.toLocaleLowerCase())}%`);
  if (params.status !== "all") query = query.eq("status", params.status);
  if (params.region) query = query.ilike("region", `%${escapeLikePattern(params.region)}%`);
  if (params.employment !== "all") query = query.ilike("employment_type", `%${escapeLikePattern(params.employment)}%`);
  if (params.grade !== "all") query = query.eq("grade", params.grade);
  if (params.companyType !== "all") query = query.eq("organization_type", params.companyType);
  if (params.freshness === "new") {
    query = query.gte("first_seen_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1_000).toISOString());
  }
  return query;
}

export async function fetchJobListPage(client: SalesSupabaseClient, params: JobListParams) {
  const { from, to } = pageRange(params.page);
  const result = await jobListQuery(client, params, true).range(from, to);
  return {
    rows: (result.data ?? []) as JobListRow[],
    total: result.count ?? 0,
    error: result.error,
  };
}

export async function fetchAllFilteredJobs(client: SalesSupabaseClient, params: JobListParams) {
  const batchSize = 1_000;
  const rows: JobListRow[] = [];
  for (let offset = 0; ; offset += batchSize) {
    const result = await jobListQuery(client, params, false).range(offset, offset + batchSize - 1);
    if (result.error) return { rows: [], error: result.error };
    const batch = (result.data ?? []) as JobListRow[];
    rows.push(...batch);
    if (batch.length < batchSize) return { rows, error: null };
  }
}

function companyListQuery(client: SalesSupabaseClient, params: CompanyListParams) {
  let query = client
    .from("sales_company_list")
    .select(COMPANY_LIST_COLUMNS, { count: "exact" })
    .order("total_score", { ascending: false })
    .order("organization_name", { ascending: true })
    .order("organization_id", { ascending: true });

  if (params.q) query = query.ilike("search_text", `%${escapeLikePattern(params.q.toLocaleLowerCase())}%`);
  if (params.stage !== "all") query = query.eq("stage", params.stage);
  if (params.grade !== "all") query = query.eq("grade", params.grade);
  if (params.contact !== "all") query = query.eq("contact_status", params.contact);
  if (params.owner !== "all") query = query.eq("owner_id", params.owner);
  return query;
}

export async function fetchCompanyListPage(client: SalesSupabaseClient, params: CompanyListParams) {
  const { from, to } = pageRange(params.page);
  const result = await companyListQuery(client, params).range(from, to);
  return {
    rows: (result.data ?? []) as CompanyListRow[],
    total: result.count ?? 0,
    error: result.error,
  };
}
