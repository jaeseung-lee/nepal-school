import PageBanner from "@/components/page-banner";
import { getVisaVisual } from "@/lib/key-visuals";
import { SECTION_LABELS } from "@/lib/section-labels";
import CtaBanner from "@/components/cta-banner";
import FaqList from "@/components/visa/faq-list";
import RelatedVisas from "@/components/visa/related-visas";
import VisaDisclaimer from "@/components/visa/visa-disclaimer";
import VisaGlance from "@/components/visa/visa-glance";
import VisaSchema from "@/components/visa/visa-schema";
import VisaSources from "@/components/visa/visa-sources";
import { type Locale } from "@/lib/i18n";
import { getLocalizedVisa, getVisaMessages } from "@/lib/visa-i18n";

/**
 * Locale-prefixed visa pages share a fully translated, factual core: summary,
 * key requirements, FAQs, related systems, and legal disclaimer. Korean keeps
 * its existing long-form government guidance at the legacy canonical URLs.
 */
export default function LocalizedVisaDetail({ locale, slug }: { locale: Locale; slug: string }) {
  const visa = getLocalizedVisa(locale, slug);
  const messages = getVisaMessages(locale);

  return (
    <main>
      <VisaSchema visa={visa} locale={locale} />
      <PageBanner
        locale={locale}
        eyebrow={messages.ui.visaInformation}
        context={visa.countryLabel}
        title={visa.nameKo}
        desc={visa.summary}
        crumb={messages.ui.visaInformation}
        photo={getVisaVisual(visa.slug)}
        label={SECTION_LABELS.pages.visa}
      />

      <section className="bg-paper py-section">
        <div className="page-wrap">
          <VisaGlance visa={visa} locale={locale} />

          <div className="mt-24 grid gap-10 lg:grid-cols-12 lg:gap-8">
            <h2 className="text-headline text-balance text-ink lg:col-span-4">{messages.ui.frequentlyAskedQuestions}</h2>
            <div className="lg:col-span-8">
              <FaqList faqs={visa.faqs} />
            </div>
          </div>

          {visa.related.length ? (
            <div className="mt-24">
              <h2 className="text-subhead text-balance text-ink">{messages.ui.relatedVisasAndSystems}</h2>
              <div className="mt-8">
                <RelatedVisas slugs={visa.related} locale={locale} />
              </div>
            </div>
          ) : null}

          {visa.sources?.length ? (
            <div className="mt-16">
              <VisaSources heading={messages.ui.officialSources} sources={visa.sources} />
            </div>
          ) : null}

          <div className={visa.sources?.length ? "mt-8" : "mt-16"}>
            <VisaDisclaimer locale={locale} />
          </div>
        </div>
      </section>

      <CtaBanner locale={locale} />
    </main>
  );
}
