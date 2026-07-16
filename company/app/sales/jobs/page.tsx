import Link from "next/link";
import { GradeBadge, StatusBadge } from "@/components/sales/badges";
import { formatSalesDate, getSalesLocale, salesMessages } from "@/lib/sales/i18n";
import { relationOne } from "@/lib/sales/relations";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type JobsPageProps = {
  searchParams: Promise<{ q?: string; status?: string; region?: string; employment?: string; grade?: string; companyType?: string; freshness?: string }>;
};

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const [locale, params] = await Promise.all([getSalesLocale(), searchParams]);
  const t = salesMessages[locale];
  const supabase = await createServerSupabaseClient();
  const [{ data: jobsData }, { data: leadsData }] = await Promise.all([
    supabase
      .from("jobs")
      .select("*,organizations(display_name,organization_type),locations(region,locality,street_address)")
      .order("date_posted", { ascending: false })
      .limit(1_000),
    supabase.from("sales_leads").select("organization_id,total_score,grade"),
  ]);
  const scoreByOrganization = new Map(
    ((leadsData ?? []) as Array<Record<string, unknown>>).map((lead) => [String(lead.organization_id), lead]),
  );
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1_000;
  const rows = ((jobsData ?? []) as Array<Record<string, unknown>>).filter((job) => {
    const org = relationOne(job.organizations as Record<string, unknown> | Record<string, unknown>[] | null);
    const location = relationOne(job.locations as Record<string, unknown> | Record<string, unknown>[] | null);
    const lead = scoreByOrganization.get(String(job.organization_id));
    const haystack = `${job.title} ${job.source_job_id} ${org?.display_name ?? ""}`.toLocaleLowerCase(locale);
    return (
      (!params.q || haystack.includes(params.q.toLocaleLowerCase(locale))) &&
      (!params.status || params.status === "all" || job.status === params.status) &&
      (!params.region || String(location?.region ?? "").includes(params.region)) &&
      (!params.employment || String(job.employment_type ?? "").includes(params.employment)) &&
      (!params.grade || params.grade === "all" || lead?.grade === params.grade) &&
      (!params.companyType || params.companyType === "all" || org?.organization_type === params.companyType) &&
      (!params.freshness || params.freshness !== "new" || new Date(String(job.first_seen_at)).valueOf() >= sevenDaysAgo)
    );
  });
  const exportParams = new URLSearchParams(Object.entries(params).filter(([, value]) => Boolean(value)) as Array<[string, string]>);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1d5cff]">Source inventory</p><h1 className="mt-2 text-3xl font-bold">{t.jobs}</h1></div>
        <Link href={`/sales/jobs/export?${exportParams}`} className="rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm font-semibold">{t.exportCsv}</Link>
      </div>
      <form className="mt-6 grid gap-3 rounded-2xl border border-[#dce3eb] bg-white p-4 md:grid-cols-3 xl:grid-cols-7">
        <input name="q" defaultValue={params.q} placeholder={t.search} className="rounded-lg border border-[#d5dce5] px-3 py-2 text-sm xl:col-span-2" />
        <FilterSelect name="status" defaultValue={params.status} options={[["all", t.all], ["active", "Active"], ["missing", t.missing], ["closed", t.closed]]} />
        <input name="region" defaultValue={params.region} placeholder={locale === "ja" ? "都道府県" : "지역"} className="rounded-lg border border-[#d5dce5] px-3 py-2 text-sm" />
        <FilterSelect name="grade" defaultValue={params.grade} options={[["all", `${t.grade}: ${t.all}`], ["A", "A"], ["B", "B"], ["C", "C"]]} />
        <FilterSelect name="companyType" defaultValue={params.companyType} options={[["all", `${t.company}: ${t.all}`], ["direct_employer", locale === "ja" ? "直接雇用" : "직접고용"], ["agency", locale === "ja" ? "紹介・派遣" : "중개사"], ["unknown", locale === "ja" ? "未確認" : "미확인"]]} />
        <button className="rounded-lg bg-[#17233a] px-4 py-2 text-sm font-semibold text-white">{t.filter}</button>
      </form>
      <p className="mt-4 text-sm text-[#6f7b8c]">{rows.length} {t.total}</p>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-[#dce3eb] bg-white">
        <table className="w-full min-w-[1050px] text-left text-sm">
          <thead className="border-b border-[#dce3eb] bg-[#f8fafc] text-xs text-[#667286]"><tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">{t.company}</th><th className="px-4 py-3">{t.jobs}</th><th className="px-4 py-3">{t.location}</th><th className="px-4 py-3">{t.employment}</th><th className="px-4 py-3">{t.score}</th><th className="px-4 py-3">{t.status}</th><th className="px-4 py-3">{t.posted}</th><th className="px-4 py-3">Source</th></tr></thead>
          <tbody className="divide-y divide-[#e8edf2]">
            {rows.map((job) => {
              const org = relationOne(job.organizations as Record<string, unknown> | Record<string, unknown>[] | null);
              const location = relationOne(job.locations as Record<string, unknown> | Record<string, unknown>[] | null);
              const lead = scoreByOrganization.get(String(job.organization_id));
              return <tr key={String(job.id)} className="hover:bg-[#f8fbff]"><td className="px-4 py-3 font-mono text-xs">{String(job.source_job_id)}</td><td className="px-4 py-3"><Link className="font-semibold hover:text-[#1d5cff]" href={`/sales/companies/${job.organization_id}`}>{String(org?.display_name ?? "—")}</Link><p className="mt-1 text-xs text-[#8792a2]">{String(org?.organization_type ?? "unknown")}</p></td><td className="max-w-sm px-4 py-3 font-medium">{String(job.title)}</td><td className="px-4 py-3">{[location?.region, location?.locality].filter(Boolean).join(" ") || "—"}</td><td className="px-4 py-3">{String(job.employment_type ?? "—")}</td><td className="px-4 py-3"><span className="mr-2 font-bold">{String(lead?.total_score ?? 0)}</span><GradeBadge grade={String(lead?.grade ?? "C")} /></td><td className="px-4 py-3"><StatusBadge status={String(job.status)} /></td><td className="px-4 py-3">{formatSalesDate(job.date_posted ? String(job.date_posted) : null, locale)}</td><td className="px-4 py-3"><a href={String(job.source_url)} target="_blank" rel="noreferrer" className="font-semibold text-[#1d5cff]">{t.openSource} ↗</a></td></tr>;
            })}
          </tbody>
        </table>
        {!rows.length ? <p className="py-12 text-center text-sm text-[#7b8798]">{t.noData}</p> : null}
      </div>
    </div>
  );
}

function FilterSelect({ name, defaultValue, options }: { name: string; defaultValue?: string; options: Array<[string, string]> }) {
  return <select name={name} defaultValue={defaultValue ?? "all"} className="rounded-lg border border-[#d5dce5] bg-white px-3 py-2 text-sm">{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>;
}
