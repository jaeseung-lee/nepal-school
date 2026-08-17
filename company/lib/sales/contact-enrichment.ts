import { z } from "zod";

export const CONTACT_CANDIDATE_KINDS = [
  "official_name",
  "corporate_number",
  "official_address",
  "website",
  "phone",
  "email",
  "contact_form",
  "visit_address",
] as const;

export const CONTACT_ENRICHMENT_OUTCOMES = [
  "found",
  "partial",
  "ambiguous",
  "not_found",
  "failed",
] as const;

export type ContactCandidateKind = (typeof CONTACT_CANDIDATE_KINDS)[number];
export type ContactEnrichmentOutcome = (typeof CONTACT_ENRICHMENT_OUTCOMES)[number];
export type DiscoveryMethod = "automated" | "manual";

const confidenceSchema = z.enum(["high", "medium", "low"]);
const discoveryMethodSchema = z.enum(["automated", "manual"]);
const addressTypeSchema = z.enum(["registered_office", "head_office", "facility", "other"]);

const candidateFieldsSchema = z
  .object({
    locationId: z.string().uuid().nullable().optional(),
    kind: z.enum(CONTACT_CANDIDATE_KINDS),
    value: z.string().min(1).max(500).optional(),
    sourceUrl: z.string().min(1).max(2_000),
    confidence: confidenceSchema.default("medium"),
    notes: z.string().max(1_000).optional(),
    department: z.string().max(200).optional(),
    purpose: z.string().max(200).optional(),
    isPrimary: z.boolean().default(false),
    discoveryMethod: discoveryMethodSchema.optional(),
    lastCheckedAt: z.string().datetime({ offset: true }).optional(),
    postalCode: z.string().max(32).optional(),
    countryCode: z.string().max(64).optional(),
    region: z.string().max(100).optional(),
    locality: z.string().max(200).optional(),
    streetAddress: z.string().max(300).optional(),
    addressType: addressTypeSchema.optional(),
  })
  .superRefine((candidate, context) => {
    const hasStructuredAddress = Boolean(
      candidate.region ||
        candidate.locality ||
        candidate.streetAddress ||
        candidate.postalCode ||
        candidate.countryCode
    );
    const hasAddressText = Boolean(candidate.region || candidate.locality || candidate.streetAddress);
    if (!candidate.value && !hasAddressText) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "value is required unless structured address fields are provided",
      });
    }
    if (
      hasStructuredAddress &&
      candidate.kind !== "official_address" &&
      candidate.kind !== "visit_address"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["kind"],
        message: "structured address fields are only valid for address candidates",
      });
    }
  });

const legacyCandidateSchema = candidateFieldsSchema.and(
  z.object({ organizationId: z.string().uuid() }),
);

const enrichmentResultSchema = z
  .object({
    organizationId: z.string().uuid(),
    claimToken: z.string().uuid(),
    outcome: z.enum(CONTACT_ENRICHMENT_OUTCOMES).optional(),
    result: z.enum(CONTACT_ENRICHMENT_OUTCOMES).optional(),
    // Candidate payloads are normalized per organization by the importer. Keeping
    // them opaque here lets one malformed organization's result fail in isolation.
    candidates: z.array(z.unknown()).max(200).default([]),
    errorMessage: z.string().max(2_000).optional(),
  })
  .superRefine((item, context) => {
    if (!item.outcome && !item.result) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["outcome"],
        message: "outcome is required",
      });
    }
    if (item.outcome && item.result && item.outcome !== item.result) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["result"],
        message: "outcome and result must match when both are provided",
      });
    }
    const outcome = item.outcome ?? item.result;
    if ((outcome === "found" || outcome === "partial") && item.candidates.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["candidates"],
        message: `${outcome} requires at least one candidate`,
      });
    }
    if (
      outcome != null &&
      outcome !== "found" &&
      outcome !== "partial" &&
      item.candidates.length > 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["candidates"],
        message: `${outcome} must not include candidates`,
      });
    }
  });

const automationEnvelopeSchema = z
  .object({
    runId: z.string().uuid(),
    results: z.array(enrichmentResultSchema).max(200).optional(),
    tasks: z.array(enrichmentResultSchema).max(200).optional(),
  })
  .superRefine((document, context) => {
    if ((document.results == null) === (document.tasks == null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "provide exactly one of results or tasks",
      });
    }
    const field = document.results != null ? "results" : "tasks";
    const results = document.results ?? document.tasks ?? [];
    const seenOrganizations = new Set<string>();
    results.forEach((result, index) => {
      if (seenOrganizations.has(result.organizationId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field, index],
          message: "organizationId must be unique within a run envelope",
        });
      }
      seenOrganizations.add(result.organizationId);
    });
  });

