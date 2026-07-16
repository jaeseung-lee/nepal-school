import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { z } from "zod";

const YOLO_ORIGIN = "https://www.yolo-japan.com";
const JOB_PATH_PATTERN = /\/recruit\/job\/details\/(\d+)(?:[/?#]|$)/;

const addressSchema = z
  .object({
    addressCountry: z.union([z.string(), z.object({ name: z.string().optional() })]).optional(),
    addressRegion: z.string().optional(),
    addressLocality: z.string().optional(),
    streetAddress: z.string().optional(),
  })
  .passthrough();

const placeSchema = z
  .object({
    address: addressSchema.optional(),
  })
  .passthrough();

const monetaryValueSchema = z
  .object({
    currency: z.string().optional(),
    value: z
      .union([
        z.number(),
        z.object({
          minValue: z.number().optional(),
          maxValue: z.number().optional(),
          value: z.number().optional(),
          unitText: z.string().optional(),
        }),
      ])
      .optional(),
  })
  .passthrough();

const jobPostingSchema = z
  .object({
    "@type": z.union([z.literal("JobPosting"), z.array(z.string())]),
    title: z.string().min(1),
    description: z.string().optional(),
    identifier: z
      .union([
        z.string(),
        z.object({ value: z.union([z.string(), z.number()]).optional() }).passthrough(),
      ])
      .optional(),
    datePosted: z.string().optional(),
    validThrough: z.string().optional(),
    employmentType: z.union([z.string(), z.array(z.string())]).optional(),
    hiringOrganization: z.object({ name: z.string().min(1) }).passthrough(),
    jobLocation: z.union([placeSchema, z.array(placeSchema)]).optional(),
    baseSalary: monetaryValueSchema.optional(),
    url: z.string().optional(),
  })
  .passthrough();

export type OrganizationType = "direct_employer" | "agency" | "unknown";

export type ParsedYoloJob = {
  sourceJobId: string;
  sourceUrl: string;
  embeddedIdentifier: string | null;
  title: string;
  organizationName: string;
  normalizedOrganizationName: string;
  organizationType: OrganizationType;
  datePosted: string | null;
  validThrough: string | null;
  employmentType: string | null;
  region: string | null;
  locality: string | null;
  streetAddress: string | null;
  normalizedAddress: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryUnit: string | null;
  salaryCurrency: string | null;
  japaneseLevel: string | null;
  visaSupport: boolean;
  foreignerFriendly: boolean;
  qualificationSupport: boolean;
  housingSupport: boolean;
  sourceHash: string;
};

export type ListingParseResult = {
  jobs: ParsedYoloJob[];
  lastPage: number;
  advertisedCount: number | null;
  warnings: string[];
};

function normalizeSpace(value: string | null | undefined) {
  return value?.replace(/[\s\u3000]+/g, " ").trim() ?? "";
}

export function normalizeOrganizationName(value: string) {
  return normalizeSpace(
    normalizeSpace(value)
    .replace(/株式会社|有限会社|合同会社|社会福祉法人|医療法人(?:社団)?/g, "")
    .replace(/[・･]/g, "")
    .toLocaleLowerCase("ja"),
  );
}

export function classifyOrganization(name: string): OrganizationType {
  const agencySignals = /派遣|人材|紹介予定|アデコ|スタッフサービス|ビジネスサポート/i;
  return agencySignals.test(name) ? "agency" : "unknown";
}

function embeddedIdentifier(value: z.infer<typeof jobPostingSchema>["identifier"]): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && value.value != null) return String(value.value);
  return null;
}

function plainText(html: string | undefined) {
  if (!html) return "";
  return normalizeSpace(cheerio.load(`<body>${html}</body>`)("body").text());
}

