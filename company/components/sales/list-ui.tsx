import Link from "next/link";
import { buildListHref, paginationItems, resultRange, totalPages } from "@/lib/sales/listing";
import { formatResultSummary, salesMessages, type SalesLocale } from "@/lib/sales/i18n";

export function ListResultSummary({ page, total, locale }: { page: number; total: number; locale: SalesLocale }) {
  const range = resultRange(page, total);
  return <p className="text-sm font-medium tabular-nums text-[#69768a]">{formatResultSummary(range.from, range.to, total, locale)}</p>;
}

export function Pagination({ pathname, params, page, total, locale }: { pathname: string; params: Record<string, string | number | undefined>; page: number; total: number; locale: SalesLocale }) {
  const t = salesMessages[locale];
  const pages = totalPages(total);
  if (pages <= 1) return null;

  return (
    <nav className="mt-6 flex flex-wrap items-center justify-center gap-1.5" aria-label={locale === "ja" ? "ページ移動" : "페이지 이동"}>
      <PageLink href={buildListHref(pathname, params, 1)} disabled={page <= 1} label={t.firstPage}>«</PageLink>
      <PageLink href={buildListHref(pathname, params, page - 1)} disabled={page <= 1} label={t.previousPage}>‹</PageLink>
      {paginationItems(page, pages).map((item) =>
        typeof item === "number" ? (
          <Link
            key={item}
            href={buildListHref(pathname, params, item)}
            aria-current={item === page ? "page" : undefined}
            aria-label={`${t.page} ${item}`}
            className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff] focus-visible:ring-offset-2 ${item === page ? "bg-[#17233a] text-white" : "border border-[#d5dde7] bg-white text-[#59667a] hover:border-[#9aabc0] hover:text-[#17233a]"}`}
          >
            {item}
          </Link>
        ) : <span key={item} className="flex h-9 min-w-7 items-center justify-center text-[#8a95a5]">…</span>,
      )}
      <PageLink href={buildListHref(pathname, params, page + 1)} disabled={page >= pages} label={t.nextPage}>›</PageLink>
      <PageLink href={buildListHref(pathname, params, pages)} disabled={page >= pages} label={t.lastPage}>»</PageLink>
    </nav>
  );
}

function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  if (disabled) return <span aria-disabled="true" aria-label={label} className="flex h-9 min-w-9 cursor-not-allowed items-center justify-center rounded-lg border border-[#e2e7ed] bg-[#f5f7f9] text-sm text-[#a3acb9]">{children}</span>;
  return <Link href={href} aria-label={label} className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-[#d5dde7] bg-white text-sm font-semibold text-[#59667a] transition hover:border-[#9aabc0] hover:text-[#17233a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff] focus-visible:ring-offset-2">{children}</Link>;
}

export function ListQueryError({ locale, retryHref }: { locale: SalesLocale; retryHref: string }) {
  const t = salesMessages[locale];
  return (
    <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center" role="alert">
      <p className="font-semibold text-red-900">{t.loadError}</p>
      <a href={retryHref} className="mt-4 inline-flex rounded-lg bg-red-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-800 focus-visible:ring-offset-2">{t.retry}</a>
    </section>
  );
}

export function EmptyList({ locale }: { locale: SalesLocale }) {
  return (
    <section className="mt-4 rounded-2xl border border-dashed border-[#c5cfdb] bg-white px-6 py-14 text-center">
      <div className="mx-auto h-10 w-10 rounded-xl bg-[#e9eef4]" />
      <p className="mt-4 text-sm font-medium text-[#6c788a]">{salesMessages[locale].noData}</p>
    </section>
  );
}

export function ListLoadingSkeleton({ kind }: { kind: "jobs" | "companies" }) {
  const filters = kind === "jobs" ? 8 : 6;
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="h-3 w-28 rounded bg-[#dfe5ec]" />
      <div className="mt-3 h-9 w-48 rounded-lg bg-[#d9e0e8]" />
      <div className={`mt-7 grid gap-3 rounded-2xl border border-[#dce3eb] bg-white p-4 md:grid-cols-3 ${kind === "jobs" ? "xl:grid-cols-9" : "xl:grid-cols-7"}`}>
        {Array.from({ length: filters }, (_, index) => <div key={index} className={`h-10 rounded-lg bg-[#e7ebf0] ${index === 0 ? "xl:col-span-2" : ""}`} />)}
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-[#dce3eb] bg-white">
        <div className="h-12 bg-[#eef2f6]" />
        {Array.from({ length: 7 }, (_, index) => <div key={index} className="mx-4 grid grid-cols-5 gap-6 border-t border-[#edf0f4] py-4"><div className="h-4 rounded bg-[#e5eaf0]" /><div className="h-4 rounded bg-[#e5eaf0]" /><div className="h-4 rounded bg-[#e5eaf0]" /><div className="h-4 rounded bg-[#e5eaf0]" /><div className="h-4 rounded bg-[#e5eaf0]" /></div>)}
      </div>
    </div>
  );
}
