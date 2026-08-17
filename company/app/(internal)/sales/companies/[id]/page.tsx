import { notFound } from "next/navigation";
import { GradeBadge, StatusBadge } from "@/components/sales/badges";
import ScoreCriteria from "@/components/sales/score-criteria";
import {
  addActivityAction,
  addContactAction,
  reviewContactAction,
  updateLeadAction,
  updateOrganizationAction,
} from "@/app/(internal)/sales/actions";
import { requireInternalProfile } from "@/lib/sales/auth";
import {
  activityTypeLabels,
  addressTypeLabels,
  confidenceLabels,
  contactKindLabels,
  contactReadinessLabels,
  discoveryMethodLabels,
  formatEmploymentType,
  formatOrganizationType,
  formatSalesDate,
  localizedLabel,
  organizationTypeLabels,
  priorityLabels,
  SALES_STAGES,
  salesMessages,
  scoreReasonLabels,
  signalLabels,
  stageLabels,
  visitChecklistItems,
  type SalesLocale,
} from "@/lib/sales/i18n";
import { getSalesLocale } from "@/lib/sales/locale";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type DataRow = Record<string, unknown>;
type CompanyDetailProps = { params: Promise<{ id: string }> };

const OFFICIAL_INFO_KINDS = new Set(["official_name", "corporate_number", "official_address"]);
const COMMUNICATION_KINDS = new Set(["website", "phone", "email", "contact_form", "visit_address"]);

