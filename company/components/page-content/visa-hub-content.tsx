import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import PageBanner from "@/components/page-banner";
import { KEY_VISUALS } from "@/lib/key-visuals";
import { SECTION_LABELS } from "@/lib/section-labels";
import CtaBanner from "@/components/cta-banner";
import JsonLd from "@/components/json-ld";
import VisaDisclaimer from "@/components/visa/visa-disclaimer";
import { DEFAULT_LOCALE, getMessages, localizedHref, type Locale } from "@/lib/i18n";
import { getLocalizedVisa, getVisaMessages, localizedVisasByCountry } from "@/lib/visa-i18n";
import { VISAS, type Visa } from "@/lib/visas";
import { SITE_URL } from "@/lib/site";

function VisaRow({ visa, locale, index }: { visa: Visa; locale: Locale; index: number }) {
  const messages = getVisaMessages(locale);

  return (
    <li>
      <Link
        href={localizedHref(locale, `/visa/${visa.slug}`)}
        className="group grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-x-3 border-b border-line py-7 sm:grid-cols-[2.25rem_8rem_minmax(0,1fr)_auto] sm:gap-x-6"
      >
        <span className="pt-1 text-meta tabular-nums text-muted" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <span className="hidden pt-0.5 text-sm font-bold text-ink sm:block">{visa.code}</span>
        <div>
          <h3 className="text-lg font-bold tracking-[-0.02em] text-ink underline-offset-4 group-hover:underline">
            <span className="sm:hidden">{visa.code} · </span>
            {visa.nameKo}
          </h3>
          <p className="mt-2 text-description text-muted">{visa.summary}</p>
        </div>
        <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
          <span className="sr-only">{messages.ui.viewDetails}</span>
          <ArrowUpRight size={16} weight="bold" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}

function VisaGroup({ index, title, description, visas, locale }: { index: string; title: string; description: string; visas: Visa[]; locale: Locale }) {
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-4">
        <p className="text-meta tabular-nums text-muted" aria-hidden="true">{index}</p>
        <h2 className="mt-4 text-headline text-balance text-ink">{title}</h2>
        <p className="mt-6 max-w-md text-description text-muted">{description}</p>
      </div>
      <ul className="border-t border-ink lg:col-span-8">
        {visas.map((visa, visaIndex) => <VisaRow key={visa.slug} visa={visa} locale={locale} index={visaIndex} />)}
      </ul>
    </div>
  );
}

export default function VisaHubContent({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const visaMessages = getVisaMessages(locale);
  const rootMessages = getMessages(locale);
  const hub = visaMessages.hub;
  const koreaVisas = localizedVisasByCountry(locale, "korea");
  const japanVisas = localizedVisasByCountry(locale, "japan");
  const localizedVisas = VISAS.map((visa) => getLocalizedVisa(locale, visa.slug));

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: rootMessages.common.home, item: `${SITE_URL}${localizedHref(locale, "/")}` },
      { "@type": "ListItem", position: 2, name: hub.banner.crumb, item: `${SITE_URL}${localizedHref(locale, "/visa")}` },
    ],
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: hub.itemListName,
    itemListElement: localizedVisas.map((visa, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: visa.nameKo,
      url: `${SITE_URL}${localizedHref(locale, `/visa/${visa.slug}`)}`,
    })),
  };
  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}${localizedHref(locale, "/visa")}#service`,
    name: hub.metadata.title,
    description: hub.metadata.description,
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: [
      { "@type": "Country", name: "South Korea" },
      { "@type": "Country", name: "Japan" },
    ],
    serviceType: "employment visa process information",
  };

  return (
    <main>
      <JsonLd data={breadcrumb} />
      <JsonLd data={itemList} />
      <JsonLd data={service} />

      <PageBanner
        locale={locale}
        eyebrow={hub.banner.eyebrow}
        context={hub.banner.context}
        title={hub.banner.title}
        desc={hub.banner.description}
        crumb={hub.banner.crumb}
        photo={KEY_VISUALS.pages.visa}
        label={SECTION_LABELS.pages.visa}
      />

      <section className="bg-paper py-section">
        <div className="page-wrap">
          <VisaGroup index="01" title={hub.koreaSection.title} description={hub.koreaSection.description} visas={koreaVisas} locale={locale} />
        </div>
      </section>

      <section className="border-t border-line bg-paper py-section">
        <div className="page-wrap">
          <VisaGroup index="02" title={hub.japanSection.title} description={hub.japanSection.description} visas={japanVisas} locale={locale} />
          <div className="mt-16">
            <VisaDisclaimer locale={locale} />
          </div>
        </div>
      </section>

      <CtaBanner locale={locale} />
    </main>
  );
}
