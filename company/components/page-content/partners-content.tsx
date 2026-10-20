import PageBanner from "@/components/page-banner";
import { KEY_VISUALS } from "@/lib/key-visuals";
import { SECTION_LABELS } from "@/lib/section-labels";
import BreadcrumbSchema from "@/components/breadcrumb-schema";
import CtaBanner from "@/components/cta-banner";
import { NetworkDirectory, NetworkMap } from "@/components/partnership-network";
import { DEFAULT_LOCALE, getMessages, type Locale } from "@/lib/i18n";
import { partnersRegionAnchor } from "@/lib/partnership-network";

function GroupHeading({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <p className="text-meta tabular-nums text-muted" aria-hidden="true">{index}</p>
      <h2 className="mt-4 text-headline text-balance text-ink">{children}</h2>
    </div>
  );
}

export function PartnersContent({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const messages = getMessages(locale);
  const copy = messages.pages.partners;
  const network = messages.network;
  return (
    <main>
      <BreadcrumbSchema name={copy.banner.crumb} path="/partners" locale={locale} />
      <PageBanner locale={locale} {...copy.banner} desc={network.description} photo={KEY_VISUALS.pages.partners} label={SECTION_LABELS.pages.partners} />
      <section className="bg-paper py-section">
        <div className="page-wrap">
          <GroupHeading index="01">{network.groups.municipality}</GroupHeading>
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <NetworkMap locale={locale} target={partnersRegionAnchor} />
            <NetworkDirectory locale={locale} kind="municipality" prefix="partners-municipality" />
          </div>
        </div>
      </section>
      <section className="border-t border-line bg-paper py-section">
        <div className="page-wrap">
          <GroupHeading index="02">{network.groups.university}</GroupHeading>
          <NetworkDirectory locale={locale} kind="university" prefix="partners-university" />
        </div>
      </section>
      <section className="border-t border-line bg-paper py-section">
        <div className="page-wrap">
          <GroupHeading index="03">{network.groups.partner}</GroupHeading>
          <NetworkDirectory locale={locale} kind="partner" prefix="partners-partner" />
        </div>
      </section>
      <section className="border-t border-line bg-paper py-section">
        <div className="page-wrap">
          <GroupHeading index="04">{network.groups.japan}</GroupHeading>
          <NetworkDirectory locale={locale} kind="japan" prefix="partners-japan" />
        </div>
      </section>
      <CtaBanner locale={locale} />
    </main>
  );
}
