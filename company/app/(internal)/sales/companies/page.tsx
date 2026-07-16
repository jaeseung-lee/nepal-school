import Link from "next/link";
import { redirect } from "next/navigation";
import { GradeBadge, StatusBadge } from "@/components/sales/badges";
import { EmptyList, ListQueryError, ListResultSummary, Pagination } from "@/components/sales/list-ui";
import ScoreCriteria from "@/components/sales/score-criteria";
import ViewToggle, { SalesListViewContent, SalesListViewProvider } from "@/components/sales/view-toggle";
import {
  formatOrganizationType,
  formatSalesDate,
  salesMessages,
  stageLabels,
} from "@/lib/sales/i18n";
import { getSalesLocale } from "@/lib/sales/locale";
import { fetchCompanyListPage, type CompanyListRow } from "@/lib/sales/list-queries";
import {
  buildListHref,
  parseCompanyListParams,
  totalPages,
  type CompanyListParams,
} from "@/lib/sales/listing";
import { getSalesListView } from "@/lib/sales/view-preference";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CompaniesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const [locale, rawParams, view] = await Promise.all([getSalesLocale(), searchParams, getSalesListView("companies")]);
  const t = salesMessages[locale];
  const params = parseCompanyListParams(rawParams);
  const hrefParams = companyHrefParams(params);
  const supabase = await createServerSupabaseClient();
  const [result, profilesResult] = await Promise.all([
    fetchCompanyListPage(supabase, params),
    supabase.from("profiles").select("id,display_name,email").eq("active", true).order("display_name"),
  ]);
  const retryHref = buildListHref("/sales/companies", hrefParams, params.page);

  if (!result.error && result.total > 0 && params.page > totalPages(result.total)) {
    redirect(buildListHref("/sales/companies", hrefParams, totalPages(result.total)));
  }

  return (
    <SalesListViewProvider
      scope="companies"
      initialView={view}
      locale={locale}
      labels={{ table: t.tableView, cards: t.cardView, error: t.viewPreferenceError }}
    >
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold tracking-[0.08em] text-[#1d5cff]">{t.accountView}</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">{t.companies}</h1></div>
        <ViewToggle />
      </div>

      <div className="mt-5"><ScoreCriteria locale={locale} /></div>

      <form className="mt-6 grid gap-3 rounded-2xl border border-[#dce3eb] bg-white p-4 md:grid-cols-3 xl:grid-cols-7">
        <input name="q" defaultValue={params.q} placeholder={t.search} aria-label={t.search} className="rounded-lg border border-[#d5dce5] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff] xl:col-span-2" />
        <Select name="stage" label={t.stage} value={params.stage} options={[["all", `${t.stage}: ${t.all}`], ...Object.entries(stageLabels[locale])]} />
        <Select name="grade" label={t.grade} value={params.grade} options={[["all", `${t.grade}: ${t.all}`], ["A", "A"], ["B", "B"], ["C", "C"]]} />
        <Select name="contact" label={t.contacts} value={params.contact} options={[["all", `${t.contacts}: ${t.all}`], ["verified", t.verified], ["pending", t.pending], ["rejected", t.rejected], ["none", t.notRegistered]]} />
        <Select name="owner" label={t.owner} value={params.owner} options={[["all", `${t.owner}: ${t.all}`], ...(profilesResult.data ?? []).map((profile) => [profile.id, profile.display_name ?? profile.email] as [string, string])]} />
        <button className="rounded-lg bg-[#17233a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#25334b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff] focus-visible:ring-offset-2 active:scale-[0.98] md:col-span-3 xl:col-span-1">{t.filter}</button>
      </form>

      {result.error || profilesResult.error ? <ListQueryError locale={locale} retryHref={retryHref} /> : (
        <>
          <div className="mt-5"><ListResultSummary page={params.page} total={result.total} locale={locale} /></div>
          {result.rows.length ? (
            <SalesListViewContent
              table={<CompaniesTable rows={result.rows} locale={locale} />}
              cards={<CompaniesCards rows={result.rows} locale={locale} />}
            />
          ) : <EmptyList locale={locale} />}
          <Pagination pathname="/sales/companies" params={hrefParams} page={params.page} total={result.total} locale={locale} />
        </>
      )}
    </div>
    </SalesListViewProvider>
  );
}

