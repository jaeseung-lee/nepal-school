import Link from "next/link";
import PageBanner from "@/components/page-banner";
import { KEY_VISUALS } from "@/lib/key-visuals";
import { SECTION_LABELS } from "@/lib/section-labels";
import BreadcrumbSchema from "@/components/breadcrumb-schema";
import SectionHead from "@/components/section-head";
import ServiceCards from "@/components/service-cards";
import ProcessSteps from "@/components/process-steps";
import CtaBanner from "@/components/cta-banner";
import JsonLd from "@/components/json-ld";
import { DEFAULT_LOCALE, getMessages, localizedHref, type Locale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

export function ServicesContent({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const copy = getMessages(locale).pages.services;

  return (
    <main>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Service",
        "@id": `${SITE_URL}${localizedHref(locale, "/services")}#service`,
        name: copy.metadata.title,
        description: copy.metadata.description,
        provider: { "@id": `${SITE_URL}/#organization` },
        areaServed: [
          { "@type": "Country", name: "South Korea" },
          { "@type": "Country", name: "Japan" },
        ],
        serviceType: ["workforce training", "international recruitment preparation", "visa process guidance"],
      }} />
      <BreadcrumbSchema name={copy.banner.crumb} path="/services" locale={locale} />
      <PageBanner
        locale={locale}
        eyebrow={copy.banner.eyebrow}
        context={copy.banner.context}
        title={copy.banner.title}
        desc={copy.banner.description}
        crumb={copy.banner.crumb}
        photo={KEY_VISUALS.pages.services}
        label={SECTION_LABELS.pages.services}
      />

      <section aria-labelledby="services-title" className="bg-paper py-section">
        <div className="page-wrap">
          <SectionHead
            index="01"
            title={copy.main.title}
            titleId="services-title"
            description={
              <>
                {copy.main.descriptionBeforeVisa}{" "}
                <Link href={localizedHref(locale, "/visa")} className="font-medium text-ink underline decoration-ink/35 underline-offset-4 hover:decoration-ink">
                  {copy.main.visaLink}
                </Link>
                {copy.main.descriptionAfterVisa}
              </>
            }
          />
          <ServiceCards locale={locale} />
        </div>
      </section>

      <ProcessSteps locale={locale} />
      <CtaBanner locale={locale} />
    </main>
  );
}