export type CandidateInput = z.input<typeof candidateFieldsSchema>;
export type LegacyCandidateInput = z.input<typeof legacyCandidateSchema>;

export type AutomationEnrichmentResult = {
  organizationId: string;
  claimToken: string;
  outcome: ContactEnrichmentOutcome;
  candidates: CandidateInput[];
  errorMessage?: string;
};

export type ContactImportDocument =
  | { mode: "legacy"; candidates: LegacyCandidateInput[] }
  | { mode: "automation"; runId: string; results: AutomationEnrichmentResult[] };

export type NormalizedContactCandidate = {
  organizationId: string;
  locationId: string | null;
  kind: ContactCandidateKind;
  value: string;
  normalizedValue: string;
  sourceUrl: string;
  confidence: "high" | "medium" | "low";
  notes: string | null;
  department: string | null;
  purpose: string | null;
  isPrimary: boolean;
  discoveryMethod: DiscoveryMethod;
  enrichmentRunId: string | null;
  lastCheckedAt: string;
  addressPostalCode: string | null;
  addressCountryCode: string | null;
  addressRegion: string | null;
  addressLocality: string | null;
  addressStreet: string | null;
  addressType: "registered_office" | "head_office" | "facility" | "other" | null;
};

export function toContactCandidateDatabaseRow(candidate: NormalizedContactCandidate) {
  return {
    organization_id: candidate.organizationId,
    location_id: candidate.locationId,
    kind: candidate.kind,
    value: candidate.value,
    normalized_value: candidate.normalizedValue,
    source_url: candidate.sourceUrl,
    confidence: candidate.confidence,
    notes: candidate.notes,
    department: candidate.department,
    purpose: candidate.purpose,
    is_primary: candidate.isPrimary,
    discovery_method: candidate.discoveryMethod,
    enrichment_run_id: candidate.enrichmentRunId,
    last_checked_at: candidate.lastCheckedAt,
    address_postal_code: candidate.addressPostalCode,
    address_country_code: candidate.addressCountryCode,
    address_region: candidate.addressRegion,
    address_locality: candidate.addressLocality,
    address_street: candidate.addressStreet,
    address_type: candidate.addressType,
    // `status` is intentionally absent: inserts use the database default. Legacy
    // imports ignore normalized conflicts so the entire reviewed row stays intact.
  };
}

export function toAutomationContactCandidateRpcRow(candidate: NormalizedContactCandidate) {
  return {
    location_id: candidate.locationId,
    kind: candidate.kind,
    value: candidate.value,
    normalized_value: candidate.normalizedValue,
    source_url: candidate.sourceUrl,
    confidence: candidate.confidence,
    notes: candidate.notes,
    department: candidate.department,
    purpose: candidate.purpose,
    is_primary: candidate.isPrimary,
    last_checked_at: candidate.lastCheckedAt,
    address_postal_code: candidate.addressPostalCode,
    address_country_code: candidate.addressCountryCode,
    address_region: candidate.addressRegion,
    address_locality: candidate.addressLocality,
    address_street: candidate.addressStreet,
    address_type: candidate.addressType,
  };
}

export class ContactCandidateNormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContactCandidateNormalizationError";
  }
}

function normalizeSpace(value: string | null | undefined): string {
  return value?.normalize("NFKC").replace(/[\s\u3000]+/g, " ").trim() ?? "";
}

