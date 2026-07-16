import {
  SCORE_CATEGORY_MAXIMUMS,
  SCORE_RUBRIC,
  type ScoreCategory,
} from "@/lib/sales/scoring";
import {
  localizedLabel,
  scoreReasonLabels,
  salesMessages,
  type SalesLocale,
} from "@/lib/sales/i18n";

const SCORE_CATEGORIES: readonly ScoreCategory[] = ["fit", "demand"];

export default function ScoreCriteria({ locale }: { locale: SalesLocale }) {
  const t = salesMessages[locale];

  return (
    <details className="rounded-2xl border border-[#dce3eb] bg-white p-5 sm:p-6">
      <summary className="cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-lg font-bold">{t.scoreCriteria}</span>
          <span className="text-xs font-semibold text-[#59667a]">{t.scoreCriteriaSummary}</span>
        </span>
      </summary>
      <div className="mt-5 space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          {SCORE_CATEGORIES.map((category) => (
            <section key={category} className="rounded-xl bg-[#f3f6f9] p-4">
              <h3 className="text-sm font-bold text-[#17233a]">
                {category === "fit" ? t.fit : t.demand} · {SCORE_CATEGORY_MAXIMUMS[category]}
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {SCORE_RUBRIC.filter((criterion) => criterion.category === category).map((criterion) => (
                  <li key={criterion.key} className="flex items-start justify-between gap-3">
                    <span>{localizedLabel(scoreReasonLabels, criterion.key, locale)}</span>
                    <strong className="shrink-0 tabular-nums">+{criterion.points}</strong>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="text-sm font-semibold text-[#27344b]">{t.scoreGradeThresholds}</p>
        <p className="text-xs leading-5 text-[#69768a]">{t.companyScoreNote}</p>
        <p className="text-xs leading-5 text-[#69768a]">{t.scoreDisclaimer}</p>
      </div>
    </details>
  );
}
