import { StatusBadge } from "@/components/sales/badges";
import { requireAdminProfile } from "@/lib/sales/auth";
import { formatSalesDate, getSalesLocale, salesMessages } from "@/lib/sales/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function SourceRunsPage() {
  await requireAdminProfile();
  const locale = await getSalesLocale();
  const t = salesMessages[locale];
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("source_runs").select("*").order("started_at", { ascending: false }).limit(100);
  const runs = (data ?? []) as Array<Record<string, unknown>>;

  return (
    <div>
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1d5cff]">Admin · Collector</p><h1 className="mt-2 text-3xl font-bold">{t.runs}</h1></div>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-[#dce3eb] bg-white">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-[#dce3eb] bg-[#f8fafc] text-xs text-[#667286]"><tr><th className="px-4 py-3">{t.startedAt}</th><th className="px-4 py-3">{t.status}</th><th className="px-4 py-3">{t.total}</th><th className="px-4 py-3">{t.new}</th><th className="px-4 py-3">{t.changed}</th><th className="px-4 py-3">{t.missing}</th><th className="px-4 py-3">{t.closed}</th><th className="px-4 py-3">Pages / Errors</th><th className="px-4 py-3">{t.errors}</th></tr></thead>
          <tbody className="divide-y divide-[#e8edf2]">{runs.map((run) => {
            const warnings = Array.isArray(run.warnings) ? run.warnings as unknown[] : [];
            return <tr key={String(run.id)} className="align-top"><td className="whitespace-nowrap px-4 py-4">{formatSalesDate(String(run.started_at), locale)}<p className="mt-1 font-mono text-[10px] text-[#8792a2]">{String(run.id).slice(0, 8)}</p></td><td className="px-4 py-4"><StatusBadge status={String(run.status)} /></td><td className="px-4 py-4 font-bold">{String(run.observed_count)}</td><td className="px-4 py-4">{String(run.new_count)}</td><td className="px-4 py-4">{String(run.changed_count)}</td><td className="px-4 py-4">{String(run.missing_count)}</td><td className="px-4 py-4">{String(run.closed_count)}</td><td className="px-4 py-4">{String(run.page_count)} / {String(run.error_count)}</td><td className="max-w-md px-4 py-4"><p className="text-xs font-semibold text-red-800">{String(run.error_message ?? "")}</p>{warnings.length ? <details className="mt-2"><summary className="cursor-pointer text-xs text-[#1d5cff]">Warnings ({warnings.length})</summary><pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg bg-[#17233a] p-3 text-[10px] text-white">{warnings.join("\n")}</pre></details> : null}</td></tr>;
          })}</tbody>
        </table>
        {!runs.length ? <p className="py-12 text-center text-sm text-[#7b8798]">{t.noData}</p> : null}
      </div>
    </div>
  );
}
