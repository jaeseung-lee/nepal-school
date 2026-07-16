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

export function calculateLeadScore(input: ScoreInput, now = new Date()): LeadScore {
  const reasons: LeadScore["reasons"] = [];
  let fitScore = 0;
  let demandScore = 0;

  const fit = (condition: boolean, key: string, points: number) => {
    if (!condition) return;
    fitScore += points;
    reasons.push({ key, points });
  };
  const demand = (condition: boolean, key: string, points: number) => {
    if (!condition) return;
    demandScore += points;
    reasons.push({ key, points });
  };

  fit(input.organizationType === "direct_employer", "direct_employer", 10);
  fit(
    /FULL_TIME|CONTRACTOR|正社員|契約社員/i.test(input.employmentType ?? ""),
    "stable_employment",
    15,
  );
  fit(input.visaSupport, "visa_support", 15);
  fit(input.foreignerFriendly, "foreigner_experience", 10);
  fit(/N[34]/i.test(input.japaneseLevel ?? ""), "n3_n4", 10);
  fit(input.qualificationSupport, "qualification_support", 5);
  fit(input.housingSupport, "housing_support", 5);

  const postedAt = input.datePosted ? new Date(input.datePosted) : null;
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  demand(Boolean(postedAt && !Number.isNaN(postedAt.valueOf()) && postedAt >= thirtyDaysAgo), "recent_post", 10);
  demand(input.activeJobCount >= 3, "three_active_jobs", 10);

  const validThrough = input.validThrough ? new Date(input.validThrough) : null;
  const inThirtyDays = new Date(now);
  inThirtyDays.setDate(inThirtyDays.getDate() + 30);
  demand(Boolean(validThrough && !Number.isNaN(validThrough.valueOf()) && validThrough >= inThirtyDays), "long_validity", 5);
  demand(input.changedOrReappearedThisWeek, "weekly_change", 5);

  const totalScore = fitScore + demandScore;
  const grade = totalScore >= 70 ? "A" : totalScore >= 45 ? "B" : "C";
  return { fitScore, demandScore, totalScore, grade, reasons };
}
