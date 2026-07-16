import assert from "node:assert/strict";
import test from "node:test";
import { scoreReasonLabels } from "@/lib/sales/i18n";
import {
  calculateLeadScore,
  SCORE_CATEGORY_MAXIMUMS,
  SCORE_GRADE_THRESHOLDS,
  SCORE_RUBRIC,
} from "@/lib/sales/scoring";

test("score rubric is the single complete 70 fit / 30 demand source with localized reason labels", () => {
  const totalFor = (category: "fit" | "demand") => SCORE_RUBRIC
    .filter((criterion) => criterion.category === category)
    .reduce((total, criterion) => total + criterion.points, 0);
  const rubricKeys = SCORE_RUBRIC.map((criterion) => criterion.key).sort();

  assert.equal(totalFor("fit"), SCORE_CATEGORY_MAXIMUMS.fit);
  assert.equal(totalFor("demand"), SCORE_CATEGORY_MAXIMUMS.demand);
  assert.equal(SCORE_CATEGORY_MAXIMUMS.fit + SCORE_CATEGORY_MAXIMUMS.demand, 100);
  assert.equal(SCORE_GRADE_THRESHOLDS.A, 70);
  assert.equal(SCORE_GRADE_THRESHOLDS.B, 45);
  assert.deepEqual(Object.keys(scoreReasonLabels.ja).sort(), rubricKeys);
  assert.deepEqual(Object.keys(scoreReasonLabels.ko).sort(), rubricKeys);
});

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
  assert.deepEqual(
    score.reasons,
    SCORE_RUBRIC.map((criterion) => ({ key: criterion.key, points: criterion.points })),
  );
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
