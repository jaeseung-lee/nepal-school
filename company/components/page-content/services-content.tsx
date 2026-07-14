import Link from "next/link";
import PageBanner from "@/components/page-banner";
import BreadcrumbSchema from "@/components/breadcrumb-schema";
import ServiceCards from "@/components/service-cards";
import ProcessSteps from "@/components/process-steps";
import CtaBanner from "@/components/cta-banner";
import Reveal from "@/components/reveal";
import { DEFAULT_LOCALE, getMessages, localizedHref, type Locale } from "@/lib/i18n";

export function ServicesContent({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const copy = getMessages(locale).pages.services;

  return (
    <main>
      <BreadcrumbSchema name={copy.banner.crumb} path="/services" locale={locale} />
      <PageBanner
        locale={locale}
        eyebrow={copy.banner.eyebrow}
        context={copy.banner.context}
        title={copy.banner.title}
        desc={copy.banner.description}
        crumb={copy.banner.crumb}
        imageAlt={copy.banner.alt}
        bgImage="/kv/banner-services.webp"
      />

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">
              {copy.main.title}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted">
              {copy.main.descriptionBeforeVisa}{" "}
              <Link href={localizedHref(locale, "/visa")} className="font-medium text-cobalt underline underline-offset-2">
                {copy.main.visaLink}
              </Link>
              {copy.main.descriptionAfterVisa}
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-12">
            <ServiceCards locale={locale} />
          </Reveal>
        </div>
      </section>

      <ProcessSteps locale={locale} />
      <CtaBanner locale={locale} />
    </main>
  );
}