function CompaniesTable({ rows, locale }: { rows: CompanyListRow[]; locale: "ja" | "ko" }) {
  const t = salesMessages[locale];
  return (
    <div className="mt-3 overflow-x-auto rounded-2xl border border-[#dce3eb] bg-white">
      <table className="w-full min-w-[1000px] text-left text-sm">
        <caption className="sr-only">{t.companies}</caption>
        <thead className="border-b border-[#dce3eb] bg-[#f8fafc] text-xs text-[#667286]"><tr><th scope="col" className="px-4 py-3">{t.company}</th><th scope="col" className="px-4 py-3">{t.score}</th><th scope="col" className="px-4 py-3">{t.activeJobCount}</th><th scope="col" className="px-4 py-3">{t.stage}</th><th scope="col" className="px-4 py-3">{t.owner}</th><th scope="col" className="px-4 py-3">{t.contacts}</th><th scope="col" className="px-4 py-3">{t.nextAction}</th></tr></thead>
        <tbody className="divide-y divide-[#e8edf2]">
          {rows.map((row) => (
            <tr key={row.lead_id} className="transition hover:bg-[#f8fbff]">
              <td className="px-4 py-4"><Link href={`/sales/companies/${row.organization_id}`} className="font-semibold hover:text-[#1d5cff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff]">{row.organization_name}</Link><p className="mt-1 text-xs text-[#8792a2]">{formatOrganizationType(row.organization_type, locale)}</p></td>
              <td className="px-4 py-4"><span className="mr-2 font-bold tabular-nums">{row.total_score}</span><GradeBadge grade={row.grade} /></td>
              <td className="px-4 py-4 font-semibold tabular-nums">{row.active_job_count}</td>
              <td className="px-4 py-4">{stageLabels[locale][row.stage] ?? row.stage}</td>
              <td className="max-w-48 truncate px-4 py-4">{ownerName(row)}</td>
              <td className="px-4 py-4"><StatusBadge status={row.contact_status} locale={locale} /></td>
              <td className="whitespace-nowrap px-4 py-4">{formatSalesDate(row.next_action_at, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompaniesCards({ rows, locale }: { rows: CompanyListRow[]; locale: "ja" | "ko" }) {
  const t = salesMessages[locale];
  return (
    <div className="mt-3 grid gap-4 xl:grid-cols-2">
      {rows.map((row) => (
        <article key={row.lead_id} className="rounded-2xl bg-white p-5 shadow-sm shadow-[#17233a]/7 ring-1 ring-[#dfe5ec] transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#17233a]/8">
          <Link href={`/sales/companies/${row.organization_id}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0"><h2 className="truncate text-lg font-bold">{row.organization_name}</h2><p className="mt-1 text-xs text-[#7a8698]">{formatOrganizationType(row.organization_type, locale)} · {row.active_job_count} {t.activeJobs}</p></div>
              <div className="flex shrink-0 items-center gap-2"><span className="text-xl font-bold tabular-nums">{row.total_score}</span><GradeBadge grade={row.grade} /></div>
            </div>
          </Link>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-[#e8edf2] pt-4 text-xs sm:grid-cols-4">
            <div><dt className="text-[#8792a2]">{t.stage}</dt><dd className="mt-1 font-semibold">{stageLabels[locale][row.stage] ?? row.stage}</dd></div>
            <div><dt className="text-[#8792a2]">{t.owner}</dt><dd className="mt-1 truncate font-semibold">{ownerName(row)}</dd></div>
            <div><dt className="text-[#8792a2]">{t.contacts}</dt><dd className="mt-1"><StatusBadge status={row.contact_status} locale={locale} /></dd></div>
            <div><dt className="text-[#8792a2]">{t.nextAction}</dt><dd className="mt-1 font-semibold">{formatSalesDate(row.next_action_at, locale)}</dd></div>
          </dl>
        </article>
      ))}
    </div>
  );
}

function ownerName(row: CompanyListRow) {
  return row.owner_display_name ?? row.owner_email ?? "—";
}

function companyHrefParams(params: CompanyListParams) {
  return { q: params.q, stage: params.stage, grade: params.grade, contact: params.contact, owner: params.owner };
}

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: Array<[string, string]> }) {
  return <select name={name} aria-label={label} defaultValue={value} className="rounded-lg border border-[#d5dce5] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff]">{options.map(([key, optionLabel]) => <option key={key} value={key}>{optionLabel}</option>)}</select>;
}
