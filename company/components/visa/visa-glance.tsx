import type { Visa } from "@/lib/visas";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import { getVisaMessages } from "@/lib/visa-i18n";

// "한눈에 보기" 요약 - 대상/기간/요건 등 핵심을 정의 목록으로 먼저 보여준다
export default function VisaGlance({ visa, locale = DEFAULT_LOCALE }: { visa: Visa; locale?: Locale }) {
  const messages = getVisaMessages(locale);

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
      <h2 className="text-title text-ink lg:col-span-4">{messages.ui.atAGlance}</h2>
      <dl className="border-t border-ink lg:col-span-8">
        {visa.glance.map((row) => (
          <div key={row.label} className="grid gap-1 border-b border-line py-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
            <dt className="text-[13px] text-muted">{row.label}</dt>
            <dd className="text-[15px] leading-relaxed text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
