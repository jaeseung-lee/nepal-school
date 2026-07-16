import { notFound } from "next/navigation";
import { GradeBadge, StatusBadge } from "@/components/sales/badges";
import { addActivityAction, addContactAction, reviewContactAction, updateLeadAction, updateOrganizationAction } from "@/app/sales/actions";
import { requireInternalProfile } from "@/lib/sales/auth";
import { formatSalesDate, getSalesLocale, SALES_STAGES, salesMessages, stageLabels } from "@/lib/sales/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CompanyDetailProps = { params: Promise<{ id: string }> };

export default async function CompanyDetailPage({ params }: CompanyDetailProps) {
  const [{ id }, locale, profile] = await Promise.all([params, getSalesLocale(), requireInternalProfile()]);
  const t = salesMessages[locale];
  const supabase = await createServerSupabaseClient();
  const [orgResult, jobsResult, locationsResult, contactsResult, leadResult, profilesResult] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", id).maybeSingle(),
    supabase.from("jobs").select("*").eq("organization_id", id).order("date_posted", { ascending: false }),
    supabase.from("locations").select("*").eq("organization_id", id),
    supabase.from("contact_candidates").select("*").eq("organization_id", id).order("created_at", { ascending: false }),
    supabase.from("sales_leads").select("*").eq("organization_id", id).is("location_id", null).maybeSingle(),
    supabase.from("profiles").select("id,display_name,email").eq("active", true).order("display_name"),
  ]);
  if (!orgResult.data) notFound();
  const organization = orgResult.data as Record<string, unknown>;
  const jobs = (jobsResult.data ?? []) as Array<Record<string, unknown>>;
  const locations = (locationsResult.data ?? []) as Array<Record<string, unknown>>;
  const contacts = (contactsResult.data ?? []) as Array<Record<string, unknown>>;
  const lead = leadResult.data as Record<string, unknown> | null;
  const profiles = (profilesResult.data ?? []) as Array<Record<string, unknown>>;
  const activitiesResult = lead
    ? await supabase.from("sales_activities").select("*,profiles(display_name,email)").eq("sales_lead_id", lead.id).order("occurred_at", { ascending: false }).limit(100)
    : { data: [] };
  const activities = (activitiesResult.data ?? []) as Array<Record<string, unknown>>;
  const companyName = String(organization.display_name);
  const address = locations.map((item) => [item.region, item.locality, item.street_address].filter(Boolean).join(" ")).find(Boolean) ?? "";
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || companyName)}`;
  const activeJobs = jobs.filter((job) => job.status === "active");
  const jobSignals = activeJobs.slice(0, 3).map((job) => String(job.title)).join("、");
  const emailDrafts = buildEmailDrafts(companyName, jobSignals);
  const scoreReasons = Array.isArray(lead?.score_reasons) ? (lead.score_reasons as Array<{ key?: string; points?: number }>) : [];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1d5cff]">Company signal</p><h1 className="mt-2 text-3xl font-bold">{companyName}</h1><p className="mt-2 text-sm text-[#6f7b8c]">{String(organization.organization_type)} · {activeJobs.length} active jobs</p></div>
        {lead ? <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-3 shadow-sm"><div><p className="text-xs text-[#7b8798]">{t.score}</p><p className="text-2xl font-bold">{String(lead.total_score)}</p></div><GradeBadge grade={String(lead.grade)} /></div> : null}
      </div>

      <div className="mt-7 grid gap-6 2xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <Section title={t.relatedJobs}>
            <div className="divide-y divide-[#e8edf2]">{jobs.map((job) => <div key={String(job.id)} className="grid gap-2 py-4 md:grid-cols-[1fr_auto]"><div><p className="font-semibold">{String(job.title)}</p><p className="mt-1 text-xs text-[#7b8798]">{formatSalesDate(job.date_posted ? String(job.date_posted) : null, locale)} · {String(job.employment_type ?? "—")} · {String(job.japanese_level ?? "—")}</p><div className="mt-2 flex flex-wrap gap-1.5">{job.visa_support ? <Signal text="Visa" /> : null}{job.foreigner_friendly ? <Signal text="Foreign staff" /> : null}{job.qualification_support ? <Signal text="Training" /> : null}{job.housing_support ? <Signal text="Housing" /> : null}</div></div><div className="flex items-center gap-3"><StatusBadge status={String(job.status)} /><a href={String(job.source_url)} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#1d5cff]">{t.openSource} ↗</a></div></div>)}</div>
          </Section>

          <Section title={t.contacts}>
            <div className="space-y-3">{contacts.map((contact) => <div key={String(contact.id)} className="rounded-xl border border-[#dfe5ec] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-[#788598]">{String(contact.kind)} · {String(contact.confidence)}</p><p className="mt-1 break-all font-semibold">{String(contact.value)}</p><a href={String(contact.source_url)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-[#1d5cff]">{t.source} ↗</a></div><StatusBadge status={String(contact.status)} label={t[String(contact.status) as "pending" | "verified" | "rejected"] ?? String(contact.status)} /></div>{contact.status === "pending" ? <div className="mt-3 flex gap-2"><ContactReviewButton contactId={String(contact.id)} organizationId={id} status="verified" label={t.verify} /><ContactReviewButton contactId={String(contact.id)} organizationId={id} status="rejected" label={t.reject} /></div> : null}</div>)}</div>
            {!contacts.length ? <p className="py-5 text-center text-sm text-[#7b8798]">{t.noData}</p> : null}
            <form action={addContactAction} className="mt-5 grid gap-3 rounded-xl bg-[#f6f8fb] p-4 md:grid-cols-2">
              <input type="hidden" name="organizationId" value={id} /><select name="kind" className="rounded-lg border border-[#d5dce5] bg-white px-3 py-2 text-sm"><option value="website">website</option><option value="phone">phone</option><option value="email">email</option><option value="contact_form">contact_form</option><option value="visit_address">visit_address</option></select><input required name="value" placeholder="Value" className="rounded-lg border border-[#d5dce5] px-3 py-2 text-sm" /><input required type="url" name="sourceUrl" placeholder="https:// official source" className="rounded-lg border border-[#d5dce5] px-3 py-2 text-sm" /><input name="notes" placeholder={t.notes} className="rounded-lg border border-[#d5dce5] px-3 py-2 text-sm" /><button className="rounded-lg bg-[#17233a] px-4 py-2 text-sm font-semibold text-white md:col-span-2">{t.save}</button>
            </form>
          </Section>

          <Section title={t.emailDraft}>
            <div className="grid gap-4 xl:grid-cols-2"><Draft language="日本語" text={emailDrafts.ja} /><Draft language="한국어" text={emailDrafts.ko} /></div>
            <p className="mt-3 text-xs leading-5 text-[#7b8798]">下書き管理のみです。自動送信はしません。送信前に法人連絡先、送信者表示、受信拒否方法を確認してください。</p>
          </Section>

          <Section title={t.activities}>
            {lead ? <form action={addActivityAction} className="grid gap-3 rounded-xl bg-[#f6f8fb] p-4 md:grid-cols-[180px_1fr_auto]"><input type="hidden" name="leadId" value={String(lead.id)} /><input type="hidden" name="organizationId" value={id} /><select name="activityType" className="rounded-lg border border-[#d5dce5] bg-white px-3 py-2 text-sm"><option value="note">note</option><option value="email">email</option><option value="phone">phone</option><option value="visit">visit</option><option value="meeting">meeting</option><option value="follow_up">follow_up</option></select><input required name="notes" placeholder={t.notes} className="rounded-lg border border-[#d5dce5] px-3 py-2 text-sm" /><button className="rounded-lg bg-[#17233a] px-4 py-2 text-sm font-semibold text-white">{t.addActivity}</button></form> : null}
            <div className="mt-5 border-l-2 border-[#dce3eb] pl-5">{activities.map((activity) => <div key={String(activity.id)} className="relative pb-6 before:absolute before:-left-[27px] before:top-1 before:h-3 before:w-3 before:rounded-full before:bg-[#1d5cff]"><p className="text-xs font-bold uppercase text-[#1d5cff]">{String(activity.activity_type)}</p><p className="mt-1 text-sm">{String(activity.notes)}</p><p className="mt-2 text-xs text-[#8792a2]">{formatSalesDate(String(activity.occurred_at), locale)}</p></div>)}</div>
          </Section>
        </div>

        <aside className="space-y-6">
          {profile.role === "admin" ? <Section title={locale === "ja" ? "法人確認" : "기업 확인"}><form action={updateOrganizationAction} className="space-y-3"><input type="hidden" name="organizationId" value={id} /><label className="block text-xs font-semibold text-[#6f7b8c]">Type<select name="organizationType" defaultValue={String(organization.organization_type)} className="mt-1.5 w-full rounded-lg border border-[#d5dce5] bg-white px-3 py-2 text-sm"><option value="direct_employer">direct_employer</option><option value="agency">agency</option><option value="unknown">unknown</option></select></label><label className="block text-xs font-semibold text-[#6f7b8c]">Official name<input name="officialName" defaultValue={String(organization.official_name ?? "")} className="mt-1.5 w-full rounded-lg border border-[#d5dce5] px-3 py-2 text-sm" /></label><label className="block text-xs font-semibold text-[#6f7b8c]">Official domain<input type="url" name="officialDomain" defaultValue={String(organization.official_domain ?? "")} className="mt-1.5 w-full rounded-lg border border-[#d5dce5] px-3 py-2 text-sm" /></label><button className="w-full rounded-lg bg-[#17233a] px-4 py-2.5 text-sm font-bold text-white">{t.save}</button></form></Section> : null}
          {lead ? <Section title={t.stage}>
            <form action={updateLeadAction} className="space-y-4"><input type="hidden" name="leadId" value={String(lead.id)} /><input type="hidden" name="organizationId" value={id} /><label className="block text-xs font-semibold text-[#6f7b8c]">{t.stage}<select name="stage" defaultValue={String(lead.stage)} className="mt-1.5 w-full rounded-lg border border-[#d5dce5] bg-white px-3 py-2 text-sm">{SALES_STAGES.map((stage) => <option key={stage} value={stage}>{stageLabels[locale][stage]}</option>)}</select></label><label className="block text-xs font-semibold text-[#6f7b8c]">{t.owner}<select name="ownerId" defaultValue={String(lead.owner_id ?? "")} className="mt-1.5 w-full rounded-lg border border-[#d5dce5] bg-white px-3 py-2 text-sm"><option value="">—</option>{profiles.map((profile) => <option key={String(profile.id)} value={String(profile.id)}>{String(profile.display_name ?? profile.email)}</option>)}</select></label><label className="block text-xs font-semibold text-[#6f7b8c]">{t.priority}<select name="priority" defaultValue={String(lead.priority)} className="mt-1.5 w-full rounded-lg border border-[#d5dce5] bg-white px-3 py-2 text-sm"><option value="high">high</option><option value="normal">normal</option><option value="low">low</option></select></label><label className="block text-xs font-semibold text-[#6f7b8c]">{t.nextAction}<input type="datetime-local" name="nextActionAt" defaultValue={toDateTimeLocal(lead.next_action_at)} className="mt-1.5 w-full rounded-lg border border-[#d5dce5] px-3 py-2 text-sm" /></label><label className="block text-xs font-semibold text-[#6f7b8c]">{t.notes}<textarea name="notes" defaultValue={String(lead.notes ?? "")} rows={5} className="mt-1.5 w-full rounded-lg border border-[#d5dce5] px-3 py-2 text-sm" /></label><button className="w-full rounded-lg bg-[#1d5cff] px-4 py-2.5 text-sm font-bold text-white">{t.save}</button></form>
          </Section> : null}
          <Section title={t.scoreReasons}><div className="mb-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#f3f6f9] p-3"><p className="text-xs text-[#7b8798]">{t.fit}</p><p className="mt-1 text-xl font-bold">{String(lead?.fit_score ?? 0)} / 70</p></div><div className="rounded-xl bg-[#f3f6f9] p-3"><p className="text-xs text-[#7b8798]">{t.demand}</p><p className="mt-1 text-xl font-bold">{String(lead?.demand_score ?? 0)} / 30</p></div></div><ul className="space-y-2 text-sm">{scoreReasons.map((reason, index) => <li key={`${reason.key}-${index}`} className="flex justify-between"><span>{reasonLabel(reason.key ?? "", locale)}</span><strong>+{reason.points}</strong></li>)}</ul></Section>
          <Section title={t.visitChecklist}><ul className="space-y-3 text-sm leading-6"><li>□ 公式法人名と施設名を照合</li><li>□ 受付時間・採用担当部署を確認</li><li>□ YOLO求人は需要シグナルとしてのみ言及</li><li>□ ネパール人材の在留資格・日本語力を具体化</li><li>□ 次回連絡日と受信拒否の希望を記録</li></ul><a href={mapUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm font-semibold">{t.map} ↗</a></Section>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-[#dce3eb] bg-white p-5 sm:p-6"><h2 className="text-lg font-bold">{title}</h2><div className="mt-4">{children}</div></section>; }
function Signal({ text }: { text: string }) { return <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">{text}</span>; }
function Draft({ language, text }: { language: string; text: string }) { return <label className="block text-xs font-bold text-[#6f7b8c]">{language}<textarea readOnly value={text} rows={14} className="mt-2 w-full resize-y rounded-xl border border-[#d5dce5] bg-[#fafbfd] p-3 text-sm font-normal leading-6 text-[#27344b]" /></label>; }
function ContactReviewButton({ contactId, organizationId, status, label }: { contactId: string; organizationId: string; status: "verified" | "rejected"; label: string }) { return <form action={reviewContactAction}><input type="hidden" name="contactId" value={contactId} /><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="status" value={status} /><button className={`rounded-lg px-3 py-1.5 text-xs font-bold ${status === "verified" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{label}</button></form>; }
function toDateTimeLocal(value: unknown) { if (!value) return ""; const date = new Date(String(value)); if (Number.isNaN(date.valueOf())) return ""; const offset = date.getTimezoneOffset() * 60_000; return new Date(date.valueOf() - offset).toISOString().slice(0, 16); }
function buildEmailDrafts(company: string, jobs: string) { return { ja: `${company}\n採用ご担当者様\n\n突然のご連絡失礼いたします。中宇HRDの［担当者名］と申します。\n\n公開求人（${jobs || "介護職"}）を拝見し、外国人介護人材の採用について情報交換の機会をいただけないかと思いご連絡しました。弊社は日本での就業を目指すネパール人材に、日本語・介護・就業準備を支援しています。\n\n現在の採用条件を伺った上で、在留資格、日本語力、入社時期に合う人材をご案内します。15分ほどオンラインまたは訪問でご説明可能でしょうか。\n\n不要の場合はその旨をご返信ください。以後のご連絡を停止します。\n\n中宇HRD\n［氏名・法人連絡先・住所］`, ko: `${company}\n채용 담당자님께\n\n안녕하세요. 중우HRD의 [담당자명]입니다.\n\n공개된 개호직 채용 수요를 확인하고, 네팔 개호 인재 채용 가능성에 관해 정보 교환을 제안드리고자 연락드립니다. 저희는 일본 취업을 준비하는 네팔 인재에게 일본어·개호·취업 준비를 지원합니다.\n\n귀사의 재류자격, 일본어 수준, 입사 시기 조건을 먼저 확인한 뒤 적합한 인재만 안내드리겠습니다. 15분 정도 온라인 또는 방문 설명 기회를 주실 수 있을까요?\n\n연락을 원하지 않으시면 회신 부탁드립니다. 이후 연락을 중단하겠습니다.\n\n중우HRD\n[이름·법인 연락처·주소]` }; }
function reasonLabel(key: string, locale: "ja" | "ko") { const labels: Record<string, [string, string]> = { direct_employer: ["直接雇用", "직접고용"], stable_employment: ["正規・契約雇用", "정규·계약직"], visa_support: ["ビザ・特定技能支援", "비자·특정기능 지원"], foreigner_experience: ["外国人採用シグナル", "외국인 채용 신호"], n3_n4: ["N3/N4", "N3/N4"], qualification_support: ["資格・研修支援", "자격·교육 지원"], housing_support: ["住居支援", "주거 지원"], recent_post: ["30日以内の求人", "최근 30일 공고"], three_active_jobs: ["有効求人3件以上", "활성 공고 3건 이상"], long_validity: ["有効期間30日以上", "유효기간 30일 이상"], weekly_change: ["今週の変更・再掲載", "이번 주 변경·재등장"] }; return labels[key]?.[locale === "ja" ? 0 : 1] ?? key; }
