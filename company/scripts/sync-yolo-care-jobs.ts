import "dotenv/config";

import { setTimeout as delay } from "node:timers/promises";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { calculateLeadScore } from "@/lib/sales/scoring";
import { buildSyncPlan, type ExistingJobState } from "@/lib/sales/sync-plan";
import {
  mergeDetailFacts,
  parseYoloDetailPage,
  parseYoloListingPage,
  type ParsedYoloJob,
} from "@/lib/sales/yolo-parser";

loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true, quiet: true });

const SOURCE = "yolo_japan";
const LIST_URL = "https://www.yolo-japan.com/ja/sitemap/job-category/77";
const USER_AGENT = "JoongwooHRD-InternalLeadMonitor/1.0 (+https://www.joongwoohrd.com)";

type CliOptions = {
  dryRun: boolean;
  limitPages: number | null;
  detailBatchSize: number;
  skipDetails: boolean;
};

type StoredJob = ExistingJobState & {
  listingHash: string;
  detailCheckedAt: string | null;
  japaneseLevel: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryUnit: string | null;
  salaryCurrency: string | null;
  visaSupport: boolean;
  foreignerFriendly: boolean;
  qualificationSupport: boolean;
  housingSupport: boolean;
};

function parseOptions(argv: string[]): CliOptions {
  const valueAfter = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const limitPagesRaw = valueAfter("--limit-pages");
  const detailBatchRaw = valueAfter("--detail-batch-size");
  const limitPages = limitPagesRaw ? Number(limitPagesRaw) : null;
  const detailBatchSize = detailBatchRaw ? Number(detailBatchRaw) : 40;
  if (limitPages != null && (!Number.isInteger(limitPages) || limitPages < 1)) {
    throw new Error("--limit-pages must be a positive integer");
  }
  if (!Number.isInteger(detailBatchSize) || detailBatchSize < 0 || detailBatchSize > 200) {
    throw new Error("--detail-batch-size must be between 0 and 200");
  }
  return {
    dryRun: argv.includes("--dry-run"),
    limitPages,
    detailBatchSize,
    skipDetails: argv.includes("--skip-details"),
  };
}

async function fetchHtml(url: string, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(attempt * 1_000);
    }
  }
  throw new Error(`Failed to fetch ${url}: ${lastError instanceof Error ? lastError.message : "unknown"}`);
}

function listingUrl(page: number) {
  return `${LIST_URL}/${page}`;
}

function uniqueJobs(jobs: ParsedYoloJob[], warnings: string[]) {
  const byId = new Map<string, ParsedYoloJob>();
  for (const job of jobs) {
    if (byId.has(job.sourceJobId)) warnings.push(`duplicate_job:${job.sourceJobId}`);
    byId.set(job.sourceJobId, job);
  }
  return [...byId.values()];
}

async function collectListings(options: CliOptions) {
  const requestDelay = Number(process.env.YOLO_REQUEST_DELAY_MS ?? 800);
  const firstHtml = await fetchHtml(listingUrl(1));
  const first = parseYoloListingPage(firstHtml, listingUrl(1));
  const discoveredPages = first.lastPage;
  const pageLimit = Math.min(options.limitPages ?? discoveredPages, discoveredPages);
  const jobs = [...first.jobs];
  const warnings = [...first.warnings];
  let failedPages = 0;

  for (let page = 2; page <= pageLimit; page += 1) {
    await delay(requestDelay);
    try {
      const parsed = parseYoloListingPage(await fetchHtml(listingUrl(page)), listingUrl(page));
      jobs.push(...parsed.jobs);
      warnings.push(...parsed.warnings.map((warning) => `page:${page}:${warning}`));
    } catch (error) {
      failedPages += 1;
      warnings.push(`page:${page}:fetch_failed:${error instanceof Error ? error.message : "unknown"}`);
    }
  }

  if (options.limitPages && options.limitPages < discoveredPages && !options.dryRun) {
    throw new Error("--limit-pages is only allowed with --dry-run");
  }

  return {
    jobs: uniqueJobs(jobs, warnings),
    advertisedCount: first.advertisedCount,
    discoveredPages,
    fetchedPages: pageLimit,
    failedPages,
    warnings,
  };
}

