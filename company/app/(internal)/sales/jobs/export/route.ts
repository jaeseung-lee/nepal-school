import { NextResponse, type NextRequest } from "next/server";
import { getInternalProfile } from "@/lib/sales/auth";
import {
  formatEmploymentType,
  formatOrganizationType,
  formatStatusLabel,
  salesMessages,
} from "@/lib/sales/i18n";
import { getSalesLocale } from "@/lib/sales/locale";
import { fetchAllFilteredJobs } from "@/lib/sales/list-queries";
import { parseJobListParams } from "@/lib/sales/listing";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function safeCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const profile = await getInternalProfile();
  if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const locale = await getSalesLocale();
  const t = salesMessages[locale];
  const params = parseJobListParams(request.nextUrl.searchParams);
  const supabase = await createServerSupabaseClient();
  const result = await fetchAllFilteredJobs(supabase, params);
  if (result.error) return NextResponse.json({ error: "export_failed" }, { status: 500 });

  const header = [
    "YOLO Job ID",
    t.company,
    t.companyType,
    t.jobs,
    t.region,
    locale === "ja" ? "市区町村" : "시·구",
    t.employment,
    t.score,
    t.grade,
    t.status,
    t.posted,
    `${t.source} URL`,
  ];
  const lines = result.rows.map((job) => [
    job.source_job_id,
    job.organization_name,
    formatOrganizationType(job.organization_type, locale),
    job.title,
    job.region,
    job.locality,
    formatEmploymentType(job.employment_type, locale),
    job.total_score,
    job.grade,
    formatStatusLabel(job.status, locale),
    job.date_posted,
    job.source_url,
  ].map(safeCell).join(","));

  return new NextResponse(`\uFEFF${header.map(safeCell).join(",")}\r\n${lines.join("\r\n")}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="yolo-care-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
