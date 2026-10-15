import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import PageBanner from "@/components/page-banner";
import { getKeyVisualPhoto, KEY_VISUALS } from "@/lib/key-visuals";
import { SECTION_LABELS } from "@/lib/section-labels";
import BreadcrumbSchema from "@/components/breadcrumb-schema";
import CtaBanner from "@/components/cta-banner";
import { DEFAULT_LOCALE, getMessages, localizedHref, type Locale } from "@/lib/i18n";

const PRINCIPLES = [
  { key: "partnership" },
  { key: "regulation", href: "/visa" },
  { key: "network" },
  { key: "process" },
] as const;

const REFUSAL_KEYS = ["fees", "abuse", "misinformation"] as const;

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

export default function WhyContent({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const copy = getMessages(locale).pages.why;
  const detailPhoto = getKeyVisualPhoto(KEY_VISUALS.pages.whyDetail, locale);

  return (
    <main>
      <BreadcrumbSchema name={copy.banner.crumb} path="/why" locale={locale} />
      <PageBanner
        locale={locale}
        eyebrow={copy.banner.eyebrow}
        context={copy.banner.context}
        title={copy.banner.title}
        desc={copy.banner.description}
        crumb={copy.banner.crumb}
        photo={KEY_VISUALS.pages.why}
        label={SECTION_LABELS.pages.why}
      />

      <section aria-labelledby="why-title" className="bg-paper py-section">
        <div className="page-wrap grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:sticky lg:top-32 lg:col-span-5 lg:self-start">
            <p className="text-meta tabular-nums text-muted" aria-hidden="true">01</p>
            <h2 id="why-title" className="mt-4 text-headline text-balance text-ink">{copy.main.title}</h2>
            <p className="mt-6 max-w-xl text-description text-muted">{copy.main.description}</p>
            <div className="relative mt-10 aspect-[4/3] overflow-hidden bg-image">
              <Image
                src={detailPhoto.src}
                alt={detailPhoto.alt}
                fill
                sizes="(min-width: 1440px) 560px, (min-width: 1024px) 40vw, 100vw"
                style={{ objectPosition: detailPhoto.position }}
                className="object-cover"
              />
            </div>
          </div>

          <ol className="border-t border-line lg:col-span-6 lg:col-start-7">
            {PRINCIPLES.map((item, index) => {
              const principle = copy.main.principles[item.key];
              const href = "href" in item ? item.href : undefined;
              const linkLabel = item.key === "regulation" ? copy.main.principles.regulation.linkLabel : undefined;
              return (
                <li key={item.key} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 border-b border-line py-8">
                  <span className="pt-1 text-meta tabular-nums text-muted" aria-hidden="true">{twoDigits(index + 1)}</span>
                  <div>
                    <h3 className="text-title text-ink">{principle.title}</h3>
                    <p className="mt-3 text-description text-muted">{principle.description}</p>
                    {href ? (
                      <Link
                        href={localizedHref(locale, href)}
                        className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink underline decoration-ink/35 underline-offset-4 hover:decoration-ink"
                      >
                        {linkLabel} <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section aria-labelledby="refusals-title" className="border-t border-line bg-paper-soft py-section">
        <div className="page-wrap">
          <div className="grid gap-6 border-t-2 border-ink pt-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-5">
              <p className="text-meta tabular-nums text-muted" aria-hidden="true">02</p>
              <h2 id="refusals-title" className="mt-4 text-subhead text-balance text-ink">{copy.refusals.title}</h2>
            </div>
            <p className="text-description text-muted lg:col-span-6 lg:col-start-7 lg:pt-8">{copy.refusals.description}</p>
          </div>
          <ul className="mt-12 grid border-t border-line md:grid-cols-3">
            {REFUSAL_KEYS.map((key, index) => (
              <li
                key={key}
                className="border-b border-line py-7 text-[15px] font-semibold leading-relaxed text-ink md:border-b-0 md:px-8 md:first:pl-0 md:last:pr-0 md:[&:not(:first-child)]:border-l"
              >
                <span className="mb-3 block text-meta font-medium tabular-nums text-muted" aria-hidden="true">{twoDigits(index + 1)}</span>
                {copy.refusals.items[key]}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBanner locale={locale} />
    </main>
  );
}
