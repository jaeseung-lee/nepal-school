import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { DEFAULT_LOCALE, localizedHref, type Locale } from "@/lib/i18n";
import { getLocalizedVisa, getVisaMessages } from "@/lib/visa-i18n";

// 관련 비자 크로스링크 카드 - 내부 링크 SEO와 회유 동선을 함께 만든다
export default function RelatedVisas({ slugs, locale = DEFAULT_LOCALE }: { slugs: string[]; locale?: Locale }) {
  const visas = slugs.map((slug) => getLocalizedVisa(locale, slug));
  const messages = getVisaMessages(locale);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visas.map((visa) => (
        <Link
          key={visa.slug}
          href={localizedHref(locale, `/visa/${visa.slug}`)}
          className="group rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5 transition hover:border-cobalt"
        >
          <span className="inline-flex rounded-full bg-cobalt-soft px-3 py-1 text-xs font-semibold text-cobalt">
            {visa.countryLabel} · {visa.code}
          </span>
          <h3 className="mt-3 font-display text-lg font-semibold text-ink">{visa.nameKo}</h3>
          <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-cobalt">
            {messages.ui.viewDetails}
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </Link>
      ))}
    </div>
  );
}
