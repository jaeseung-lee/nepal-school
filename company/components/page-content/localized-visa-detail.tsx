import PageBanner from "@/components/page-banner";
import CtaBanner from "@/components/cta-banner";
import FaqList from "@/components/visa/faq-list";
import RelatedVisas from "@/components/visa/related-visas";
import VisaDisclaimer from "@/components/visa/visa-disclaimer";
import VisaGlance from "@/components/visa/visa-glance";
import VisaSchema from "@/components/visa/visa-schema";
import Reveal from "@/components/reveal";
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
        bgImage="/kv/redesign/process.webp"
      />

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <VisaGlance visa={visa} locale={locale} />
          </Reveal>

          <Reveal delay={0.08} className="mt-16">
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">{messages.ui.frequentlyAskedQuestions}</h2>
            <div className="mt-10">
              <FaqList faqs={visa.faqs} />
            </div>
          </Reveal>

          {visa.related.length ? (
            <Reveal delay={0.08} className="mt-16">
              <h2 className="font-display text-3xl font-semibold text-ink lg:text-4xl">{messages.ui.relatedVisasAndSystems}</h2>
              <div className="mt-8">
                <RelatedVisas slugs={visa.related} locale={locale} />
              </div>
            </Reveal>
          ) : null}

          <Reveal delay={0.12} className="mt-12">
            <VisaDisclaimer locale={locale} />
          </Reveal>
        </div>
      </section>

      <CtaBanner locale={locale} />
    </main>
  );
}
