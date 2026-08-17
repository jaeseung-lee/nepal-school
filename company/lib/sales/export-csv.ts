import {
  contactReadinessLabels,
  formatEmploymentType,
  formatOrganizationType,
  formatStatusLabel,
  localizedLabel,
  researchStatusLabels,
  salesMessages,
  stageLabels,
  type SalesLocale,
} from "@/lib/sales/i18n";
import type { ExportContactCandidate, JobExportRow } from "@/lib/sales/list-queries";

export function safeCsvCell(value: unknown) {
  let text = value == null
    ? ""
    : String(value).replace(/\u0000/g, "").replace(/\r\n?|\n/g, "\r\n");
  if (typeof value === "string" && /^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function formatCandidateGroup(
  candidates: ExportContactCandidate[] | null | undefined,
  kinds: string[],
  locale: SalesLocale,
) {
  return (candidates ?? [])
    .filter((candidate) => kinds.includes(candidate.kind))
    .map((candidate) => {
      const value = candidate.kind === "official_address" || candidate.kind === "visit_address"
        ? formatCandidateAddress(candidate)
        : candidate.value;
      const department = [candidate.department, candidate.purpose, candidate.is_primary ? salesMessages[locale].primaryContact : null]
        .filter(Boolean)
        .join(" / ");
      return [formatStatusLabel(candidate.status, locale), value, department, candidate.source_url].join(" | ");
    })
    .join("\n");
}

export function buildExportRow(job: JobExportRow, locale: SalesLocale) {
  const t = salesMessages[locale];
  const verified = job.verified_candidates ?? [];
  const pending = job.pending_candidates ?? [];
  return [
    job.source_job_id,
    job.organization_name,
    formatOrganizationType(job.organization_type, locale),
    job.title,
    job.region,
    job.locality,
    formatEmploymentType(job.employment_type, locale),
    job.total_score,
    job.grade,
    formatStatusLabel(job.status, locale),
    job.date_posted,
    job.source_url,
    job.official_name,
    job.corporate_number,
    job.official_domain,
    job.official_address,
    job.official_address ? t.verified : "",
    job.official_address_source_url,
    formatCandidateGroup(verified, ["website"], locale),
    formatCandidateGroup(verified, ["email"], locale),
    formatCandidateGroup(verified, ["phone"], locale),
    formatCandidateGroup(verified, ["contact_form"], locale),
    formatCandidateGroup(pending, ["official_address"], locale),
    formatCandidateGroup(pending, ["email"], locale),
    formatCandidateGroup(pending, ["phone"], locale),
    formatCandidateGroup(pending, ["contact_form"], locale),
    job.street_address,
    job.postal_code,
    job.country_code,
    job.valid_through,
    formatSalary(job),
    job.japanese_level,
    yesNo(job.visa_support, locale),
    yesNo(job.foreigner_friendly, locale),
    yesNo(job.qualification_support, locale),
    yesNo(job.housing_support, locale),
    localizedLabel(contactReadinessLabels, job.contact_readiness, locale),
    localizedLabel(stageLabels, job.stage, locale),
    job.owner_display_name ?? job.owner_email,
    job.next_action_at,
    localizedLabel(researchStatusLabels, job.last_enrichment_status, locale),
    job.last_enriched_at,
  ];
}

export function getExtendedExportHeaders(locale: SalesLocale) {
  if (locale === "ja") {
    return [
      "正式法人名", "法人番号", "公式ドメイン", "公式法人住所", "公式住所の状態", "公式住所の出典",
      "確認済みウェブサイト", "確認済みメール", "確認済み電話", "確認済み問い合わせフォーム",
      "確認待ち公式住所", "確認待ちメール", "確認待ち電話", "確認待ち問い合わせフォーム",
      "勤務地詳細", "勤務地郵便番号", "勤務地国コード", "掲載終了日時", "給与", "日本語レベル",
      "ビザ支援", "外国人材", "研修支援", "住居支援", "連絡準備状況", "営業段階", "担当者",
      "次の対応", "最終調査結果", "最終調査日時",
    ];
  }
  return [
    "공식 법인명", "법인번호", "공식 도메인", "공식 회사 주소", "공식 주소 상태", "공식 주소 출처",
    "확인된 웹사이트", "확인된 이메일", "확인된 전화", "확인된 문의폼",
    "검토 대기 공식 주소", "검토 대기 이메일", "검토 대기 전화", "검토 대기 문의폼",
    "상세 근무지", "근무지 우편번호", "근무지 국가 코드", "공고 마감일", "급여", "일본어 수준",
    "비자 지원", "외국인 친화", "교육 지원", "주거 지원", "연락 준비 상태", "영업 단계", "담당자",
    "다음 행동", "최근 조사 결과", "최근 조사 일시",
  ];
}

export function getExportHeaders(locale: SalesLocale) {
  const t = salesMessages[locale];
  return [
    "YOLO Job ID",
    t.company,
    t.companyType,
    t.jobs,
    t.region,
    locale === "ja" ? "市区町村" : "시·구",
    t.employment,
    t.score,
    t.grade,
    t.status,
    t.posted,
    `${t.source} URL`,
    ...getExtendedExportHeaders(locale),
  ];
}

function formatCandidateAddress(candidate: ExportContactCandidate) {
  const address = [candidate.address_region, candidate.address_locality, candidate.address_street]
    .filter(Boolean)
    .join(" ") || candidate.value;
  return [candidate.address_postal_code ? `〒${candidate.address_postal_code}` : "", address]
    .filter(Boolean)
    .join(" ");
}

function formatSalary(job: JobExportRow) {
  if (job.salary_min == null && job.salary_max == null) return "";
  const amount = job.salary_min != null && job.salary_max != null
    ? `${job.salary_min}-${job.salary_max}`
    : String(job.salary_min ?? job.salary_max ?? "");
  return [job.salary_currency, amount, job.salary_unit].filter(Boolean).join(" ");
}

function yesNo(value: boolean, locale: SalesLocale) {
  if (locale === "ja") return value ? "はい" : "いいえ";
  return value ? "예" : "아니요";
}
