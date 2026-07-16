import Link from "next/link";
import { GradeBadge, StatusBadge } from "@/components/sales/badges";
import { formatSalesDate, getSalesLocale, salesMessages, stageLabels } from "@/lib/sales/i18n";
import { relationOne } from "@/lib/sales/relations";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CompaniesPageProps = {
  searchParams: Promise<{ q?: string; stage?: string; grade?: string; contact?: string; owner?: string }>;
};

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const [locale, params] = await Promise.all([getSalesLocale(), searchParams]);
  const t = salesMessages[locale];
  const supabase = await createServerSupabaseClient();
  const [{ data: leadsData }, { data: profilesData }] = await Promise.all([
    supabase
      .from("sales_leads")
      .select("*,organizations(display_name,organization_type,official_domain,jobs(id,status,date_posted),contact_candidates(id,status,kind)),profiles!sales_leads_owner_id_fkey(display_name,email)")
      .order("total_score", { ascending: false }),
    supabase.from("profiles").select("id,display_name,email").eq("active", true).order("display_name"),
  ]);
  const leads = ((leadsData ?? []) as Array<Record<string, unknown>>).filter((lead) => {
    const org = relationOne(lead.organizations as Record<string, unknown> | Record<string, unknown>[] | null);
    const contacts = Array.isArray(org?.contact_candidates) ? (org.contact_candidates as Array<Record<string, unknown>>) : [];
    const owner = relationOne(lead.profiles as Record<string, unknown> | Record<string, unknown>[] | null);
    const q = params.q?.toLocaleLowerCase(locale);
    return (
      (!q || `${org?.display_name ?? ""} ${org?.official_domain ?? ""}`.toLocaleLowerCase(locale).includes(q)) &&
      (!params.stage || params.stage === "all" || lead.stage === params.stage) &&
      (!params.grade || params.grade === "all" || lead.grade === params.grade) &&
      (!params.owner || params.owner === "all" || lead.owner_id === params.owner) &&
      (!params.contact || params.contact === "all" ||
        (params.contact === "verified" && contacts.some((contact) => contact.status === "verified")) ||
        (params.contact === "pending" && contacts.some((contact) => contact.status === "pending")) ||
        (params.contact === "none" && contacts.length === 0))
    );
  });

  return (
    <div>
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1d5cff]">Account view</p><h1 className="mt-2 text-3xl font-bold">{t.companies}</h1></div>
      <form className="mt-6 grid gap-3 rounded-2xl border border-[#dce3eb] bg-white p-4 md:grid-cols-3 xl:grid-cols-6">
        <input name="q" defaultValue={params.q} placeholder={t.search} className="rounded-lg border border-[#d5dce5] px-3 py-2 text-sm xl:col-span-2" />
        <Select name="stage" value={params.stage} options={[["all", `${t.stage}: ${t.all}`], ...Object.entries(stageLabels[locale])]} />
        <Select name="grade" value={params.grade} options={[["all", `${t.grade}: ${t.all}`], ["A", "A"], ["B", "B"], ["C", "C"]]} />
        <Select name="contact" value={params.contact} options={[["all", `${t.contacts}: ${t.all}`], ["verified", t.verified], ["pending", t.pending], ["none", locale === "ja" ? "未登録" : "미등록"]]} />
        <button className="rounded-lg bg-[#17233a] px-4 py-2 text-sm font-semibold text-white">{t.filter}</button>
      </form>
      <p className="mt-4 text-sm text-[#6f7b8c]">{leads.length} {t.company}</p>
      <div className="mt-3 grid gap-4 xl:grid-cols-2">
        {leads.map((lead) => {
          const org = relationOne(lead.organizations as Record<string, unknown> | Record<string, unknown>[] | null);
          const owner = relationOne(lead.profiles as Record<string, unknown> | Record<string, unknown>[] | null);
          const jobs = Array.isArray(org?.jobs) ? (org.jobs as Array<Record<string, unknown>>) : [];
          const contacts = Array.isArray(org?.contact_candidates) ? (org.contact_candidates as Array<Record<string, unknown>>) : [];
          const activeJobs = jobs.filter((job) => job.status === "active");
          const contactStatus = contacts.some((contact) => contact.status === "verified") ? "verified" : contacts.some((contact) => contact.status === "pending") ? "pending" : "none";
          return (
            <Link key={String(lead.id)} href={`/sales/companies/${lead.organization_id}`} className="rounded-2xl border border-[#dce3eb] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#aebdd0] hover:shadow-lg hover:shadow-[#17233a]/5">
              <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="truncate text-lg font-bold">{String(org?.display_name ?? "—")}</p><p className="mt-1 text-xs text-[#7a8698]">{String(org?.organization_type ?? "unknown")} · {activeJobs.length} active jobs</p></div><div className="flex items-center gap-2"><span className="text-xl font-bold">{String(lead.total_score)}</span><GradeBadge grade={String(lead.grade)} /></div></div>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[#e8edf2] pt-4 text-xs"><div><p className="text-[#8792a2]">{t.stage}</p><p className="mt-1 font-semibold">{stageLabels[locale][String(lead.stage)]}</p></div><div><p className="text-[#8792a2]">{t.owner}</p><p className="mt-1 truncate font-semibold">{String(owner?.display_name ?? owner?.email ?? "—")}</p></div><div><p className="text-[#8792a2]">{t.contacts}</p><div className="mt-1"><StatusBadge status={contactStatus} label={contactStatus === "none" ? "—" : t[contactStatus as "verified" | "pending"]} /></div></div></div>
              <p className="mt-4 text-xs text-[#7a8698]">{t.nextAction}: {formatSalesDate(lead.next_action_at ? String(lead.next_action_at) : null, locale)}</p>
            </Link>
          );
        })}
      </div>
      {!leads.length ? <p className="mt-8 rounded-2xl bg-white py-12 text-center text-sm text-[#7b8798]">{t.noData}</p> : null}
      <datalist id="sales-owners">{(profilesData ?? []).map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name ?? profile.email}</option>)}</datalist>
    </div>
  );
}

function Select({ name, value, options }: { name: string; value?: string; options: Array<[string, string]> }) {
  return <select name={name} defaultValue={value ?? "all"} className="rounded-lg border border-[#d5dce5] bg-white px-3 py-2 text-sm">{options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>;
}
