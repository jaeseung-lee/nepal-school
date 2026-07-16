import { NextResponse, type NextRequest } from "next/server";
import { getInternalProfile } from "@/lib/sales/auth";
import { relationOne } from "@/lib/sales/relations";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function safeCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const profile = await getInternalProfile();
  if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const supabase = await createServerSupabaseClient();
  const [{ data: jobs }, { data: leads }] = await Promise.all([
    supabase.from("jobs").select("*,organizations(display_name,organization_type),locations(region,locality)").order("date_posted", { ascending: false }).limit(2_000),
    supabase.from("sales_leads").select("organization_id,total_score,grade,stage,next_action_at"),
  ]);
  const leadMap = new Map(((leads ?? []) as Array<Record<string, unknown>>).map((lead) => [String(lead.organization_id), lead]));
  const q = params.get("q")?.toLowerCase();
  const rows = ((jobs ?? []) as Array<Record<string, unknown>>).filter((job) => {
    const org = relationOne(job.organizations as Record<string, unknown> | Record<string, unknown>[] | null);
    const location = relationOne(job.locations as Record<string, unknown> | Record<string, unknown>[] | null);
    const lead = leadMap.get(String(job.organization_id));
    return (!q || `${job.title} ${job.source_job_id} ${org?.display_name ?? ""}`.toLowerCase().includes(q)) &&
      (!params.get("status") || params.get("status") === "all" || job.status === params.get("status")) &&
      (!params.get("region") || String(location?.region ?? "").includes(params.get("region")!)) &&
      (!params.get("grade") || params.get("grade") === "all" || lead?.grade === params.get("grade")) &&
      (!params.get("companyType") || params.get("companyType") === "all" || org?.organization_type === params.get("companyType"));
  });
  const header = ["YOLO Job ID", "企業", "企業区分", "求人", "都道府県", "市区町村", "雇用形態", "スコア", "ランク", "状態", "掲載日", "原文URL"];
  const lines = rows.map((job) => {
    const org = relationOne(job.organizations as Record<string, unknown> | Record<string, unknown>[] | null);
    const location = relationOne(job.locations as Record<string, unknown> | Record<string, unknown>[] | null);
    const lead = leadMap.get(String(job.organization_id));
    return [job.source_job_id, org?.display_name, org?.organization_type, job.title, location?.region, location?.locality, job.employment_type, lead?.total_score, lead?.grade, job.status, job.date_posted, job.source_url].map(safeCell).join(",");
  });
  return new NextResponse(`\uFEFF${header.map(safeCell).join(",")}\r\n${lines.join("\r\n")}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="yolo-care-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
