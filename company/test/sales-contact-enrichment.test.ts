import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ZodError } from "zod";
import {
  ContactCandidateNormalizationError,
  deduplicateContactCandidates,
  isContactEnrichmentDue,
  missingContactFields,
  normalizeContactCandidate,
  parseContactImportDocument,
  toAutomationContactCandidateRpcRow,
  toContactCandidateDatabaseRow,
} from "@/lib/sales/contact-enrichment";

const organizationId = "11111111-1111-4111-8111-111111111111";
const runId = "22222222-2222-4222-8222-222222222222";
const claimToken = "44444444-4444-4444-8444-444444444444";
const secondClaimToken = "55555555-5555-4555-8555-555555555555";
const checkedAt = "2026-07-21T03:00:00+09:00";
const importerSource = readFileSync(
  new URL("../scripts/import-contact-candidates.ts", import.meta.url),
  "utf8",
);
const actionsSource = readFileSync(
  new URL("../app/(internal)/sales/actions.ts", import.meta.url),
  "utf8",
);

test("legacy arrays and automation envelopes are both accepted", () => {
  const legacy = parseContactImportDocument([
    {
      organizationId,
      kind: "website",
      value: "https://EXAMPLE.jp/",
      sourceUrl: "https://example.jp/company",
    },
  ]);
  assert.equal(legacy.mode, "legacy");

  const automation = parseContactImportDocument({
    runId,
    results: [
      {
        organizationId,
        claimToken,
        result: "partial",
        candidates: [
          {
            kind: "email",
            value: "RECRUIT@EXAMPLE.JP",
            sourceUrl: "https://example.jp/contact",
          },
        ],
      },
    ],
  });
  assert.equal(automation.mode, "automation");
  if (automation.mode === "automation") {
    assert.equal(automation.results[0].outcome, "partial");
  }
});

test("automation parsing keeps malformed candidate payloads isolated to their organization", () => {
  const document = parseContactImportDocument({
    runId,
    results: [
      {
        organizationId,
        claimToken,
        outcome: "partial",
        candidates: [{ kind: "email" }],
      },
      {
        organizationId: "33333333-3333-4333-8333-333333333333",
        claimToken: secondClaimToken,
        outcome: "partial",
        candidates: [
          {
            kind: "email",
            value: "info@example.jp",
            sourceUrl: "https://example.jp/contact",
          },
        ],
      },
    ],
  });
  assert.equal(document.mode, "automation");
  if (document.mode === "automation") {
    assert.throws(
      () =>
        normalizeContactCandidate(document.results[0].candidates[0], {
          organizationId: document.results[0].organizationId,
          checkedAt,
        }),
      ZodError,
    );
    assert.equal(
      normalizeContactCandidate(document.results[1].candidates[0], {
        organizationId: document.results[1].organizationId,
        checkedAt,
      }).normalizedValue,
      "info@example.jp",
    );
  }
});

test("automation envelopes require UUID claim tokens and one result per claim", () => {
  const candidate = {
    kind: "email",
    value: "info@example.jp",
    sourceUrl: "https://example.jp/contact",
  };
  assert.throws(
    () =>
      parseContactImportDocument({
        runId,
        results: [
          { organizationId, claimToken: "not-a-uuid", outcome: "partial", candidates: [candidate] },
        ],
      }),
    ZodError,
  );
  assert.throws(
    () =>
      parseContactImportDocument({
        runId,
        results: [
          { organizationId, claimToken, outcome: "partial", candidates: [candidate] },
          { organizationId, claimToken: secondClaimToken, outcome: "partial", candidates: [candidate] },
        ],
      }),
    ZodError,
  );
});

