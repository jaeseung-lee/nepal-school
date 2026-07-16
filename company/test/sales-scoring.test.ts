import assert from "node:assert/strict";
import test from "node:test";
import { calculateLeadScore } from "@/lib/sales/scoring";

test("lead scoring follows the fixed 70 fit / 30 demand rubric", () => {
  const score = calculateLeadScore(
    {
      organizationType: "direct_employer",
      employmentType: "FULL_TIME",
      visaSupport: true,
      foreignerFriendly: true,
      japaneseLevel: "N3",
      qualificationSupport: true,
      housingSupport: true,
      datePosted: "2026-07-10T00:00:00.000Z",
      validThrough: "2026-09-30T00:00:00.000Z",
      activeJobCount: 3,
      changedOrReappearedThisWeek: true,
    },
    new Date("2026-07-16T00:00:00.000Z"),
  );
  assert.equal(score.fitScore, 70);
  assert.equal(score.demandScore, 30);
  assert.equal(score.totalScore, 100);
  assert.equal(score.grade, "A");
});

test("grade thresholds are A 70+, B 45-69, C 44 or less", () => {
  const base = {
    organizationType: "unknown" as const,
    employmentType: null,
    visaSupport: false,
    foreignerFriendly: false,
    japaneseLevel: null,
    qualificationSupport: false,
    housingSupport: false,
    datePosted: null,
    validThrough: null,
    activeJobCount: 0,
    changedOrReappearedThisWeek: false,
  };
  assert.equal(calculateLeadScore(base).grade, "C");
  assert.equal(
    calculateLeadScore({
      ...base,
      employmentType: "FULL_TIME",
      visaSupport: true,
      foreignerFriendly: true,
      qualificationSupport: true,
    }).grade,
    "B",
  );
});
