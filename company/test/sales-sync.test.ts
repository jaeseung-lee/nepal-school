import assert from "node:assert/strict";
import test from "node:test";
import { buildSyncPlan, type ExistingJobState } from "@/lib/sales/sync-plan";
import type { ParsedYoloJob } from "@/lib/sales/yolo-parser";

function parsed(id: string, hash = `hash-${id}`): ParsedYoloJob {
  return {
    sourceJobId: id,
    sourceUrl: `https://example.com/details/${id}`,
    embeddedIdentifier: id,
    title: `Job ${id}`,
    organizationName: "Test",
    normalizedOrganizationName: "test",
    organizationType: "unknown",
    datePosted: null,
    validThrough: null,
    employmentType: null,
    region: null,
    locality: null,
    streetAddress: null,
    normalizedAddress: "住所未確認",
    salaryMin: null,
    salaryMax: null,
    salaryUnit: null,
    salaryCurrency: null,
    japaneseLevel: null,
    visaSupport: false,
    foreignerFriendly: false,
    qualificationSupport: false,
    housingSupport: false,
    sourceHash: hash,
  };
}

function existing(id: string, overrides: Partial<ExistingJobState> = {}): ExistingJobState {
  return {
    id: `uuid-${id}`,
    sourceJobId: id,
    sourceHash: `hash-${id}`,
    status: "active",
    consecutiveMissingCount: 0,
    ...overrides,
  };
}

test("running the same normalized data twice is idempotent", () => {
  const plan = buildSyncPlan({ observed: [parsed("1")], existing: [existing("1")] });
  assert.equal(plan.newJobs.length, 0);
  assert.equal(plan.changedJobs.length, 0);
  assert.equal(plan.unchangedJobs.length, 1);
});

test("a changed hash creates one change and a reappeared job is flagged", () => {
  const plan = buildSyncPlan({
    observed: [parsed("1", "new-hash"), parsed("2")],
    existing: [existing("1"), existing("2", { status: "missing", consecutiveMissingCount: 1 })],
  });
  assert.deepEqual(plan.changedJobs.map((job) => job.sourceJobId), ["1", "2"]);
  assert.equal(plan.reappearedJobIds.has("2"), true);
});

test("one omission becomes missing and the second consecutive omission becomes closed", () => {
  const first = buildSyncPlan({ observed: [], existing: [existing("1")] });
  assert.equal(first.missingTransitions[0].nextStatus, "missing");
  assert.equal(first.missingTransitions[0].nextMissingCount, 1);
  const second = buildSyncPlan({
    observed: [],
    existing: [existing("1", { status: "missing", consecutiveMissingCount: 1 })],
  });
  assert.equal(second.missingTransitions[0].nextStatus, "closed");
  assert.equal(second.missingTransitions[0].nextMissingCount, 2);
});

test("partial page failure and over-20-percent drop block missing/closed transitions", () => {
  const jobs = Array.from({ length: 79 }, (_, index) => parsed(String(index)));
  const current = Array.from({ length: 100 }, (_, index) => existing(String(index)));
  const plan = buildSyncPlan({
    observed: jobs,
    existing: current,
    previousObservedCount: 100,
    failedPages: 1,
  });
  assert.equal(plan.shouldFailRun, true);
  assert.equal(plan.safeForMissingTransitions, false);
  assert.equal(plan.missingTransitions.length, 0);
  assert.deepEqual(plan.failureReasons, [
    "one_or_more_pages_failed",
    "observed_count_dropped_over_20_percent",
  ]);
});
