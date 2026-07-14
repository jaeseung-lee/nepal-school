import { CheckCircle, ShieldCheck, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import PageBanner from "@/components/page-banner";
import BreadcrumbSchema from "@/components/breadcrumb-schema";
import CtaBanner from "@/components/cta-banner";
import Reveal from "@/components/reveal";
import { DEFAULT_LOCALE, getMessages, localizedHref, type Locale } from "@/lib/i18n";

const PRINCIPLES = [
  { key: "partnership" },
  { key: "regulation", href: "/visa" },
  { key: "network" },
  { key: "process" },
] as const;

const REFUSAL_KEYS = ["fees", "abuse", "misinformation"] as const;

export default function WhyContent({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const copy = getMessages(locale).pages.why;

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
        imageAlt={copy.banner.alt}
        bgImage="/kv/banner-why.webp"
      />

      <section className="bg-paper">
        <div className="max-w-content mx-auto grid gap-10 px-5 py-20 lg:grid-cols-[0.9fr_1.15fr] lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">{copy.main.title}</h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">{copy.main.description}</p>
            <div className="relative mt-8 min-h-[320px] overflow-hidden rounded-[28px] border border-line bg-gray-100">
              <Image src="/kv/redesign/principles.webp" alt={copy.main.alt} fill sizes="(min-width: 1024px) 430px, 100vw" className="object-cover" />
            </div>
          </Reveal>

          <Reveal delay={0.08} className="grid gap-4">
            {PRINCIPLES.map((item) => {
              const principle = copy.main.principles[item.key];
              const href = "href" in item ? item.href : undefined;
              const linkLabel = item.key === "regulation" ? copy.main.principles.regulation.linkLabel : undefined;
              return (
                <article key={item.key} className="rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5">
                  <div className="flex gap-4">
                    <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
                      <CheckCircle size={22} weight="duotone" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-semibold text-ink">{principle.title}</h3>
                      <p className="mt-2 text-[15px] leading-relaxed text-muted">{principle.description}</p>
                      {href ? (
                        <Link href={localizedHref(locale, href)} className="mt-2 inline-block text-sm font-medium text-cobalt underline underline-offset-2">
                          {linkLabel}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </Reveal>
        </div>
      </section>

      <section className="bg-paper-soft">
        <div className="max-w-content mx-auto px-5 py-16 lg:px-8 lg:py-20">
          <Reveal className="rounded-[28px] border border-line bg-surface p-7 shadow-sm shadow-ink/5 lg:p-9">
            <div className="flex max-w-3xl flex-col gap-4 sm:flex-row">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
                <ShieldCheck size={26} weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">{copy.refusals.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">{copy.refusals.description}</p>
              </div>
            </div>
            <ul className="mt-7 grid gap-3 lg:grid-cols-3">
              {REFUSAL_KEYS.map((key) => (
                <li key={key} className="flex gap-3 rounded-[18px] border border-line bg-paper p-4 text-sm leading-relaxed text-ink">
                  <WarningCircle size={20} className="mt-0.5 shrink-0 text-clay" weight="duotone" aria-hidden="true" />
                  <span>{copy.refusals.items[key]}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <CtaBanner locale={locale} />
    </main>
  );
}
