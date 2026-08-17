import { NextResponse, type NextRequest } from "next/server";
import { getInternalProfile } from "@/lib/sales/auth";
import { getSalesLocale } from "@/lib/sales/locale";
import { buildExportRow, getExportHeaders, safeCsvCell } from "@/lib/sales/export-csv";
import { fetchAllFilteredJobExports } from "@/lib/sales/list-queries";
import { parseJobListParams } from "@/lib/sales/listing";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const profile = await getInternalProfile();
  if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const locale = await getSalesLocale();
  const params = parseJobListParams(request.nextUrl.searchParams);
  const supabase = await createServerSupabaseClient();
  const result = await fetchAllFilteredJobExports(supabase, params);
  if (result.error) return NextResponse.json({ error: "export_failed" }, { status: 500 });

  const header = getExportHeaders(locale);
  const lines = result.rows.map((job) => buildExportRow(job, locale).map(safeCsvCell).join(","));

  return new NextResponse(`\uFEFF${header.map(safeCsvCell).join(",")}\r\n${lines.join("\r\n")}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="yolo-care-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
