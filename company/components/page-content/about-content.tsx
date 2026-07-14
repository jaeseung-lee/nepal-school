import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import PageBanner from "@/components/page-banner";
import BreadcrumbSchema from "@/components/breadcrumb-schema";
import Collage from "@/components/collage";
import MetricsStrip from "@/components/metrics-strip";
import CtaBanner from "@/components/cta-banner";
import Reveal from "@/components/reveal";
import { DEFAULT_LOCALE, getMessages, localizedHref, type Locale } from "@/lib/i18n";

const chip =
  "inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-cobalt hover:text-cobalt";

export function AboutContent({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const copy = getMessages(locale).pages.about;

  return (
    <main>
      <BreadcrumbSchema name={copy.banner.crumb} path="/about" locale={locale} />
      <PageBanner
        locale={locale}
        eyebrow={copy.banner.eyebrow}
        context={copy.banner.context}
        title={copy.banner.title}
        desc={copy.banner.description}
        crumb={copy.banner.crumb}
        imageAlt={copy.banner.alt}
        bgImage="/kv/banner-about.webp"
      />

      <section className="bg-paper">
        <div className="max-w-content mx-auto grid gap-12 px-5 py-20 lg:grid-cols-[1fr_1.05fr] lg:px-8 lg:py-28">
          <Reveal className="flex flex-col justify-center">
            <h2 className="font-display text-3xl font-semibold text-ink text-balance lg:text-5xl">
              {copy.main.title}
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted">
              {copy.main.paragraphs.first}
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
              {copy.main.paragraphs.second}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={localizedHref(locale, "/services")} className={chip}>
                {copy.main.servicesCta} <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
              <Link href={localizedHref(locale, "/partners")} className={chip}>
                {copy.main.partnersCta} <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
              <Link href={localizedHref(locale, "/why")} className={chip}>
                {copy.main.whyCta} <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <Collage locale={locale} />
          </Reveal>
        </div>
      </section>

      <MetricsStrip locale={locale} />
      <CtaBanner locale={locale} />
    </main>
  );
}