function isoDate(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function extractAddress(job: z.infer<typeof jobPostingSchema>) {
  const location = Array.isArray(job.jobLocation) ? job.jobLocation[0] : job.jobLocation;
  const address = location?.address;
  const region = normalizeSpace(address?.addressRegion) || null;
  const locality = normalizeSpace(address?.addressLocality) || null;
  const streetAddress = normalizeSpace(address?.streetAddress) || null;
  const normalizedAddress = normalizeSpace([region, locality, streetAddress].filter(Boolean).join(" ")) || "住所未確認";
  return { region, locality, streetAddress, normalizedAddress };
}

function extractSalary(job: z.infer<typeof jobPostingSchema>, text: string) {
  const rawValue = job.baseSalary?.value;
  let salaryMin: number | null = null;
  let salaryMax: number | null = null;
  let salaryUnit: string | null = null;

  if (typeof rawValue === "number") {
    salaryMin = rawValue;
    salaryMax = rawValue;
  } else if (rawValue) {
    salaryMin = rawValue.minValue ?? rawValue.value ?? null;
    salaryMax = rawValue.maxValue ?? rawValue.value ?? null;
    salaryUnit = rawValue.unitText ?? null;
  }

  if (salaryMin == null) {
    const hourly = text.match(/時給\s*([\d,]+)(?:\s*[〜～~-]\s*([\d,]+))?\s*円/);
    const monthly = text.match(/月給\s*([\d,.]+)\s*万?円(?:\s*[〜～~-]\s*([\d,.]+)\s*万?円)?/);
    const match = hourly ?? monthly;
    if (match) {
      const multiplier = monthly && match[0].includes("万") ? 10_000 : 1;
      salaryMin = Number(match[1].replace(/,/g, "")) * multiplier;
      salaryMax = match[2] ? Number(match[2].replace(/,/g, "")) * multiplier : salaryMin;
      salaryUnit = hourly ? "HOUR" : "MONTH";
    }
  }

  return {
    salaryMin,
    salaryMax,
    salaryUnit,
    salaryCurrency: job.baseSalary?.currency ?? (salaryMin != null ? "JPY" : null),
  };
}

function extractJapaneseLevel(text: string) {
  const match = text.match(/(?:JLPT\s*)?(N[1-5])/i);
  return match?.[1]?.toUpperCase() ?? null;
}

export function hashJobFacts(job: Omit<ParsedYoloJob, "sourceHash">): string {
  const canonical = JSON.stringify(job, Object.keys(job).sort());
  return createHash("sha256").update(canonical).digest("hex");
}

function toParsedJob(raw: unknown, sourceUrl: string): ParsedYoloJob {
  const job = jobPostingSchema.parse(raw);
  const match = new URL(sourceUrl, YOLO_ORIGIN).pathname.match(JOB_PATH_PATTERN);
  if (!match) throw new Error(`Job URL has no numeric ID: ${sourceUrl}`);

  const description = plainText(job.description);
  const employmentType = Array.isArray(job.employmentType)
    ? job.employmentType.join(",")
    : job.employmentType ?? null;
  const address = extractAddress(job);
  const salary = extractSalary(job, description);
  const facts: Omit<ParsedYoloJob, "sourceHash"> = {
    sourceJobId: match[1],
    sourceUrl: new URL(sourceUrl, YOLO_ORIGIN).toString(),
    embeddedIdentifier: embeddedIdentifier(job.identifier),
    title: normalizeSpace(job.title),
    organizationName: normalizeSpace(job.hiringOrganization.name),
    normalizedOrganizationName: normalizeOrganizationName(job.hiringOrganization.name),
    organizationType: classifyOrganization(job.hiringOrganization.name),
    datePosted: isoDate(job.datePosted),
    validThrough: isoDate(job.validThrough),
    employmentType,
    ...address,
    ...salary,
    japaneseLevel: extractJapaneseLevel(description),
    visaSupport: /特定技能|ビザ(?:支援|サポート)|在留資格/i.test(description),
    foreignerFriendly: /外国人|外国籍|外国人スタッフ/i.test(description),
    qualificationSupport: /資格(?:取得)?(?:支援|サポート)|研修制度/i.test(description),
    housingSupport: /寮|社宅|住居支援|住宅手当/i.test(description),
  };
  return { ...facts, sourceHash: hashJobFacts(facts) };
}

function findJobPosting(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw.flatMap(findJobPosting);
  if (!raw || typeof raw !== "object") return [];
  const value = raw as Record<string, unknown>;
  if (value["@graph"]) return findJobPosting(value["@graph"]);
  const type = value["@type"];
  return type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting")) ? [value] : [];
}

export function parseYoloListingPage(html: string, pageUrl: string): ListingParseResult {
  const $ = cheerio.load(html);
  const jobs: ParsedYoloJob[] = [];
  const warnings: string[] = [];

  $(".job-card").each((index, element) => {
    const card = $(element);
    const href = card.find('a[href*="/recruit/job/details/"]').first().attr("href");
    const script = card.find('script[type="application/ld+json"]').first().text();
    if (!href || !script) {
      warnings.push(`card:${index + 1}:missing_url_or_jsonld`);
      return;
    }
    try {
      const candidates = findJobPosting(JSON.parse(script));
      if (!candidates.length) throw new Error("JobPosting not found");
      const parsed = toParsedJob(candidates[0], new URL(href, pageUrl).toString());
      if (parsed.embeddedIdentifier && parsed.embeddedIdentifier !== parsed.sourceJobId) {
        warnings.push(
          `job:${parsed.sourceJobId}:identifier_mismatch:${parsed.embeddedIdentifier}`,
        );
      }
      jobs.push(parsed);
    } catch (error) {
      warnings.push(
        `card:${index + 1}:invalid_jsonld:${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  });

  let lastPage = 1;
  $('a[href*="/sitemap/job-category/77/"]').each((_, element) => {
    const href = $(element).attr("href") ?? "";
    const match = href.match(/\/sitemap\/job-category\/77\/(\d+)/);
    if (match) lastPage = Math.max(lastPage, Number(match[1]));
  });

  const bodyText = normalizeSpace($("body").text());
  const advertisedMatch = bodyText.match(/([\d,]+)\s*件/);
  const advertisedCount = advertisedMatch ? Number(advertisedMatch[1].replace(/,/g, "")) : null;

  return { jobs, lastPage, advertisedCount, warnings };
}

export function parseYoloDetailPage(html: string, sourceUrl: string): Partial<ParsedYoloJob> {
  const $ = cheerio.load(html);
  const rawText = normalizeSpace($("main").text() || $("body").text());
  const parsedScripts: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      parsedScripts.push(...findJobPosting(JSON.parse($(element).text())));
    } catch {
      // Other structured data on the page is allowed to be malformed.
    }
  });

  const base = parsedScripts[0] ? toParsedJob(parsedScripts[0], sourceUrl) : null;
  return {
    ...(base ?? {}),
    japaneseLevel: extractJapaneseLevel(rawText) ?? base?.japaneseLevel ?? null,
    visaSupport: /特定技能|ビザ(?:支援|サポート)|在留資格/i.test(rawText) || base?.visaSupport || false,
    foreignerFriendly: /外国人|外国籍|外国人スタッフ/i.test(rawText) || base?.foreignerFriendly || false,
    qualificationSupport: /資格(?:取得)?(?:支援|サポート)|研修制度/i.test(rawText) || base?.qualificationSupport || false,
    housingSupport: /寮|社宅|住居支援|住宅手当/i.test(rawText) || base?.housingSupport || false,
  };
}

export function mergeDetailFacts(listing: ParsedYoloJob, detail: Partial<ParsedYoloJob>): ParsedYoloJob {
  const { sourceHash: _listingHash, ...listingFacts } = listing;
  const mergedFacts = { ...listingFacts, ...detail, sourceJobId: listing.sourceJobId, sourceUrl: listing.sourceUrl };
  delete (mergedFacts as Partial<ParsedYoloJob>).sourceHash;
  return { ...mergedFacts, sourceHash: hashJobFacts(mergedFacts) } as ParsedYoloJob;
}
