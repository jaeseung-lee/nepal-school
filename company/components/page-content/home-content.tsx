import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import HeroSlideshow from "@/components/hero-slideshow";
import MetricsStrip from "@/components/metrics-strip";
import ServiceCards from "@/components/service-cards";
import SectionHead from "@/components/section-head";
import { NetworkLogoWall, NetworkMap } from "@/components/partnership-network";
import ProcessSteps from "@/components/process-steps";
import FaqSection from "@/components/faq-section";
import CtaBanner from "@/components/cta-banner";
import LatestInsights from "@/components/blog/latest-insights";
import { DEFAULT_LOCALE, getMessages, localizedHref, type Locale } from "@/lib/i18n";
import { partnersRegionAnchor } from "@/lib/partnership-network";
import { SECTION_LABELS } from "@/lib/section-labels";

const TEXT_LINK =
  "inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline decoration-ink/35 underline-offset-[6px] transition hover:decoration-ink";

export function HomeContent({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const messages = getMessages(locale);
  const intro = messages.home.intro;

  return (
    <main>
      <HeroSlideshow locale={locale} />

      <section id="intro" aria-labelledby="intro-title" className="border-b border-line bg-surface text-ink">
        <div className="page-wrap py-[clamp(7.5rem,14vw,12.5rem)] text-center">
          <p className="eyebrow" lang="en">
            {SECTION_LABELS.intro}
          </p>
          <h2 id="intro-title" className="mx-auto mt-8 max-w-[28em] text-statement text-balance">
            {intro.title}
          </h2>
          <p className="mx-auto mt-9 max-w-[600px] text-description text-muted">{intro.description}</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            <Link href={localizedHref(locale, "/about")} className={TEXT_LINK}>
              {intro.aboutCta} <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
            </Link>
            <Link href={localizedHref(locale, "/why")} className={TEXT_LINK}>
              {intro.whyCta} <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
            </Link>
          </div>
          <MetricsStrip locale={locale} layout="inline" />
        </div>
      </section>

      <section aria-labelledby="services-title" className="bg-paper py-section">
        <div className="page-wrap">
          <SectionHead
            label={SECTION_LABELS.services}
            title={messages.home.services.title}
            titleId="services-title"
            description={messages.home.services.description}
          />
          <ServiceCards locale={locale} />
        </div>
      </section>

      <ProcessSteps locale={locale} />

      <section aria-labelledby="network-title" className="bg-paper py-section">
        <div className="page-wrap">
          <SectionHead
            label={SECTION_LABELS.network}
            title={messages.home.partners.title}
            titleId="network-title"
            description={messages.home.partners.description}
            action={
              <Link href={localizedHref(locale, "/partners")} className="pill pill-outline">
                {messages.home.partners.detailsCta} <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
              </Link>
            }
          />
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <NetworkMap locale={locale} target={partnersRegionAnchor} basePath={localizedHref(locale, "/partners")} />
            <div>
              <h3 className="mb-8 text-title text-ink">{messages.network.logosTitle}</h3>
              <NetworkLogoWall locale={locale} />
            </div>
          </div>
        </div>
      </section>

      <LatestInsights locale={locale} />
      <FaqSection locale={locale} />
      <CtaBanner locale={locale} />
    </main>
  );
}
