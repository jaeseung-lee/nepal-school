import { Info } from "@phosphor-icons/react/dist/ssr";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import { getVisaMessages } from "@/lib/visa-i18n";

// 모든 비자 페이지 공통 고지 - 제도 변동 가능성과 일반 정보임을 명시 (사실 안전장치)
export default function VisaDisclaimer({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const messages = getVisaMessages(locale);

  return (
    <div className="flex gap-3 rounded-[18px] border border-line bg-paper p-5 text-sm leading-relaxed text-muted">
      <Info size={20} className="mt-0.5 shrink-0 text-cobalt" weight="duotone" aria-hidden="true" />
      <p>{messages.ui.disclaimer}</p>
    </div>
  );
}
