import Link from "next/link";
import { redirect } from "next/navigation";
import { GradeBadge, StatusBadge } from "@/components/sales/badges";
import { EmptyList, ListQueryError, ListResultSummary, Pagination } from "@/components/sales/list-ui";
import ViewToggle from "@/components/sales/view-toggle";
import {
  employmentTypeLabels,
  formatEmploymentType,
  formatOrganizationType,
  formatSalesDate,
  formatStatusLabel,
  localizedLabel,
  salesMessages,
} from "@/lib/sales/i18n";
import { getSalesLocale } from "@/lib/sales/locale";
import { fetchJobListPage, type JobListRow } from "@/lib/sales/list-queries";
import {
  buildListHref,
  FILTERABLE_EMPLOYMENT_TYPES,
  parseJobListParams,
  totalPages,
  type JobListParams,
} from "@/lib/sales/listing";
import { getSalesListView } from "@/lib/sales/view-preference";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type JobsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const [locale, rawParams, view] = await Promise.all([getSalesLocale(), searchParams, getSalesListView("jobs")]);
  const t = salesMessages[locale];
  const params = parseJobListParams(rawParams);
  const hrefParams = jobHrefParams(params);
  const supabase = await createServerSupabaseClient();
  const result = await fetchJobListPage(supabase, params);
  const retryHref = buildListHref("/sales/jobs", hrefParams, params.page);

  if (!result.error && result.total > 0 && params.page > totalPages(result.total)) {
    redirect(buildListHref("/sales/jobs", hrefParams, totalPages(result.total)));
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.08em] text-[#1d5cff]">{t.sourceInventory}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">{t.jobs}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ViewToggle scope="jobs" view={view} locale={locale} labels={{ table: t.tableView, cards: t.cardView, error: t.loadError }} />
          <Link href={buildListHref("/sales/jobs/export", hrefParams, 1)} className="rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-[#9aabc0] hover:bg-[#f8fafc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff] focus-visible:ring-offset-2 active:scale-[0.98]">{t.exportCsv}</Link>
        </div>
      </div>

      <form className="mt-6 grid gap-3 rounded-2xl border border-[#dce3eb] bg-white p-4 md:grid-cols-3 xl:grid-cols-9">
        <input name="q" defaultValue={params.q} placeholder={t.search} aria-label={t.search} className="rounded-lg border border-[#d5dce5] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff] xl:col-span-2" />
        <FilterSelect name="status" label={t.status} defaultValue={params.status} options={[["all", `${t.status}: ${t.all}`], ["active", formatStatusLabel("active", locale)], ["missing", formatStatusLabel("missing", locale)], ["closed", formatStatusLabel("closed", locale)]]} />
        <input name="region" defaultValue={params.region} placeholder={t.region} aria-label={t.region} className="rounded-lg border border-[#d5dce5] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff]" />
        <FilterSelect name="employment" label={t.employment} defaultValue={params.employment} options={[["all", `${t.employment}: ${t.all}`], ...FILTERABLE_EMPLOYMENT_TYPES.map((value) => [value, localizedLabel(employmentTypeLabels, value, locale)] as [string, string])]} />
        <FilterSelect name="grade" label={t.grade} defaultValue={params.grade} options={[["all", `${t.grade}: ${t.all}`], ["A", "A"], ["B", "B"], ["C", "C"]]} />
        <FilterSelect name="companyType" label={t.companyType} defaultValue={params.companyType} options={[["all", `${t.companyType}: ${t.all}`], ["direct_employer", formatOrganizationType("direct_employer", locale)], ["agency", formatOrganizationType("agency", locale)], ["unknown", formatOrganizationType("unknown", locale)]]} />
        <FilterSelect name="freshness" label={t.freshness} defaultValue={params.freshness} options={[["all", `${t.freshness}: ${t.all}`], ["new", t.addedLastSevenDays]]} />
        <button className="rounded-lg bg-[#17233a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#25334b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff] focus-visible:ring-offset-2 active:scale-[0.98] md:col-span-3 xl:col-span-1">{t.filter}</button>
      </form>

      {result.error ? <ListQueryError locale={locale} retryHref={retryHref} /> : (
        <>
          <div className="mt-5 flex items-center justify-between gap-3">
            <ListResultSummary page={params.page} total={result.total} locale={locale} />
          </div>
          {result.rows.length ? (
            view === "table" ? <JobsTable rows={result.rows} locale={locale} /> : <JobsCards rows={result.rows} locale={locale} />
          ) : <EmptyList locale={locale} />}
          <Pagination pathname="/sales/jobs" params={hrefParams} page={params.page} total={result.total} locale={locale} />
        </>
      )}
    </div>
  );
}

