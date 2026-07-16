import type { OrganizationType } from "@/lib/sales/yolo-parser";

export type ScoreInput = {
  organizationType: OrganizationType;
  employmentType: string | null;
  visaSupport: boolean;
  foreignerFriendly: boolean;
  japaneseLevel: string | null;
  qualificationSupport: boolean;
  housingSupport: boolean;
  datePosted: string | null;
  validThrough: string | null;
  activeJobCount: number;
  changedOrReappearedThisWeek: boolean;
};

export type LeadScore = {
  fitScore: number;
  demandScore: number;
  totalScore: number;
  grade: "A" | "B" | "C";
  reasons: Array<{ key: string; points: number }>;
};

export type ScoreCriterionKey =
  | "direct_employer"
  | "stable_employment"
  | "visa_support"
  | "foreigner_experience"
  | "n3_n4"
  | "qualification_support"
  | "housing_support"
  | "recent_post"
  | "three_active_jobs"
  | "long_validity"
  | "weekly_change";

export type ScoreCategory = "fit" | "demand";

export type ScoreCriterion = {
  key: ScoreCriterionKey;
  category: ScoreCategory;
  points: number;
  applies: (input: ScoreInput, now: Date) => boolean;
};

export const SCORE_CATEGORY_MAXIMUMS = {
  fit: 70,
  demand: 30,
} as const;

export const SCORE_GRADE_THRESHOLDS = {
  A: 70,
  B: 45,
} as const;

/**
 * The shared source of truth for scoring, stored reason keys, and the UI rubric.
 * Keep every user-visible criterion tied to this list so copy cannot drift from
 * the calculation used by the collector and company editor.
 */
export const SCORE_RUBRIC = [
  {
    key: "direct_employer",
    category: "fit",
    points: 10,
    applies: (input) => input.organizationType === "direct_employer",
  },
  {
    key: "stable_employment",
    category: "fit",
    points: 15,
    applies: (input) => /FULL_TIME|CONTRACTOR|正社員|契約社員/i.test(input.employmentType ?? ""),
  },
  { key: "visa_support", category: "fit", points: 15, applies: (input) => input.visaSupport },
  { key: "foreigner_experience", category: "fit", points: 10, applies: (input) => input.foreignerFriendly },
  { key: "n3_n4", category: "fit", points: 10, applies: (input) => /N[34]/i.test(input.japaneseLevel ?? "") },
  { key: "qualification_support", category: "fit", points: 5, applies: (input) => input.qualificationSupport },
  { key: "housing_support", category: "fit", points: 5, applies: (input) => input.housingSupport },
  {
    key: "recent_post",
    category: "demand",
    points: 10,
    applies: (input, now) => {
      const postedAt = input.datePosted ? new Date(input.datePosted) : null;
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return Boolean(postedAt && !Number.isNaN(postedAt.valueOf()) && postedAt >= thirtyDaysAgo);
    },
  },
  { key: "three_active_jobs", category: "demand", points: 10, applies: (input) => input.activeJobCount >= 3 },
  {
    key: "long_validity",
    category: "demand",
    points: 5,
    applies: (input, now) => {
      const validThrough = input.validThrough ? new Date(input.validThrough) : null;
      const inThirtyDays = new Date(now);
      inThirtyDays.setDate(inThirtyDays.getDate() + 30);
      return Boolean(validThrough && !Number.isNaN(validThrough.valueOf()) && validThrough >= inThirtyDays);
    },
  },
  { key: "weekly_change", category: "demand", points: 5, applies: (input) => input.changedOrReappearedThisWeek },
] as const satisfies readonly ScoreCriterion[];

export function calculateLeadScore(input: ScoreInput, now = new Date()): LeadScore {
  const reasons: LeadScore["reasons"] = [];
  let fitScore = 0;
  let demandScore = 0;

  for (const criterion of SCORE_RUBRIC) {
    if (!criterion.applies(input, now)) continue;
    if (criterion.category === "fit") fitScore += criterion.points;
    else demandScore += criterion.points;
    reasons.push({ key: criterion.key, points: criterion.points });
  }

  const totalScore = fitScore + demandScore;
  const grade = totalScore >= SCORE_GRADE_THRESHOLDS.A
    ? "A"
    : totalScore >= SCORE_GRADE_THRESHOLDS.B
      ? "B"
      : "C";
  return { fitScore, demandScore, totalScore, grade, reasons };
}