test("contact values, source URLs and structured addresses are normalized", () => {
  const email = normalizeContactCandidate(
    {
      kind: "email",
      value: " MAILTO:Recruit@Example.JP ",
      sourceUrl: "HTTPS://EXAMPLE.JP/contact/#form",
      confidence: "high",
      department: " 採用　担当 ",
    },
    { organizationId, enrichmentRunId: runId, defaultDiscoveryMethod: "automated", checkedAt },
  );
  assert.equal(email.value, "recruit@example.jp");
  assert.equal(email.normalizedValue, "recruit@example.jp");
  assert.equal(email.sourceUrl, "https://example.jp/contact");
  assert.equal(email.department, "採用 担当");
  assert.equal(email.discoveryMethod, "automated");
  assert.equal(email.lastCheckedAt, "2026-07-20T18:00:00.000Z");

  const phone = normalizeContactCandidate(
    {
      kind: "phone",
      value: "03-1234-5678",
      sourceUrl: "https://example.jp/company",
    },
    { organizationId, checkedAt },
  );
  assert.equal(phone.value, "+81312345678");

  const address = normalizeContactCandidate(
    {
      kind: "official_address",
      sourceUrl: "https://example.jp/company",
      postalCode: "〒160-0023",
      countryCode: "Japan",
      region: "東京都",
      locality: "新宿区",
      streetAddress: "西新宿 1-1",
      addressType: "head_office",
    },
    { organizationId, checkedAt },
  );
  assert.equal(address.value, "東京都 新宿区 西新宿 1-1");
  assert.equal(address.addressPostalCode, "160-0023");
  assert.equal(address.addressCountryCode, "JP");
});

test("dedupe uses organization, kind and normalized value while retaining stronger evidence", () => {
  const low = normalizeContactCandidate(
    {
      kind: "email",
      value: "INFO@EXAMPLE.JP",
      sourceUrl: "https://example.jp/a",
      confidence: "low",
    },
    { organizationId, checkedAt },
  );
  const high = normalizeContactCandidate(
    {
      kind: "email",
      value: "info@example.jp",
      sourceUrl: "https://example.jp/b",
      confidence: "high",
    },
    { organizationId, checkedAt },
  );
  const deduplicated = deduplicateContactCandidates([low, high]);
  assert.equal(deduplicated.length, 1);
  assert.equal(deduplicated[0].confidence, "high");
  assert.equal(deduplicated[0].sourceUrl, "https://example.jp/b");
});

test("legacy database rows omit status so inserts do not carry review metadata", () => {
  const normalized = normalizeContactCandidate(
    {
      kind: "website",
      value: "https://example.jp",
      sourceUrl: "https://example.jp/company",
    },
    { organizationId, checkedAt },
  );
  const row = toContactCandidateDatabaseRow(normalized);
  assert.equal("status" in row, false);
  assert.equal(row.normalized_value, "https://example.jp");
  assert.match(
    importerSource,
    /onConflict:\s*"organization_id,kind,normalized_value",\s*ignoreDuplicates:\s*true/,
  );
});

