import type { Visa } from "@/lib/visas";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import { getVisaMessages } from "@/lib/visa-i18n";

// "한눈에 보기" 요약 카드 - 대상/기간/요건 등 핵심을 표로 먼저 보여준다
export default function VisaGlance({ visa, locale = DEFAULT_LOCALE }: { visa: Visa; locale?: Locale }) {
  const messages = getVisaMessages(locale);

  return (
    <div className="rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5 lg:p-8">
      <h2 className="font-display text-2xl font-semibold text-ink">{messages.ui.atAGlance}</h2>
      <dl className="mt-5 divide-y divide-line">
        {visa.glance.map((row) => (
          <div key={row.label} className="grid gap-1 py-4 sm:grid-cols-[160px_1fr] sm:gap-6">
            <dt className="text-sm font-semibold text-cobalt">{row.label}</dt>
            <dd className="text-[15px] leading-relaxed text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
