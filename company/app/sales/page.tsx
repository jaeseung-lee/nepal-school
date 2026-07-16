import Link from "next/link";
import { GradeBadge, StatusBadge } from "@/components/sales/badges";
import { getSalesLocale, formatSalesDate, salesMessages, stageLabels } from "@/lib/sales/i18n";
import { relationOne } from "@/lib/sales/relations";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function SalesDashboardPage() {
  const locale = await getSalesLocale();
  const t = salesMessages[locale];
  const supabase = await createServerSupabaseClient();
  const today = new Date();
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  const [runResult, topResult, unreviewedResult, followUpResult] = await Promise.all([
    supabase.from("source_runs").select("*").order("started_at", { ascending: false }).limit(1).maybeSingle(),
    supabase
      .from("sales_leads")
      .select("id,organization_id,total_score,grade,stage,next_action_at,organizations(display_name,organization_type)")
      .eq("grade", "A")
      .order("total_score", { ascending: false })
      .limit(10),
    supabase
      .from("sales_leads")
      .select("id,organization_id,total_score,grade,organizations(display_name)")
      .eq("stage", "unreviewed")
      .order("total_score", { ascending: false })
      .limit(8),
    supabase
      .from("sales_leads")
      .select("id,organization_id,total_score,grade,stage,next_action_at,organizations(display_name)")
      .lte("next_action_at", endOfToday.toISOString())
      .not("next_action_at", "is", null)
      .order("next_action_at", { ascending: true })
      .limit(8),
  ]);
  const run = runResult.data as Record<string, unknown> | null;
  const top = (topResult.data ?? []) as Array<Record<string, unknown>>;
  const unreviewed = (unreviewedResult.data ?? []) as Array<Record<string, unknown>>;
  const followUps = (followUpResult.data ?? []) as Array<Record<string, unknown>>;
  const metrics = [
    [t.total, Number(run?.observed_count ?? 0)],
    [t.new, Number(run?.new_count ?? 0)],
    [t.changed, Number(run?.changed_count ?? 0)],
    [t.missing, Number(run?.missing_count ?? 0)],
    [t.closed, Number(run?.closed_count ?? 0)],
    [t.pendingContacts, Number(run?.contact_pending_count ?? 0)],
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1d5cff]">YOLO JAPAN · CARE / 介護</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">{t.dashboard}</h1>
        </div>
        {run ? (
          <div className="text-right text-xs text-[#6f7b8c]">
            <StatusBadge status={String(run.status)} />
            <p className="mt-2">{t.latestRun}: {formatSalesDate(String(run.started_at), locale)}</p>
          </div>
        ) : null}
      </div>

      {run?.status === "failed" ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900">
          <strong>収集失敗 / 수집 실패:</strong> {String(run.error_message ?? "unknown")}
        </div>
      ) : null}

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-[#dce3eb] bg-white p-5">
            <p className="text-xs font-semibold text-[#758194]">{label}</p>
            <p className="mt-3 text-3xl font-bold tracking-[-0.03em]">{value}</p>
          </div>
        ))}
      </section>

      {!run ? (
        <section className="mt-6 rounded-2xl border border-dashed border-[#b9c5d3] bg-white p-8 text-center">
          <p className="font-semibold">{t.noData}</p>
          <p className="mt-2 text-sm text-[#6f7b8c]">{t.runRequired}</p>
          <code className="mt-4 inline-block rounded-lg bg-[#17233a] px-3 py-2 text-xs text-white">npm run sales:sync</code>
        </section>
      ) : null}

      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <LeadList title={t.topLeads} rows={top} locale={locale} />
        <LeadList title={t.todayFollowUps} rows={followUps} locale={locale} />
        <LeadList title={t.unreviewedCompanies} rows={unreviewed} locale={locale} />
        <section className="rounded-2xl border border-[#dce3eb] bg-[#17233a] p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#89a9ff]">Operating rule</p>
          <h2 className="mt-3 text-xl font-bold">{t.sourceNotice}</h2>
          <p className="mt-3 text-sm leading-6 text-white/65">
            海外在住者の直接応募可否を保証しません。公式連絡先は出典を確認してから使用し、個人メールや推測した採用企業は登録しません。
          </p>
          <Link href="/sales/jobs" className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#17233a]">{t.jobs} →</Link>
        </section>
      </div>
    </div>
  );
}

function LeadList({ title, rows, locale }: { title: string; rows: Array<Record<string, unknown>>; locale: "ja" | "ko" }) {
  const t = salesMessages[locale];
  return (
    <section className="rounded-2xl border border-[#dce3eb] bg-white p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-4 divide-y divide-[#e7ebf0]">
        {rows.length ? rows.map((row) => {
          const organization = relationOne(row.organizations as { display_name?: string } | { display_name?: string }[] | null);
          return (
            <Link key={String(row.id)} href={`/sales/companies/${row.organization_id}`} className="flex items-center justify-between gap-4 py-3.5 hover:text-[#1d5cff]">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{organization?.display_name ?? "—"}</p>
                <p className="mt-1 text-xs text-[#7b8798]">
                  {row.stage ? stageLabels[locale][String(row.stage)] : t.nextAction}
                  {row.next_action_at ? ` · ${formatSalesDate(String(row.next_action_at), locale)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2"><span className="text-sm font-bold">{String(row.total_score ?? 0)}</span><GradeBadge grade={String(row.grade ?? "C")} /></div>
            </Link>
          );
        }) : <p className="py-8 text-center text-sm text-[#7b8798]">{t.noData}</p>}
      </div>
    </section>
  );
}