function JobsTable({ rows, locale }: { rows: JobListRow[]; locale: "ja" | "ko" }) {
  const t = salesMessages[locale];
  return (
    <div className="mt-3 overflow-x-auto rounded-2xl border border-[#dce3eb] bg-white">
      <table className="w-full min-w-[1050px] text-left text-sm">
        <caption className="sr-only">{t.jobs}</caption>
        <thead className="border-b border-[#dce3eb] bg-[#f8fafc] text-xs text-[#667286]"><tr><th scope="col" className="px-4 py-3">ID</th><th scope="col" className="px-4 py-3">{t.company}</th><th scope="col" className="px-4 py-3">{t.jobs}</th><th scope="col" className="px-4 py-3">{t.location}</th><th scope="col" className="px-4 py-3">{t.employment}</th><th scope="col" className="px-4 py-3">{t.score}</th><th scope="col" className="px-4 py-3">{t.status}</th><th scope="col" className="px-4 py-3">{t.posted}</th><th scope="col" className="px-4 py-3">{t.source}</th></tr></thead>
        <tbody className="divide-y divide-[#e8edf2]">
          {rows.map((job) => (
            <tr key={job.id} className="transition hover:bg-[#f8fbff]">
              <td className="px-4 py-3 font-mono text-xs">{job.source_job_id}</td>
              <td className="px-4 py-3"><Link className="font-semibold hover:text-[#1d5cff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff]" href={`/sales/companies/${job.organization_id}`}>{job.organization_name}</Link><p className="mt-1 text-xs text-[#8792a2]">{formatOrganizationType(job.organization_type, locale)}</p></td>
              <td className="max-w-sm px-4 py-3 font-medium">{job.title}</td>
              <td className="px-4 py-3">{formatLocation(job)}</td>
              <td className="px-4 py-3">{formatEmploymentType(job.employment_type, locale)}</td>
              <td className="px-4 py-3"><span className="mr-2 font-bold tabular-nums">{job.total_score ?? 0}</span><GradeBadge grade={job.grade ?? "C"} /></td>
              <td className="px-4 py-3"><StatusBadge status={job.status} locale={locale} /></td>
              <td className="whitespace-nowrap px-4 py-3">{formatSalesDate(job.date_posted, locale)}</td>
              <td className="px-4 py-3"><a href={job.source_url} target="_blank" rel="noreferrer" className="font-semibold text-[#1d5cff] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff]">{t.openSource} ↗</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JobsCards({ rows, locale }: { rows: JobListRow[]; locale: "ja" | "ko" }) {
  const t = salesMessages[locale];
  return (
    <div className="mt-3 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {rows.map((job) => (
        <article key={job.id} className="flex min-h-64 flex-col rounded-2xl bg-white p-5 shadow-sm shadow-[#17233a]/7 ring-1 ring-[#dfe5ec] transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#17233a]/8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0"><p className="font-mono text-[11px] text-[#8792a2]">#{job.source_job_id}</p><h2 className="mt-2 text-base font-bold leading-6 text-[#17233a]">{job.title}</h2></div>
            <StatusBadge status={job.status} locale={locale} />
          </div>
          <Link href={`/sales/companies/${job.organization_id}`} className="mt-4 block rounded-lg bg-[#f4f7fa] px-3 py-2.5 transition hover:bg-[#eaf0f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff]">
            <p className="truncate text-sm font-semibold">{job.organization_name}</p>
            <p className="mt-1 text-xs text-[#7a8698]">{formatOrganizationType(job.organization_type, locale)}</p>
          </Link>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <div><dt className="text-[#8792a2]">{t.location}</dt><dd className="mt-1 font-medium">{formatLocation(job)}</dd></div>
            <div><dt className="text-[#8792a2]">{t.employment}</dt><dd className="mt-1 font-medium">{formatEmploymentType(job.employment_type, locale)}</dd></div>
            <div><dt className="text-[#8792a2]">{t.posted}</dt><dd className="mt-1 font-medium">{formatSalesDate(job.date_posted, locale)}</dd></div>
            <div><dt className="text-[#8792a2]">{t.score}</dt><dd className="mt-1 flex items-center gap-2 font-bold tabular-nums">{job.total_score ?? 0}<GradeBadge grade={job.grade ?? "C"} /></dd></div>
          </dl>
          <a href={job.source_url} target="_blank" rel="noreferrer" className="mt-auto pt-5 text-sm font-semibold text-[#1d5cff] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff]">{t.openSource} ↗</a>
        </article>
      ))}
    </div>
  );
}

function formatLocation(job: JobListRow) {
  return [job.region, job.locality].filter(Boolean).join(" ") || "—";
}

function jobHrefParams(params: JobListParams) {
  return {
    q: params.q,
    status: params.status,
    region: params.region,
    employment: params.employment,
    grade: params.grade,
    companyType: params.companyType,
    freshness: params.freshness,
  };
}

function FilterSelect({ name, label, defaultValue, options }: { name: string; label: string; defaultValue: string; options: Array<[string, string]> }) {
  return <select name={name} aria-label={label} defaultValue={defaultValue} className="rounded-lg border border-[#d5dce5] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff]">{options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}</select>;
}
