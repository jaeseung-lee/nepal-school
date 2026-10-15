import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import PageBanner from "@/components/page-banner";
import { KEY_VISUALS } from "@/lib/key-visuals";
import { SECTION_LABELS } from "@/lib/section-labels";
import BreadcrumbSchema from "@/components/breadcrumb-schema";
import Collage from "@/components/collage";
import MetricsStrip from "@/components/metrics-strip";
import CtaBanner from "@/components/cta-banner";
import { DEFAULT_LOCALE, getMessages, localizedHref, type Locale } from "@/lib/i18n";

export function AboutContent({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const copy = getMessages(locale).pages.about;
  const links = [
    { href: "/services", label: copy.main.servicesCta },
    { href: "/partners", label: copy.main.partnersCta },
    { href: "/why", label: copy.main.whyCta },
  ];

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
        photo={KEY_VISUALS.pages.about}
        label={SECTION_LABELS.pages.about}
      />

      <section aria-labelledby="about-title" className="bg-paper py-section">
        <div className="page-wrap grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col justify-center lg:col-span-5">
            <p className="text-meta tabular-nums text-muted" aria-hidden="true">01</p>
            <h2 id="about-title" className="mt-4 text-headline text-balance text-ink">
              {copy.main.title}
            </h2>
            <p className="mt-8 max-w-xl text-description text-muted">{copy.main.paragraphs.first}</p>
            <p className="mt-4 max-w-xl text-description text-muted">{copy.main.paragraphs.second}</p>
            <ul className="mt-10 border-t border-line">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={localizedHref(locale, link.href)}
                    className="group flex min-h-14 items-center justify-between gap-4 border-b border-line py-4 text-[15px] font-semibold text-ink"
                  >
                    <span className="underline-offset-4 group-hover:underline">{link.label}</span>
                    <ArrowUpRight size={16} weight="bold" aria-hidden="true" className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <Collage locale={locale} />
          </div>
        </div>
      </section>

      <MetricsStrip locale={locale} />
      <CtaBanner locale={locale} />
    </main>
  );
}
