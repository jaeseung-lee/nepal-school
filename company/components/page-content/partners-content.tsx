import PageBanner from "@/components/page-banner";
import BreadcrumbSchema from "@/components/breadcrumb-schema";
import CtaBanner from "@/components/cta-banner";
import { NetworkDirectory, NetworkMap } from "@/components/partnership-network";
import { DEFAULT_LOCALE, getMessages, type Locale } from "@/lib/i18n";
import { institutionsByKind } from "@/lib/partnership-network";

export function PartnersContent({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const messages = getMessages(locale);
  const copy = messages.pages.partners;
  const network = messages.network;
  const municipalRegions = new Set(institutionsByKind("municipality").map((item) => item.region));
  return (
    <main>
      <BreadcrumbSchema name={copy.banner.crumb} path="/partners" locale={locale} />
      <PageBanner locale={locale} {...copy.banner} desc={network.description} imageAlt={copy.banner.alt} bgImage="/kv/banner-partners.webp" />
      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-16 lg:px-8 lg:py-24">
          <h2 className="mb-8 font-display text-3xl font-semibold text-ink lg:text-4xl">{network.groups.municipality}</h2>
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
            <NetworkMap locale={locale} target={(region) => `partners-${municipalRegions.has(region) ? "municipality" : "university"}-${region}`} />
            <NetworkDirectory locale={locale} kind="municipality" prefix="partners-municipality" />
          </div>
        </div>
      </section>
      <section className="bg-paper-soft">
        <div className="max-w-content mx-auto px-5 py-16 lg:px-8 lg:py-24">
          <h2 className="mb-8 font-display text-3xl font-semibold text-ink lg:text-4xl">{network.groups.university}</h2>
          <NetworkDirectory locale={locale} kind="university" prefix="partners-university" />
        </div>
      </section>
      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-16 lg:px-8 lg:py-24">
          <h2 className="mb-8 font-display text-3xl font-semibold text-ink lg:text-4xl">{network.groups.partner}</h2>
          <NetworkDirectory locale={locale} kind="partner" prefix="partners-partner" />
        </div>
      </section>
      <CtaBanner locale={locale} />
    </main>
  );
}