test("atomic automation payload cannot override claim ownership or review metadata", () => {
  const normalized = normalizeContactCandidate(
    {
      kind: "email",
      value: "info@example.jp",
      sourceUrl: "https://example.jp/contact",
    },
    {
      organizationId,
      enrichmentRunId: runId,
      defaultDiscoveryMethod: "automated",
      checkedAt,
    },
  );
  const row = toAutomationContactCandidateRpcRow(normalized);
  assert.equal(row.normalized_value, "info@example.jp");
  assert.equal("organization_id" in row, false);
  assert.equal("enrichment_run_id" in row, false);
  assert.equal("discovery_method" in row, false);
  assert.equal("status" in row, false);
  assert.match(importerSource, /rpc\("import_contact_enrichment_result"/);
});

test("candidate review is scoped to its organization and pending state", () => {
  assert.match(
    actionsSource,
    /\.eq\("id", parsed\.contactId\)[\s\S]*\.eq\("organization_id", parsed\.organizationId\)[\s\S]*\.eq\("status", "pending"\)/,
  );
});

test("non-http sources, invalid corporate numbers and empty successful outcomes are rejected", () => {
  assert.throws(
    () =>
      normalizeContactCandidate(
        { kind: "website", value: "https://example.jp", sourceUrl: "javascript:alert(1)" },
        { organizationId, checkedAt },
      ),
    ContactCandidateNormalizationError,
  );
  assert.throws(
    () =>
      normalizeContactCandidate(
        { kind: "corporate_number", value: "123", sourceUrl: "https://example.jp" },
        { organizationId, checkedAt },
      ),
    ContactCandidateNormalizationError,
  );
  assert.throws(
    () =>
      normalizeContactCandidate(
        {
          kind: "official_address",
          sourceUrl: "https://example.jp/company",
          postalCode: "160-0023",
        },
        { organizationId, checkedAt },
      ),
    ZodError,
  );
  assert.throws(
    () =>
      parseContactImportDocument({
        runId,
        results: [{ organizationId, claimToken, outcome: "found", candidates: [] }],
      }),
    ZodError,
  );
  assert.throws(
    () =>
      parseContactImportDocument({
        runId,
        results: [
          {
            organizationId,
            claimToken,
            outcome: "ambiguous",
            candidates: [
              {
                kind: "website",
                value: "https://possible.example.jp",
                sourceUrl: "https://possible.example.jp",
              },
            ],
          },
        ],
      }),
    ZodError,
  );
});

test("missing fields treat pending candidates as queued for review but not rejected values", () => {
  const missing = missingContactFields([
    { kind: "official_address", status: "pending" },
    { kind: "phone", status: "verified" },
    { kind: "email", status: "rejected" },
  ]);
  assert.equal(missing.includes("official_address"), false);
  assert.equal(missing.includes("phone"), false);
  assert.equal(missing.includes("email"), true);
  assert.equal(missing.includes("visit_address"), false);
});

test("preview due timing matches queue leases and bounded failure retries", () => {
  const now = new Date("2026-07-21T00:00:00.000Z");
  assert.equal(isContactEnrichmentDue(null, "missing", now), true);
  assert.equal(
    isContactEnrichmentDue(
      { status: "running", leaseExpiresAt: "2026-07-21T00:00:01.000Z" },
      "missing",
      now,
    ),
    false,
  );
  assert.equal(
    isContactEnrichmentDue(
      { status: "running", leaseExpiresAt: "2026-07-21T00:00:00.000Z" },
      "missing",
      now,
    ),
    true,
  );
  assert.equal(
    isContactEnrichmentDue(
      { status: "failed", retryCount: 2, nextRetryAt: "2026-07-20T23:59:59.000Z" },
      "missing",
      now,
    ),
    true,
  );
  assert.equal(
    isContactEnrichmentDue(
      { status: "failed", retryCount: 1, nextRetryAt: "2026-07-21T00:00:01.000Z" },
      "missing",
      now,
    ),
    false,
  );
  assert.equal(
    isContactEnrichmentDue(
      { status: "failed", retryCount: 3, nextRetryAt: "2026-07-20T00:00:00.000Z" },
      "missing",
      now,
    ),
    false,
  );
});

test("preview due timing applies 30-day and ready-only 90-day refresh windows", () => {
  const now = new Date("2026-07-21T00:00:00.000Z");
  const day = 24 * 60 * 60 * 1_000;
  const ago = (days: number) => new Date(now.valueOf() - days * day).toISOString();
  assert.equal(
    isContactEnrichmentDue({ status: "not_found", completedAt: ago(30) }, "missing", now),
    true,
  );
  assert.equal(
    isContactEnrichmentDue({ status: "ambiguous", completedAt: ago(29) }, "missing", now),
    false,
  );
  assert.equal(
    isContactEnrichmentDue({ status: "found", completedAt: ago(30) }, "partial", now),
    true,
  );
  assert.equal(
    isContactEnrichmentDue({ status: "partial", completedAt: ago(89) }, "ready", now),
    false,
  );
  assert.equal(
    isContactEnrichmentDue({ status: "partial", completedAt: ago(90) }, "ready", now),
    true,
  );
});
