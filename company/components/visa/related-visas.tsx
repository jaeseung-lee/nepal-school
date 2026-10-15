import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { DEFAULT_LOCALE, localizedHref, type Locale } from "@/lib/i18n";
import { getLocalizedVisa, getVisaMessages } from "@/lib/visa-i18n";

// 관련 비자 크로스링크 - 내부 링크 SEO와 회유 동선을 함께 만든다
export default function RelatedVisas({ slugs, locale = DEFAULT_LOCALE }: { slugs: string[]; locale?: Locale }) {
  const visas = slugs.map((slug) => getLocalizedVisa(locale, slug));
  const messages = getVisaMessages(locale);
  return (
    <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
      {visas.map((visa) => (
        <Link
          key={visa.slug}
          href={localizedHref(locale, `/visa/${visa.slug}`)}
          className="group border-t border-ink py-6"
        >
          <span className="text-meta text-muted">
            {visa.countryLabel} · {visa.code}
          </span>
          <h3 className="mt-3 text-lg font-bold tracking-[-0.02em] text-ink underline-offset-4 group-hover:underline">{visa.nameKo}</h3>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
            {messages.ui.viewDetails}
            <ArrowUpRight size={14} weight="bold" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
          </span>
        </Link>
      ))}
    </div>
  );
}
