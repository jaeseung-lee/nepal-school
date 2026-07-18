import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import HeroSlideshow from "@/components/hero-slideshow";
import MetricsStrip from "@/components/metrics-strip";
import Collage from "@/components/collage";
import ServiceCards from "@/components/service-cards";
import PartnerCards from "@/components/partner-cards";
import ProcessSteps from "@/components/process-steps";
import FaqSection from "@/components/faq-section";
import CtaBanner from "@/components/cta-banner";
import Reveal from "@/components/reveal";
import LatestInsights from "@/components/blog/latest-insights";
import { DEFAULT_LOCALE, getMessages, localizedHref, type Locale } from "@/lib/i18n";

export function HomeContent({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const messages = getMessages(locale);

  return (
    <main>
      <HeroSlideshow locale={locale} />
      <MetricsStrip locale={locale} />

      <section className="bg-paper">
        <div className="max-w-content mx-auto grid gap-12 px-5 py-20 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-28">
          <Reveal>
            <Collage locale={locale} />
            <Link href={localizedHref(locale, "/gallery")} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cobalt transition hover:text-cobalt-ink">
              {messages.nav.gallery} <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </Link>
          </Reveal>
          <Reveal delay={0.08} className="flex flex-col justify-center">
            <h2 className="font-display text-3xl font-semibold text-ink text-balance lg:text-5xl">
              {messages.home.intro.title}
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted">
              {messages.home.intro.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={localizedHref(locale, "/about")} className="inline-flex items-center justify-center gap-2 rounded-full bg-cobalt px-5 py-3 text-sm font-semibold text-white transition hover:bg-cobalt-ink active:translate-y-px">
                {messages.home.intro.aboutCta} <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
              <Link href={localizedHref(locale, "/why")} className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-cobalt hover:text-cobalt active:translate-y-px">
                {messages.home.intro.whyCta} <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-paper-soft">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">
              {messages.home.services.title}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted">
              {messages.home.services.description}
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-12">
            <ServiceCards locale={locale} />
          </Reveal>
        </div>
      </section>

      <ProcessSteps locale={locale} />

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal className="mb-10 max-w-2xl">
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">
              {messages.home.partners.title}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted">
              {messages.home.partners.description}
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <PartnerCards locale={locale} />
          </Reveal>
          <div className="mt-8">
            <Link href={localizedHref(locale, "/partners")} className="inline-flex items-center gap-2 text-sm font-semibold text-cobalt transition hover:text-cobalt-ink">
              {messages.home.partners.detailsCta} <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <LatestInsights locale={locale} />
      <FaqSection locale={locale} />
      <CtaBanner locale={locale} />
    </main>
  );
}
