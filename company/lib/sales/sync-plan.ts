import type { ParsedYoloJob } from "@/lib/sales/yolo-parser";

export type ExistingJobState = {
  id: string;
  sourceJobId: string;
  sourceHash: string;
  status: "active" | "missing" | "closed";
  consecutiveMissingCount: number;
};

export type MissingTransition = ExistingJobState & {
  nextStatus: "missing" | "closed";
  nextMissingCount: number;
};

export type SyncPlan = {
  newJobs: ParsedYoloJob[];
  changedJobs: ParsedYoloJob[];
  unchangedJobs: ParsedYoloJob[];
  reappearedJobIds: Set<string>;
  missingTransitions: MissingTransition[];
  safeForMissingTransitions: boolean;
  shouldFailRun: boolean;
  failureReasons: string[];
};

export function buildSyncPlan(args: {
  observed: ParsedYoloJob[];
  existing: ExistingJobState[];
  expectedCount?: number | null;
  previousObservedCount?: number | null;
  failedPages?: number;
}): SyncPlan {
  const {
    observed,
    existing,
    expectedCount = null,
    previousObservedCount = null,
    failedPages = 0,
  } = args;
  const failureReasons: string[] = [];
  const referenceCount = Math.max(expectedCount ?? 0, previousObservedCount ?? 0);
  if (failedPages > 0) failureReasons.push("one_or_more_pages_failed");
  if (referenceCount > 0 && observed.length < referenceCount * 0.8) {
    failureReasons.push("observed_count_dropped_over_20_percent");
  }
  const safeForMissingTransitions = failureReasons.length === 0;

  const existingById = new Map(existing.map((job) => [job.sourceJobId, job]));
  const observedIds = new Set(observed.map((job) => job.sourceJobId));
  const newJobs: ParsedYoloJob[] = [];
  const changedJobs: ParsedYoloJob[] = [];
  const unchangedJobs: ParsedYoloJob[] = [];
  const reappearedJobIds = new Set<string>();

  for (const job of observed) {
    const prior = existingById.get(job.sourceJobId);
    if (!prior) {
      newJobs.push(job);
    } else if (prior.sourceHash !== job.sourceHash || prior.status !== "active") {
      changedJobs.push(job);
      if (prior.status !== "active") reappearedJobIds.add(job.sourceJobId);
    } else {
      unchangedJobs.push(job);
    }
  }

  const missingTransitions: MissingTransition[] = safeForMissingTransitions
    ? existing
        .filter((job) => !observedIds.has(job.sourceJobId) && job.status !== "closed")
        .map((job) => {
          const nextMissingCount = job.consecutiveMissingCount + 1;
          return {
            ...job,
            nextMissingCount,
            nextStatus: nextMissingCount >= 2 ? "closed" : "missing",
          };
        })
    : [];

  return {
    newJobs,
    changedJobs,
    unchangedJobs,
    reappearedJobIds,
    missingTransitions,
    safeForMissingTransitions,
    shouldFailRun: !safeForMissingTransitions,
    failureReasons,
  };
}