export function normalizeHttpUrl(value: string, fieldName = "URL"): string {
  let url: URL;
  try {
    url = new URL(normalizeSpace(value));
  } catch {
    throw new ContactCandidateNormalizationError(`${fieldName} must be an absolute URL`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ContactCandidateNormalizationError(`${fieldName} must use http or https`);
  }
  if (url.username || url.password || !url.hostname) {
    throw new ContactCandidateNormalizationError(`${fieldName} must not contain credentials`);
  }
  url.hash = "";
  url.hostname = url.hostname.toLocaleLowerCase("en-US");
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  const normalized = url.toString();
  return url.pathname === "/" && !url.search ? normalized.replace(/\/$/, "") : normalized;
}

function normalizeEmail(value: string): string {
  const normalized = normalizeSpace(value).replace(/^mailto:/i, "").toLocaleLowerCase("en-US");
  const parsed = z.string().email().safeParse(normalized);
  if (!parsed.success) throw new ContactCandidateNormalizationError("email candidate is invalid");
  return normalized;
}

function normalizePhone(value: string): string {
  const compact = normalizeSpace(value)
    .replace(/^tel:/i, "")
    .replace(/(?:内線|ext\.?|extension)\s*\d+$/i, "")
    .replace(/[\s()（）.‐‑‒–—―ー−-]/g, "");
  if (/^\+81\(?(?:0\)?)/.test(compact)) {
    return `+81${compact.replace(/^\+81\(?(?:0\)?)/, "")}`;
  }
  if (/^\+\d{8,15}$/.test(compact)) return compact;
  if (/^0\d{9,10}$/.test(compact)) return `+81${compact.slice(1)}`;
  throw new ContactCandidateNormalizationError("phone candidate must be a valid domestic or E.164 number");
}

function normalizeCorporateNumber(value: string): string {
  const normalized = normalizeSpace(value).replace(/[^\d]/g, "");
  if (!/^\d{13}$/.test(normalized)) {
    throw new ContactCandidateNormalizationError("corporate number must contain exactly 13 digits");
  }
  return normalized;
}

function normalizePostalCode(value: string | null | undefined): string | null {
  const compact = normalizeSpace(value).replace(/^〒\s*/, "").replace(/[^\d]/g, "");
  if (!compact) return null;
  if (!/^\d{7}$/.test(compact)) {
    throw new ContactCandidateNormalizationError("Japanese postal code must contain 7 digits");
  }
  return `${compact.slice(0, 3)}-${compact.slice(3)}`;
}

function normalizeCountryCode(value: string | null | undefined): string | null {
  const normalized = normalizeSpace(value).toUpperCase();
  if (!normalized) return null;
  if (["JP", "JPN", "JAPAN", "日本", "日本国"].includes(normalized)) return "JP";
  if (/^[A-Z]{2}$/.test(normalized)) return normalized;
  throw new ContactCandidateNormalizationError("country code must be an ISO 3166-1 alpha-2 code");
}

function normalizeAddressValue(value: string): string {
  return normalizeSpace(value).replace(/[‐‑‒–—―ー−]/g, "-");
}

function normalizedCandidateValue(kind: ContactCandidateKind, value: string): string {
  switch (kind) {
    case "email":
      return normalizeEmail(value);
    case "phone":
      return normalizePhone(value);
    case "website":
    case "contact_form":
      return normalizeHttpUrl(value, `${kind} value`);
    case "corporate_number":
      return normalizeCorporateNumber(value);
    case "official_address":
    case "visit_address":
      return normalizeAddressValue(value).toLocaleLowerCase("ja");
    case "official_name":
      return normalizeSpace(value).toLocaleLowerCase("ja");
  }
}

export function parseContactImportDocument(input: unknown): ContactImportDocument {
  if (Array.isArray(input)) {
    return { mode: "legacy", candidates: z.array(legacyCandidateSchema).max(200).parse(input) };
  }
  const parsed = automationEnvelopeSchema.parse(input);
  const rawResults = parsed.results ?? parsed.tasks ?? [];
  return {
    mode: "automation",
    runId: parsed.runId,
    results: rawResults.map((result) => ({
      organizationId: result.organizationId,
      claimToken: result.claimToken,
      outcome: (result.outcome ?? result.result) as ContactEnrichmentOutcome,
      candidates: result.candidates as CandidateInput[],
      ...(result.errorMessage ? { errorMessage: result.errorMessage } : {}),
    })),
  };
}

export function normalizeContactCandidate(
  raw: CandidateInput,
  context: {
    organizationId: string;
    enrichmentRunId?: string | null;
    defaultDiscoveryMethod?: DiscoveryMethod;
    checkedAt?: string;
  },
): NormalizedContactCandidate {
  const candidate = candidateFieldsSchema.parse(raw);
  const addressPostalCode = normalizePostalCode(candidate.postalCode);
  const addressCountryCode = normalizeCountryCode(candidate.countryCode);
  const addressRegion = normalizeAddressValue(candidate.region ?? "") || null;
  const addressLocality = normalizeAddressValue(candidate.locality ?? "") || null;
  const addressStreet = normalizeAddressValue(candidate.streetAddress ?? "") || null;
  const structuredAddress = normalizeSpace(
    [addressRegion, addressLocality, addressStreet].filter(Boolean).join(" "),
  );
  const rawValue = normalizeSpace(candidate.value) || structuredAddress;
  if (!rawValue) {
    throw new ContactCandidateNormalizationError("candidate value is empty after normalization");
  }
  const normalizedValue = normalizedCandidateValue(candidate.kind, rawValue);
  const value = ["email", "phone", "website", "contact_form", "corporate_number"].includes(candidate.kind)
    ? normalizedValue
    : normalizeSpace(rawValue);
  const checkedAt = candidate.lastCheckedAt ?? context.checkedAt ?? new Date().toISOString();
  if (Number.isNaN(new Date(checkedAt).valueOf())) {
    throw new ContactCandidateNormalizationError("lastCheckedAt must be a valid ISO timestamp");
  }

  return {
    organizationId: context.organizationId,
    locationId: candidate.locationId ?? null,
    kind: candidate.kind,
    value,
    normalizedValue,
    sourceUrl: normalizeHttpUrl(candidate.sourceUrl, "sourceUrl"),
    confidence: candidate.confidence,
    notes: normalizeSpace(candidate.notes) || null,
    department: normalizeSpace(candidate.department) || null,
    purpose: normalizeSpace(candidate.purpose) || null,
    isPrimary: candidate.isPrimary,
    discoveryMethod: context.defaultDiscoveryMethod ?? candidate.discoveryMethod ?? "manual",
    enrichmentRunId: context.enrichmentRunId ?? null,
    lastCheckedAt: new Date(checkedAt).toISOString(),
    addressPostalCode,
    addressCountryCode,
    addressRegion,
    addressLocality,
    addressStreet,
    addressType: candidate.addressType ?? null,
  };
}

export function deduplicateContactCandidates(
  candidates: NormalizedContactCandidate[],
): NormalizedContactCandidate[] {
  const confidenceRank = { low: 0, medium: 1, high: 2 } as const;
  const unique = new Map<string, NormalizedContactCandidate>();
  for (const candidate of candidates) {
    const key = `${candidate.organizationId}\u0000${candidate.kind}\u0000${candidate.normalizedValue}`;
    const current = unique.get(key);
    if (!current || confidenceRank[candidate.confidence] > confidenceRank[current.confidence]) {
      unique.set(key, candidate);
    }
  }
  return [...unique.values()];
}

export function missingContactFields(
  candidates: Array<{ kind: string; status: string }>,
): ContactCandidateKind[] {
  const satisfied = new Set(
    candidates
      .filter((candidate) => candidate.status === "verified" || candidate.status === "pending")
      .map((candidate) => candidate.kind),
  );
  return CONTACT_CANDIDATE_KINDS.filter(
    (kind) => kind !== "visit_address" && !satisfied.has(kind),
  );
}

export type ContactReadiness = "ready" | "review_pending" | "partial" | "missing";

export type ContactEnrichmentTaskTiming = {
  status: string;
  retryCount?: number | null;
  nextRetryAt?: string | null;
  completedAt?: string | null;
  leaseExpiresAt?: string | null;
};

function timestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(value).valueOf();
  return Number.isNaN(parsed) ? null : parsed;
}

export function isContactEnrichmentDue(
  task: ContactEnrichmentTaskTiming | null | undefined,
  readiness: ContactReadiness,
  now: Date = new Date(),
): boolean {
  if (!task) return true;
  const nowValue = now.valueOf();
  if (Number.isNaN(nowValue)) throw new Error("now must be a valid date");

  if (task.status === "queued") return true;
  if (task.status === "running") {
    const leaseExpiresAt = timestamp(task.leaseExpiresAt);
    return leaseExpiresAt == null || leaseExpiresAt <= nowValue;
  }
  if (task.status === "failed") {
    const nextRetryAt = timestamp(task.nextRetryAt);
    return (task.retryCount ?? 0) < 3 && nextRetryAt != null && nextRetryAt <= nowValue;
  }

  const completedAt = timestamp(task.completedAt);
  if (completedAt == null) return false;
  const days = task.status === "found" || task.status === "partial"
    ? readiness === "ready" ? 90 : 30
    : task.status === "ambiguous" || task.status === "not_found"
      ? 30
      : null;
  return days != null && completedAt <= nowValue - days * 24 * 60 * 60 * 1_000;
}
