import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExportRow,
  formatCandidateGroup,
  getExportHeaders,
  safeCsvCell,
} from "@/lib/sales/export-csv";
import type { ExportContactCandidate, JobExportRow } from "@/lib/sales/list-queries";

const verifiedEmail: ExportContactCandidate = {
  id: "candidate-1",
  kind: "email",
  value: "recruit@example.jp",
  normalized_value: "recruit@example.jp",
  status: "verified",
  source_url: "https://example.jp/company",
  confidence: "high",
  department: "採用部",
  purpose: "採用問い合わせ",
  is_primary: true,
  address_postal_code: null,
  address_country_code: null,
  address_region: null,
  address_locality: null,
  address_street: null,
  address_type: null,
  last_checked_at: "2026-07-21T00:00:00.000Z",
};

const pendingAddress: ExportContactCandidate = {
  ...verifiedEmail,
  id: "candidate-2",
  kind: "official_address",
  value: "東京都新宿区西新宿1-1-1",
  normalized_value: "東京都新宿区西新宿1-1-1",
  status: "pending",
  source_url: "https://example.jp/about",
  department: null,
  purpose: null,
  is_primary: false,
  address_postal_code: "160-0023",
  address_country_code: "JP",
  address_region: "東京都",
  address_locality: "新宿区",
  address_street: "西新宿1-1-1",
  address_type: "head_office",
};

test("CSV cells quote commas, quotes, and newlines while guarding spreadsheet formulas", () => {
  assert.equal(safeCsvCell('a,"b"\nnext'), '"a,""b""\r\nnext"');
  assert.equal(safeCsvCell("=HYPERLINK(\"https://bad.example\")"), '"\'=HYPERLINK(""https://bad.example"")"');
  assert.equal(safeCsvCell(" \t@SUM(1,1)"), '"\' \t@SUM(1,1)"');
  assert.equal(safeCsvCell("\n+1"), '"\'\r\n+1"');
  assert.equal(safeCsvCell(-1), '"-1"');
});

test("candidate aggregation keeps verified and pending values separate and uses one line per value", () => {
  const secondEmail = { ...verifiedEmail, id: "candidate-3", value: "info@example.jp", department: null, purpose: null, is_primary: false };
  const emails = formatCandidateGroup([verifiedEmail, secondEmail], ["email"], "ko");
  assert.match(emails, /^확인 \| recruit@example\.jp \| 採用部 \/ 採用問い合わせ \/ 대표 연락처 \| https:\/\/example\.jp\/company/);
  assert.match(emails, /\n확인 \| info@example\.jp \|  \| https:\/\/example\.jp\/company$/);

  const address = formatCandidateGroup([pendingAddress], ["official_address"], "ko");
  assert.equal(address, "검토 대기 | 〒160-0023 東京都 新宿区 西新宿1-1-1 |  | https://example.jp/about");
});

test("comprehensive export preserves the original 12 columns and emits one 42-column job row", () => {
  const headers = getExportHeaders("ko");
  assert.deepEqual(headers.slice(0, 12), [
    "YOLO Job ID", "기업", "기업 유형", "공고", "지역", "시·구", "고용 형태", "점수", "등급", "상태", "공고일", "출처 URL",
  ]);
  assert.equal(headers.length, 42);

  const row = buildExportRow(jobFixture(), "ko");
  assert.equal(row.length, headers.length);
  assert.deepEqual(row.slice(0, 12), [
    "YOLO-1", "표시 기업", "직접고용 기업", "개호직", "東京都", "新宿区", "풀타임", 78, "A", "활성", "2026-07-20", "https://example.jp/jobs/1",
  ]);
  assert.match(String(row[19]), /recruit@example\.jp/);
  assert.match(String(row[22]), /〒160-0023/);
  assert.equal(row[36], "연락 준비 완료");
  assert.equal(row[40], "발견");
});

function jobFixture(): JobExportRow {
  return {
    id: "job-1",
    source_job_id: "YOLO-1",
    organization_id: "org-1",
    location_id: "location-1",
    title: "개호직",
    source_url: "https://example.jp/jobs/1",
    date_posted: "2026-07-20",
    valid_through: "2026-08-20T00:00:00.000Z",
    employment_type: "FULL_TIME",
    status: "active",
    first_seen_at: "2026-07-20T00:00:00.000Z",
    organization_name: "표시 기업",
    official_name: "株式会社テスト",
    organization_type: "direct_employer",
    corporate_number: "1234567890123",
    official_domain: "https://example.jp/",
    region: "東京都",
    locality: "新宿区",
    street_address: "西新宿1-1-1",
    postal_code: "160-0023",
    country_code: "JP",
    salary_min: 220000,
    salary_max: 280000,
    salary_unit: "MONTH",
    salary_currency: "JPY",
    japanese_level: "N3",
    visa_support: true,
    foreigner_friendly: true,
    qualification_support: false,
    housing_support: true,
    total_score: 78,
    grade: "A",
    stage: "researching",
    owner_id: "owner-1",
    owner_display_name: "담당자",
    owner_email: "owner@example.jp",
    next_action_at: "2026-07-22T00:00:00.000Z",
    contact_readiness: "ready",
    official_address: "〒160-0023 東京都 新宿区 西新宿1-1-1",
    official_address_source_url: "https://example.jp/about",
    last_enrichment_status: "found",
    last_enriched_at: "2026-07-21T00:00:00.000Z",
    verified_candidates: [verifiedEmail],
    pending_candidates: [pendingAddress],
  };
}