function snapshot(job: ParsedYoloJob) {
  return {
    source_job_id: job.sourceJobId,
    source_url: job.sourceUrl,
    title: job.title,
    organization_name: job.organizationName,
    organization_type: job.organizationType,
    date_posted: job.datePosted,
    valid_through: job.validThrough,
    employment_type: job.employmentType,
    region: job.region,
    locality: job.locality,
    street_address: job.streetAddress,
    salary_min: job.salaryMin,
    salary_max: job.salaryMax,
    salary_unit: job.salaryUnit,
    salary_currency: job.salaryCurrency,
    japanese_level: job.japaneseLevel,
    visa_support: job.visaSupport,
    foreigner_friendly: job.foreignerFriendly,
    qualification_support: job.qualificationSupport,
    housing_support: job.housingSupport,
  };
}

async function enrichDetails(
  jobs: ParsedYoloJob[],
  existingById: Map<string, StoredJob>,
  selectedIds: Set<string>,
  options: CliOptions,
  warnings: string[],
) {
  if (options.skipDetails || options.detailBatchSize === 0) {
    return { jobs, enrichedIds: new Set<string>() };
  }
  const detailDelay = Number(process.env.YOLO_DETAIL_DELAY_MS ?? 1_200);
  const prioritized = jobs
    .filter((job) => selectedIds.has(job.sourceJobId) || !existingById.get(job.sourceJobId)?.detailCheckedAt)
    .slice(0, options.detailBatchSize);
  const enriched = new Map(jobs.map((job) => [job.sourceJobId, job]));
  const enrichedIds = new Set<string>();

  for (const job of prioritized) {
    await delay(detailDelay);
    try {
      const detail = parseYoloDetailPage(await fetchHtml(job.sourceUrl), job.sourceUrl);
      enriched.set(job.sourceJobId, mergeDetailFacts(job, detail));
      enrichedIds.add(job.sourceJobId);
    } catch (error) {
      warnings.push(
        `job:${job.sourceJobId}:detail_failed:${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }
  return { jobs: [...enriched.values()], enrichedIds };
}

async function getExistingState(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const { data, error } = await supabase
    .from("jobs")
    .select("id,source_job_id,listing_hash,source_hash,status,consecutive_missing_count,detail_checked_at,japanese_level,salary_min,salary_max,salary_unit,salary_currency,visa_support,foreigner_friendly,qualification_support,housing_support")
    .eq("source", SOURCE);
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map(
    (row): StoredJob => ({
      id: String(row.id),
      sourceJobId: String(row.source_job_id),
      sourceHash: String(row.source_hash),
      listingHash: String(row.listing_hash),
      status: row.status as StoredJob["status"],
      consecutiveMissingCount: Number(row.consecutive_missing_count),
      detailCheckedAt: row.detail_checked_at ? String(row.detail_checked_at) : null,
      japaneseLevel: row.japanese_level ? String(row.japanese_level) : null,
      salaryMin: row.salary_min == null ? null : Number(row.salary_min),
      salaryMax: row.salary_max == null ? null : Number(row.salary_max),
      salaryUnit: row.salary_unit ? String(row.salary_unit) : null,
      salaryCurrency: row.salary_currency ? String(row.salary_currency) : null,
      visaSupport: Boolean(row.visa_support),
      foreignerFriendly: Boolean(row.foreigner_friendly),
      qualificationSupport: Boolean(row.qualification_support),
      housingSupport: Boolean(row.housing_support),
    }),
  );
}

async function getPreviousObservedCount(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const { data } = await supabase
    .from("source_runs")
    .select("observed_count")
    .eq("source", SOURCE)
    .eq("status", "succeeded")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.observed_count ? Number(data.observed_count) : null;
}

async function ensureOrganization(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  job: ParsedYoloJob,
  cache: Map<string, { id: string; isNew: boolean; organizationType: ParsedYoloJob["organizationType"]; displayName: string }>,
) {
  const cached = cache.get(job.normalizedOrganizationName);
  if (cached) return cached;

  const { data: existing, error: selectError } = await supabase
    .from("organizations")
    .select("id,organization_type")
    .eq("source", SOURCE)
    .eq("normalized_name", job.normalizedOrganizationName)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) {
    const result = {
      id: String(existing.id),
      isNew: false,
      organizationType: existing.organization_type as ParsedYoloJob["organizationType"],
      displayName: job.organizationName,
    };
    cache.set(job.normalizedOrganizationName, result);
    return result;
  }

  const { data, error } = await supabase
    .from("organizations")
    .insert({
      source: SOURCE,
      source_name: job.organizationName,
      normalized_name: job.normalizedOrganizationName,
      display_name: job.organizationName,
      organization_type: job.organizationType,
    })
    .select("id")
    .single();
  if (error) throw error;
  const result = {
    id: String(data.id),
    isNew: true,
    organizationType: job.organizationType,
    displayName: job.organizationName,
  };
  cache.set(job.normalizedOrganizationName, result);
  return result;
}

async function ensureLocation(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  organizationId: string,
  job: ParsedYoloJob,
) {
  const { data, error } = await supabase
    .from("locations")
    .upsert(
      {
        organization_id: organizationId,
        region: job.region,
        locality: job.locality,
        street_address: job.streetAddress,
        normalized_address: job.normalizedAddress,
      },
      { onConflict: "organization_id,normalized_address" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

async function upsertJob(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  job: ParsedYoloJob,
  organizationId: string,
  locationId: string,
  sourceRunId: string,
  listingHash: string,
  createVersion: boolean,
  detailChecked: boolean,
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("jobs")
    .upsert(
      {
        source: SOURCE,
        source_job_id: job.sourceJobId,
        organization_id: organizationId,
        location_id: locationId,
        title: job.title,
        source_url: job.sourceUrl,
        date_posted: job.datePosted?.slice(0, 10) ?? null,
        valid_through: job.validThrough,
        employment_type: job.employmentType,
        salary_min: job.salaryMin,
        salary_max: job.salaryMax,
        salary_unit: job.salaryUnit,
        salary_currency: job.salaryCurrency,
        japanese_level: job.japaneseLevel,
        visa_support: job.visaSupport,
        foreigner_friendly: job.foreignerFriendly,
        qualification_support: job.qualificationSupport,
        housing_support: job.housingSupport,
        detail_checked_at: detailChecked ? now : undefined,
        listing_hash: listingHash,
        source_hash: job.sourceHash,
        status: "active",
        consecutive_missing_count: 0,
        last_seen_at: now,
        last_changed_at: createVersion ? now : undefined,
      },
      { onConflict: "source,source_job_id" },
    )
    .select("id")
    .single();
  if (error) throw error;

  if (createVersion) {
    const { error: versionError } = await supabase.from("job_versions").upsert(
      {
        job_id: data.id,
        source_run_id: sourceRunId,
        source_hash: job.sourceHash,
        snapshot: snapshot(job),
      },
      { onConflict: "job_id,source_hash", ignoreDuplicates: true },
    );
    if (versionError) throw versionError;
  }

  return String(data.id);
}

async function upsertLeadScores(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  groups: Map<string, ParsedYoloJob[]>,
  changedIds: Set<string>,
) {
  const top: Array<{ organizationId: string; score: number; grade: string }> = [];
  for (const [organizationId, jobs] of groups) {
    const scores = jobs.map((job) =>
      calculateLeadScore({
        organizationType: job.organizationType,
        employmentType: job.employmentType,
        visaSupport: job.visaSupport,
        foreignerFriendly: job.foreignerFriendly,
        japaneseLevel: job.japaneseLevel,
        qualificationSupport: job.qualificationSupport,
        housingSupport: job.housingSupport,
        datePosted: job.datePosted,
        validThrough: job.validThrough,
        activeJobCount: jobs.length,
        changedOrReappearedThisWeek: changedIds.has(job.sourceJobId),
      }),
    );
    const best = scores.sort((a, b) => b.totalScore - a.totalScore)[0];
    const { data: existing, error: selectError } = await supabase
      .from("sales_leads")
      .select("id")
      .eq("organization_id", organizationId)
      .is("location_id", null)
      .maybeSingle();
    if (selectError) throw selectError;
    const leadPayload = {
      organization_id: organizationId,
      fit_score: best.fitScore,
      demand_score: best.demandScore,
      score_reasons: best.reasons,
    };
    const result = existing
      ? await supabase.from("sales_leads").update(leadPayload).eq("id", existing.id)
      : await supabase.from("sales_leads").insert(leadPayload);
    if (result.error) throw result.error;
    top.push({ organizationId, score: best.totalScore, grade: best.grade });
  }
  return top.sort((a, b) => b.score - a.score).slice(0, 10);
}

async function run() {
  const options = parseOptions(process.argv.slice(2));

  if (options.dryRun) {
    const collected = await collectListings(options);
    const sample = collected.jobs.slice(0, 10).map((job) => ({
      id: job.sourceJobId,
      title: job.title,
      organization: job.organizationName,
      sourceUrl: job.sourceUrl,
      identifierMismatch:
        job.embeddedIdentifier && job.embeddedIdentifier !== job.sourceJobId
          ? job.embeddedIdentifier
          : null,
    }));
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          advertisedCount: collected.advertisedCount,
          observedCount: collected.jobs.length,
          discoveredPages: collected.discoveredPages,
          fetchedPages: collected.fetchedPages,
          failedPages: collected.failedPages,
          warningCount: collected.warnings.length,
          warnings: collected.warnings.slice(0, 20),
          sample,
        },
        null,
        2,
      ),
    );
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { data: runRow, error: runError } = await supabase
    .from("source_runs")
    .insert({ status: "running", source: SOURCE })
    .select("id")
    .single();
  if (runError) throw runError;
  const runId = String(runRow.id);
  let collected: Awaited<ReturnType<typeof collectListings>> | null = null;

  try {
    collected = await collectListings(options);
    const existing = await getExistingState(supabase);
    const existingById = new Map(existing.map((job) => [job.sourceJobId, job]));
    const listingHashById = new Map(collected.jobs.map((job) => [job.sourceJobId, job.sourceHash]));
    const existingForListingComparison: ExistingJobState[] = existing.map((job) => ({
      id: job.id,
      sourceJobId: job.sourceJobId,
      sourceHash: job.listingHash,
      status: job.status,
      consecutiveMissingCount: job.consecutiveMissingCount,
    }));
    const previousObservedCount = await getPreviousObservedCount(supabase);
    const initialPlan = buildSyncPlan({
      observed: collected.jobs,
      existing: existingForListingComparison,
      expectedCount: collected.advertisedCount,
      previousObservedCount,
      failedPages: collected.failedPages,
    });
    const detailPriority = new Set([
      ...initialPlan.newJobs.map((job) => job.sourceJobId),
      ...initialPlan.changedJobs.map((job) => job.sourceJobId),
    ]);
    const hydratedJobs = collected.jobs.map((job) => {
      const prior = existingById.get(job.sourceJobId);
      if (!prior?.detailCheckedAt) return job;
      return mergeDetailFacts(job, {
        japaneseLevel: job.japaneseLevel ?? prior.japaneseLevel,
        salaryMin: job.salaryMin ?? prior.salaryMin,
        salaryMax: job.salaryMax ?? prior.salaryMax,
        salaryUnit: job.salaryUnit ?? prior.salaryUnit,
        salaryCurrency: job.salaryCurrency ?? prior.salaryCurrency,
        visaSupport: job.visaSupport || prior.visaSupport,
        foreignerFriendly: job.foreignerFriendly || prior.foreignerFriendly,
        qualificationSupport: job.qualificationSupport || prior.qualificationSupport,
        housingSupport: job.housingSupport || prior.housingSupport,
      });
    });
    const detailResult = await enrichDetails(
      hydratedJobs,
      existingById,
      detailPriority,
      options,
      collected.warnings,
    );
    const jobs = detailResult.jobs;
    const plan = initialPlan;

    const organizationCache = new Map<
      string,
      { id: string; isNew: boolean; organizationType: ParsedYoloJob["organizationType"]; displayName: string }
    >();
    const organizationGroups = new Map<string, ParsedYoloJob[]>();
    const newIds = new Set(plan.newJobs.map((job) => job.sourceJobId));
    const versionIds = new Set(
      jobs
        .filter((job) => {
          const prior = existingById.get(job.sourceJobId);
          return !prior || prior.sourceHash !== job.sourceHash || prior.status !== "active";
        })
        .map((job) => job.sourceJobId),
    );
    const detailIds = detailResult.enrichedIds;

    for (const job of jobs) {
      const organization = await ensureOrganization(supabase, job, organizationCache);
      const locationId = await ensureLocation(supabase, organization.id, job);
      await upsertJob(
        supabase,
        job,
        organization.id,
        locationId,
        runId,
        listingHashById.get(job.sourceJobId) ?? job.sourceHash,
        versionIds.has(job.sourceJobId),
        detailIds.has(job.sourceJobId),
      );
      const group = organizationGroups.get(organization.id) ?? [];
      group.push({ ...job, organizationType: organization.organizationType });
      organizationGroups.set(organization.id, group);
    }

    for (const transition of plan.missingTransitions) {
      const { error } = await supabase
        .from("jobs")
        .update({
          status: transition.nextStatus,
          consecutive_missing_count: transition.nextMissingCount,
        })
        .eq("id", transition.id);
      if (error) throw error;
    }

    const changedIds = new Set([...versionIds].filter((id) => !newIds.has(id)));
    const topLeadScores = await upsertLeadScores(supabase, organizationGroups, changedIds);
    const organizationsById = new Map(
      [...organizationCache.values()].map((organization) => [organization.id, organization]),
    );
    const topLeads = topLeadScores.map((lead) => ({
      ...lead,
      organization: organizationsById.get(lead.organizationId)?.displayName ?? "unknown",
    }));
    const { count: pendingContacts } = await supabase
      .from("contact_candidates")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    const newOrganizations = [...organizationCache.values()]
      .filter((item) => item.isNew)
      .map((item) => ({ id: item.id, organization: item.displayName }));
    const newOrganizationCount = newOrganizations.length;
    const status = plan.shouldFailRun ? "failed" : "succeeded";
    const errorMessage = plan.shouldFailRun ? plan.failureReasons.join(",") : null;
    const closedCount = plan.missingTransitions.filter((item) => item.nextStatus === "closed").length;
    const missingCount = plan.missingTransitions.filter((item) => item.nextStatus === "missing").length;
    const { error: finishError } = await supabase
      .from("source_runs")
      .update({
        status,
        finished_at: new Date().toISOString(),
        expected_count: collected.advertisedCount,
        observed_count: jobs.length,
        page_count: collected.fetchedPages,
        new_count: plan.newJobs.length,
        changed_count: changedIds.size,
        missing_count: missingCount,
        closed_count: closedCount,
        new_organization_count: newOrganizationCount,
        contact_pending_count: pendingContacts ?? 0,
        error_count: collected.failedPages,
        warnings: collected?.warnings.slice(0, 200) ?? [],
        error_message: errorMessage,
      })
      .eq("id", runId);
    if (finishError) throw finishError;

    const report = {
      runId,
      status,
      total: jobs.length,
      new: plan.newJobs.length,
      changed: changedIds.size,
      missing: missingCount,
      closed: closedCount,
      newOrganizations: newOrganizationCount,
      newOrganizationList: newOrganizations,
      pendingContacts: pendingContacts ?? 0,
      topLeads,
      errors: collected.warnings.filter((warning) => warning.includes("failed")),
    };
    console.log(JSON.stringify(report, null, 2));
    if (plan.shouldFailRun) process.exitCode = 1;
  } catch (error) {
    await supabase
      .from("source_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_count: 1,
        error_message: error instanceof Error ? error.message : "unknown error",
        warnings: collected?.warnings.slice(0, 200) ?? [],
      })
      .eq("id", runId);
    throw error;
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