export default async function CompanyDetailPage({ params }: CompanyDetailProps) {
  const [{ id }, locale, profile] = await Promise.all([params, getSalesLocale(), requireInternalProfile()]);
  const t = salesMessages[locale];
  const supabase = await createServerSupabaseClient();
  const [orgResult, jobsResult, locationsResult, contactsResult, readinessResult, leadResult, profilesResult] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", id).maybeSingle(),
    supabase.from("jobs").select("*").eq("organization_id", id).order("date_posted", { ascending: false }),
    supabase.from("locations").select("*").eq("organization_id", id).order("region", { ascending: true }),
    supabase.from("contact_candidates").select("*").eq("organization_id", id).order("created_at", { ascending: false }),
    supabase.from("organization_contact_readiness").select("*").eq("organization_id", id).maybeSingle(),
    supabase.from("sales_leads").select("*").eq("organization_id", id).is("location_id", null).maybeSingle(),
    supabase.from("profiles").select("id,display_name,email").eq("active", true).order("display_name"),
  ]);
  if (!orgResult.data) notFound();

  const organization = orgResult.data as DataRow;
  const jobs = (jobsResult.data ?? []) as DataRow[];
  const locations = (locationsResult.data ?? []) as DataRow[];
  const contacts = (contactsResult.data ?? []) as DataRow[];
  const lead = leadResult.data as DataRow | null;
  const profiles = (profilesResult.data ?? []) as DataRow[];
  const activitiesResult = lead
    ? await supabase
        .from("sales_activities")
        .select("*,profiles(display_name,email)")
        .eq("sales_lead_id", lead.id)
        .order("occurred_at", { ascending: false })
        .limit(100)
    : { data: [] };
  const activities = (activitiesResult.data ?? []) as DataRow[];

  const companyName = String(organization.display_name);
  const officialCandidates = contacts.filter((candidate) => OFFICIAL_INFO_KINDS.has(String(candidate.kind)));
  const communicationCandidates = contacts.filter((candidate) => COMMUNICATION_KINDS.has(String(candidate.kind)));
  const readinessRow = readinessResult.data as DataRow | null;
  const verifiedOfficialAddress = contacts.find(
    (candidate) => candidate.kind === "official_address"
      && candidate.status === "verified"
      && candidate.id === readinessRow?.official_address_candidate_id,
  ) ?? contacts.find(
    (candidate) => candidate.kind === "official_address"
      && candidate.status === "verified"
      && candidate.source_url === readinessRow?.official_address_source_url,
  ) ?? contacts.find((candidate) => candidate.kind === "official_address" && candidate.status === "verified");
  const fallbackJobAddress = locations.map(formatJobLocationAddress).find(Boolean) ?? "";
  const officialAddress = verifiedOfficialAddress
    ? formatCandidateAddress(verifiedOfficialAddress)
    : stringOrEmpty(readinessRow?.official_address);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(officialAddress || fallbackJobAddress || companyName)}`;
  const activeJobs = jobs.filter((job) => job.status === "active");
  const jobSignals = activeJobs.slice(0, 3).map((job) => String(job.title)).join("、");
  const emailDrafts = buildEmailDrafts(companyName, jobSignals);
  const scoreReasons = Array.isArray(lead?.score_reasons)
    ? (lead.score_reasons as Array<{ key?: string; points?: number }>)
    : [];
  const readiness = stringOrEmpty(readinessRow?.contact_readiness) || deriveContactReadiness(contacts);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold tracking-[0.08em] text-[#1d5cff]">{t.companySignal}</p>
          <h1 className="mt-2 text-3xl font-bold">{companyName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#6f7b8c]">
            <span>{formatOrganizationType(String(organization.organization_type), locale)}</span>
            <span aria-hidden="true">·</span>
            <span>{activeJobs.length} {t.activeJobs}</span>
            <ReadinessBadge value={readiness} locale={locale} />
          </div>
        </div>
        {lead ? (
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-3 shadow-sm">
            <div><p className="text-xs text-[#7b8798]">{t.score}</p><p className="text-2xl font-bold">{String(lead.total_score)}</p></div>
            <GradeBadge grade={String(lead.grade)} />
          </div>
        ) : null}
      </div>

      <div className="mt-7 grid gap-6 2xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <Section title={t.officialCompanyInfo}>
            <dl className="grid gap-4 rounded-xl bg-[#f6f8fb] p-4 sm:grid-cols-2">
              <Definition label={t.officialName} value={stringOrEmpty(organization.official_name) || t.notRegistered} />
              <Definition label={t.corporateNumber} value={stringOrEmpty(organization.corporate_number) || t.notRegistered} mono />
              <Definition label={t.officialDomain} value={stringOrEmpty(organization.official_domain) || t.notRegistered} link />
              <Definition label={t.officialAddress} value={officialAddress || t.noOfficialAddress} />
            </dl>
            <CandidateList candidates={officialCandidates} organizationId={id} locale={locale} />
          </Section>

          <Section title={t.communicationMethods}>
            <CandidateList candidates={communicationCandidates} organizationId={id} locale={locale} />
          </Section>

          <Section title={t.jobLocations}>
            {locations.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {locations.map((location) => {
                  const relatedCount = jobs.filter((job) => job.location_id === location.id).length;
                  return (
                    <article key={String(location.id)} className="rounded-xl border border-[#dfe5ec] p-4">
                      <p className="font-semibold leading-6">{formatJobLocationAddress(location) || t.noData}</p>
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <Definition label={t.postalCode} value={stringOrEmpty(location.postal_code) || "—"} compact />
                        <Definition label={t.countryCode} value={stringOrEmpty(location.country_code) || "JP"} compact />
                        <Definition label={t.relatedJobs} value={String(relatedCount)} compact />
                        <Definition label={t.status} value={location.verified ? t.verified : t.pending} compact />
                      </dl>
                    </article>
                  );
                })}
              </div>
            ) : <EmptyText text={t.noData} />}
          </Section>

          <Section title={t.addCandidate}>
            <CandidateForm organizationId={id} locale={locale} />
          </Section>

          <Section title={t.relatedJobs}>
            {jobs.length ? (
              <div className="divide-y divide-[#e8edf2]">
                {jobs.map((job) => (
                  <div key={String(job.id)} className="grid gap-2 py-4 md:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-semibold">{String(job.title)}</p>
                      <p className="mt-1 text-xs text-[#7b8798]">
                        {formatSalesDate(job.date_posted ? String(job.date_posted) : null, locale)} · {formatEmploymentType(job.employment_type ? String(job.employment_type) : null, locale)} · {String(job.japanese_level ?? "—")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {job.visa_support ? <Signal text={localizedLabel(signalLabels, "visa", locale)} /> : null}
                        {job.foreigner_friendly ? <Signal text={localizedLabel(signalLabels, "foreign_staff", locale)} /> : null}
                        {job.qualification_support ? <Signal text={localizedLabel(signalLabels, "training", locale)} /> : null}
                        {job.housing_support ? <Signal text={localizedLabel(signalLabels, "housing", locale)} /> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={String(job.status)} locale={locale} />
                      <a href={String(job.source_url)} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#1d5cff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff]">{t.openSource} ↗</a>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyText text={t.noData} />}
          </Section>

          <Section title={t.emailDraft}>
            <div className="grid gap-4 xl:grid-cols-2"><Draft language={t.japaneseDraft} text={emailDrafts.ja} /><Draft language={t.koreanDraft} text={emailDrafts.ko} /></div>
            <p className="mt-3 text-xs leading-5 text-[#7b8798]">{t.draftNotice}</p>
          </Section>

          <Section title={t.activities}>
            {lead ? (
              <form action={addActivityAction} className="grid gap-3 rounded-xl bg-[#f6f8fb] p-4 md:grid-cols-[180px_1fr_auto]">
                <input type="hidden" name="leadId" value={String(lead.id)} />
                <input type="hidden" name="organizationId" value={id} />
                <select name="activityType" aria-label={t.activities} className="rounded-lg border border-[#d5dce5] bg-white px-3 py-2 text-sm">
                  {Object.entries(activityTypeLabels[locale]).filter(([value]) => value !== "stage_change").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input required name="notes" placeholder={t.notes} aria-label={t.notes} className="rounded-lg border border-[#d5dce5] px-3 py-2 text-sm" />
                <button className="rounded-lg bg-[#17233a] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff] focus-visible:ring-offset-2 active:scale-[0.98]">{t.addActivity}</button>
              </form>
            ) : null}
            <div className="mt-5 border-l-2 border-[#dce3eb] pl-5">
              {activities.map((activity) => (
                <div key={String(activity.id)} className="relative pb-6 before:absolute before:-left-[27px] before:top-1 before:h-3 before:w-3 before:rounded-full before:bg-[#1d5cff]">
                  <p className="text-xs font-bold text-[#1d5cff]">{localizedLabel(activityTypeLabels, String(activity.activity_type), locale)}</p>
                  <p className="mt-1 text-sm">{formatActivityNotes(String(activity.activity_type), String(activity.notes), locale)}</p>
                  <p className="mt-2 text-xs text-[#8792a2]">{formatSalesDate(String(activity.occurred_at), locale)}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <aside className="space-y-6">
          {profile.role === "admin" ? (
            <Section title={t.companyVerification}>
              <form action={updateOrganizationAction} className="space-y-3">
                <input type="hidden" name="organizationId" value={id} />
                <FormLabel label={t.type}><select name="organizationType" defaultValue={String(organization.organization_type)} className={inputClass}>{Object.entries(organizationTypeLabels[locale]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FormLabel>
                <FormLabel label={t.officialName}><input name="officialName" defaultValue={stringOrEmpty(organization.official_name)} className={inputClass} /></FormLabel>
                <FormLabel label={t.corporateNumber}><input name="corporateNumber" defaultValue={stringOrEmpty(organization.corporate_number)} inputMode="numeric" className={inputClass} /></FormLabel>
                <FormLabel label={t.officialDomain}><input type="url" name="officialDomain" defaultValue={stringOrEmpty(organization.official_domain)} className={inputClass} /></FormLabel>
                <button className="w-full rounded-lg bg-[#17233a] px-4 py-2.5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff] focus-visible:ring-offset-2 active:scale-[0.98]">{t.save}</button>
              </form>
            </Section>
          ) : null}

          {lead ? (
            <Section title={t.stage}>
              <form action={updateLeadAction} className="space-y-4">
                <input type="hidden" name="leadId" value={String(lead.id)} />
                <input type="hidden" name="organizationId" value={id} />
                <FormLabel label={t.stage}><select name="stage" defaultValue={String(lead.stage)} className={inputClass}>{SALES_STAGES.map((stage) => <option key={stage} value={stage}>{stageLabels[locale][stage]}</option>)}</select></FormLabel>
                <FormLabel label={t.owner}><select name="ownerId" defaultValue={String(lead.owner_id ?? "")} className={inputClass}><option value="">—</option>{profiles.map((person) => <option key={String(person.id)} value={String(person.id)}>{String(person.display_name ?? person.email)}</option>)}</select></FormLabel>
                <FormLabel label={t.priority}><select name="priority" defaultValue={String(lead.priority)} className={inputClass}>{Object.entries(priorityLabels[locale]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FormLabel>
                <FormLabel label={t.nextAction}><input type="datetime-local" name="nextActionAt" defaultValue={toDateTimeLocal(lead.next_action_at)} className={inputClass} /></FormLabel>
                <FormLabel label={t.notes}><textarea name="notes" defaultValue={String(lead.notes ?? "")} rows={5} className={inputClass} /></FormLabel>
                <button className="w-full rounded-lg bg-[#1d5cff] px-4 py-2.5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff] focus-visible:ring-offset-2 active:scale-[0.98]">{t.save}</button>
              </form>
            </Section>
          ) : null}

          {lead ? (
            <Section title={t.appliedScoreReasons}>
              <div className="mb-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#f3f6f9] p-3"><p className="text-xs text-[#7b8798]">{t.fit}</p><p className="mt-1 text-xl font-bold">{String(lead.fit_score)} / 70</p></div><div className="rounded-xl bg-[#f3f6f9] p-3"><p className="text-xs text-[#7b8798]">{t.demand}</p><p className="mt-1 text-xl font-bold">{String(lead.demand_score)} / 30</p></div></div>
              {scoreReasons.length ? <ul className="space-y-2 text-sm">{scoreReasons.map((reason, index) => <li key={`${reason.key}-${index}`} className="flex justify-between gap-3"><span>{localizedLabel(scoreReasonLabels, reason.key ?? "", locale)}</span><strong className="shrink-0">+{reason.points}</strong></li>)}</ul> : <p className="text-sm text-[#69768a]">{t.noScoreReasons}</p>}
            </Section>
          ) : null}
          <ScoreCriteria locale={locale} />
          <Section title={t.visitChecklist}><ul className="space-y-3 text-sm leading-6">{visitChecklistItems[locale].map((item) => <li key={item}>□ {item}</li>)}</ul><a href={mapUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff]">{t.map} ↗</a></Section>
        </aside>
      </div>
    </div>
  );
}

const inputClass = "mt-1.5 w-full rounded-lg border border-[#d5dce5] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff]";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#dce3eb] bg-white p-5 sm:p-6"><h2 className="text-lg font-bold">{title}</h2><div className="mt-4">{children}</div></section>;
}

function Definition({ label, value, mono = false, link = false, compact = false }: { label: string; value: string; mono?: boolean; link?: boolean; compact?: boolean }) {
  const content = link && /^https?:\/\//i.test(value) ? <a href={value} target="_blank" rel="noreferrer" className="break-all text-[#1d5cff] hover:underline">{value}</a> : value;
  return <div><dt className="text-xs text-[#7b8798]">{label}</dt><dd className={`${compact ? "mt-0.5" : "mt-1"} break-words font-semibold ${mono ? "font-mono" : ""}`}>{content}</dd></div>;
}

function CandidateList({ candidates, organizationId, locale }: { candidates: DataRow[]; organizationId: string; locale: SalesLocale }) {
  const t = salesMessages[locale];
  if (!candidates.length) return <EmptyText text={t.noData} />;
  return <div className="mt-4 grid gap-3">{candidates.map((candidate) => <CandidateCard key={String(candidate.id)} candidate={candidate} organizationId={organizationId} locale={locale} />)}</div>;
}

function CandidateCard({ candidate, organizationId, locale }: { candidate: DataRow; organizationId: string; locale: SalesLocale }) {
  const t = salesMessages[locale];
  const kind = String(candidate.kind);
  const sourceUrl = stringOrEmpty(candidate.source_url);
  const sourceHref = safeHttpUrl(sourceUrl);
  const address = kind === "official_address" || kind === "visit_address" ? formatCandidateAddress(candidate) : "";
  const detailItems = [
    candidate.department ? `${t.department}: ${String(candidate.department)}` : null,
    candidate.purpose ? `${t.purpose}: ${String(candidate.purpose)}` : null,
    candidate.is_primary ? t.primaryContact : null,
    candidate.discovery_method ? localizedLabel(discoveryMethodLabels, String(candidate.discovery_method), locale) : null,
    candidate.address_type ? localizedLabel(addressTypeLabels, String(candidate.address_type), locale) : null,
  ].filter(Boolean);
  return (
    <article className="rounded-xl border border-[#dfe5ec] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#788598]">{localizedLabel(contactKindLabels, kind, locale)} · {localizedLabel(confidenceLabels, String(candidate.confidence), locale)}</p>
          <p className="mt-1 break-all font-semibold">{address || String(candidate.value)}</p>
          {detailItems.length ? <p className="mt-2 text-xs leading-5 text-[#6f7b8c]">{detailItems.join(" · ")}</p> : null}
          {candidate.last_checked_at ? <p className="mt-1 text-xs text-[#8792a2]">{t.lastChecked}: {formatSalesDate(String(candidate.last_checked_at), locale)}</p> : null}
          {sourceHref ? <a href={sourceHref} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#1d5cff] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff]">{t.source} ↗</a> : <p className="mt-2 break-all text-xs text-[#8792a2]">{t.source}: {sourceUrl || "—"}</p>}
        </div>
        <StatusBadge status={String(candidate.status)} locale={locale} />
      </div>
      {candidate.status === "pending" ? <div className="mt-3 flex gap-2"><ContactReviewButton contactId={String(candidate.id)} organizationId={organizationId} status="verified" label={t.verify} /><ContactReviewButton contactId={String(candidate.id)} organizationId={organizationId} status="rejected" label={t.reject} /></div> : null}
    </article>
  );
}

function CandidateForm({ organizationId, locale }: { organizationId: string; locale: SalesLocale }) {
  const t = salesMessages[locale];
  return (
    <form action={addContactAction} className="grid gap-4 rounded-xl bg-[#f6f8fb] p-4 md:grid-cols-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      <FormLabel label={t.type}><select name="kind" className={inputClass}>{Object.entries(contactKindLabels[locale]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FormLabel>
      <FormLabel label={t.value}><input required name="value" className={inputClass} /></FormLabel>
      <FormLabel label={t.officialSource}><input required type="url" name="sourceUrl" className={inputClass} /></FormLabel>
      <FormLabel label={t.department}><input name="department" className={inputClass} /></FormLabel>
      <FormLabel label={t.purpose}><input name="purpose" className={inputClass} /></FormLabel>
      <FormLabel label={t.addressType}><select name="addressType" className={inputClass}><option value="">—</option>{Object.entries(addressTypeLabels[locale]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FormLabel>
      <FormLabel label={t.postalCode}><input name="postalCode" inputMode="numeric" className={inputClass} /></FormLabel>
      <FormLabel label={t.countryCode}><input name="countryCode" defaultValue="JP" className={inputClass} /></FormLabel>
      <FormLabel label={t.region}><input name="region" className={inputClass} /></FormLabel>
      <FormLabel label={locale === "ja" ? "市区町村" : "시·구"}><input name="locality" className={inputClass} /></FormLabel>
      <FormLabel label={t.officialAddress}><input name="streetAddress" className={inputClass} /></FormLabel>
      <FormLabel label={t.notes}><input name="notes" className={inputClass} /></FormLabel>
      <label className="flex items-center gap-2 text-sm font-semibold text-[#4f5d72]"><input type="checkbox" name="isPrimary" className="h-4 w-4 accent-[#1d5cff]" />{t.primaryContact}</label>
      <button className="rounded-lg bg-[#17233a] px-4 py-2.5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff] focus-visible:ring-offset-2 active:scale-[0.98] md:col-span-2">{t.save}</button>
    </form>
  );
}

function FormLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-[#6f7b8c]">{label}{children}</label>;
}

function ReadinessBadge({ value, locale }: { value: string; locale: SalesLocale }) {
  const colors = value === "ready" ? "bg-emerald-100 text-emerald-800" : value === "review_pending" ? "bg-amber-100 text-amber-800" : value === "partial" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors}`}>{localizedLabel(contactReadinessLabels, value, locale)}</span>;
}

function deriveContactReadiness(candidates: DataRow[]) {
  const verifiedKinds = new Set(candidates.filter((candidate) => candidate.status === "verified").map((candidate) => String(candidate.kind)));
  if (verifiedKinds.has("official_address") && ["email", "phone", "contact_form"].some((kind) => verifiedKinds.has(kind))) return "ready";
  if (candidates.some((candidate) => candidate.status === "pending")) return "review_pending";
  if (verifiedKinds.size > 0) return "partial";
  return "missing";
}

function formatCandidateAddress(candidate: DataRow) {
  const structured = [candidate.address_region, candidate.address_locality, candidate.address_street].filter(Boolean).map(String).join(" ");
  const postalCode = stringOrEmpty(candidate.address_postal_code);
  const value = structured || stringOrEmpty(candidate.value);
  return [postalCode ? `〒${postalCode}` : "", value].filter(Boolean).join(" ");
}

function formatJobLocationAddress(location: DataRow) {
  return [location.region, location.locality, location.street_address].filter(Boolean).map(String).join(" ");
}

function stringOrEmpty(value: unknown) { return value == null ? "" : String(value); }
function safeHttpUrl(value: string) { return /^https?:\/\/[^\s]+$/i.test(value) ? value : null; }
function EmptyText({ text }: { text: string }) { return <p className="py-5 text-center text-sm text-[#7b8798]">{text}</p>; }
function Signal({ text }: { text: string }) { return <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">{text}</span>; }
function Draft({ language, text }: { language: string; text: string }) { return <label className="block text-xs font-bold text-[#6f7b8c]">{language}<textarea readOnly value={text} rows={14} className="mt-2 w-full resize-y rounded-xl border border-[#d5dce5] bg-[#fafbfd] p-3 text-sm font-normal leading-6 text-[#27344b]" /></label>; }
function ContactReviewButton({ contactId, organizationId, status, label }: { contactId: string; organizationId: string; status: "verified" | "rejected"; label: string }) { return <form action={reviewContactAction}><input type="hidden" name="contactId" value={contactId} /><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="status" value={status} /><button className={`rounded-lg px-3 py-1.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff] active:scale-[0.98] ${status === "verified" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{label}</button></form>; }
function toDateTimeLocal(value: unknown) { if (!value) return ""; const date = new Date(String(value)); if (Number.isNaN(date.valueOf())) return ""; const offset = date.getTimezoneOffset() * 60_000; return new Date(date.valueOf() - offset).toISOString().slice(0, 16); }
function buildEmailDrafts(company: string, jobs: string) { return { ja: `${company}\n採用ご担当者様\n\n突然のご連絡失礼いたします。Jeongwoo Human Resource Development Instituteの［担当者名］と申します。\n\n公開求人（${jobs || "介護職"}）を拝見し、外国人介護人材の採用について情報交換の機会をいただけないかと思いご連絡しました。弊社は日本での就業を目指すネパール人材に、日本語・介護・就業準備を支援しています。\n\n現在の採用条件を伺った上で、在留資格、日本語力、入社時期に合う人材をご案内します。15分ほどオンラインまたは訪問でご説明可能でしょうか。\n\n不要の場合はその旨をご返信ください。以後のご連絡を停止します。\n\nJeongwoo Human Resource Development Institute\n［氏名・法人連絡先・住所］`, ko: `${company}\n채용 담당자님께\n\n안녕하세요. 정우인재개발원의 [담당자명]입니다.\n\n공개된 개호직 채용 수요를 확인하고, 네팔 개호 인재 채용 가능성에 관해 정보 교환을 제안드리고자 연락드립니다. 저희는 일본 취업을 준비하는 네팔 인재에게 일본어·개호·취업 준비를 지원합니다.\n\n귀사의 재류자격, 일본어 수준, 입사 시기 조건을 먼저 확인한 뒤 적합한 인재만 안내드리겠습니다. 15분 정도 온라인 또는 방문 설명 기회를 주실 수 있을까요?\n\n연락을 원하지 않으시면 회신 부탁드립니다. 이후 연락을 중단하겠습니다.\n\n정우인재개발원\n[이름·법인 연락처·주소]` }; }
function formatActivityNotes(type: string, notes: string, locale: SalesLocale) { if (type !== "stage_change") return notes; const [before, after] = notes.split(" → "); if (!before || !after) return notes; return `${stageLabels[locale][before] ?? before} → ${stageLabels[locale][after] ?? after}`; }
