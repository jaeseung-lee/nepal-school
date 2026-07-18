import { Handshake, MapPin, SealCheck } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import PageBanner from "@/components/page-banner";
import BreadcrumbSchema from "@/components/breadcrumb-schema";
import PartnerCards from "@/components/partner-cards";
import CtaBanner from "@/components/cta-banner";
import Reveal from "@/components/reveal";
import { DEFAULT_LOCALE, getMessages, type Locale } from "@/lib/i18n";
import { PARTNER_NOTICE } from "@/lib/partner-notice";

const MOU_ITEM_KEYS = ["date", "structure", "partnerRole", "joongwooRole"] as const;

// MOU 체결 5개 기관 — 공식 등록으로 확인된 사실만 게시(로고·미확인 정보 미표기)
const MOU_PARTNERS = [
  {
    key: "richhood",
    icon: Handshake,
  },
  {
    key: "sunkoshi",
    icon: Handshake,
  },
  {
    key: "satyawati",
    icon: Handshake,
  },
  {
    key: "bhairav",
    icon: SealCheck,
  },
  {
    key: "ocean",
    icon: SealCheck,
  },
] as const;

export function PartnersContent({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const copy = getMessages(locale).pages.partners;

  return (
    <main>
      <BreadcrumbSchema name={copy.banner.crumb} path="/partners" locale={locale} />
      <PageBanner
        locale={locale}
        eyebrow={copy.banner.eyebrow}
        context={copy.banner.context}
        title={copy.banner.title}
        desc={copy.banner.description}
        crumb={copy.banner.crumb}
        imageAlt={copy.banner.alt}
        bgImage="/kv/banner-partners.webp"
      />

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <div className="grid overflow-hidden rounded-[32px] border border-line bg-surface shadow-sm shadow-ink/5 lg:grid-cols-[0.95fr_1.1fr]">
              <div className="relative min-h-[320px] bg-gray-100">
                <Image src="/gallery/campus-partnership-meeting.webp" alt={copy.feature.alt} fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
              </div>
              <div className="p-7 lg:p-9">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
                  <Handshake size={26} weight="duotone" aria-hidden="true" />
                </span>
                <h2 className="mt-6 font-display text-3xl font-semibold text-ink lg:text-4xl">
                  {copy.feature.title}
                </h2>
                <p className="mt-5 text-[15px] leading-relaxed text-muted">
                  {copy.feature.description}
                </p>
                <dl className="mt-8 grid gap-4 sm:grid-cols-2">
                  {MOU_ITEM_KEYS.map((key) => {
                    const item = copy.feature.mouItems[key];
                    return (
                    <div key={key} className="rounded-[18px] border border-line bg-paper p-4">
                      <dt className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <SealCheck size={18} className="text-cobalt" weight="duotone" aria-hidden="true" />
                        {item.title}
                      </dt>
                      <dd className="mt-2 text-sm leading-relaxed text-muted">{item.description}</dd>
                    </div>
                    );
                  })}
                </dl>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08} className="mt-16">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-cobalt">{copy.mou.eyebrow}</p>
              <h2 className="mt-4 font-display text-3xl font-semibold text-ink lg:text-4xl">
                {copy.mou.title}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                {copy.mou.description}
              </p>
            </div>
            <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {MOU_PARTNERS.map((partner) => {
                const Icon = partner.icon;
                const partnerCopy = copy.mou.partners[partner.key];
                return (
                  <li
                    key={partner.key}
                    className="flex flex-col rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-paper text-sm font-bold text-cobalt">
                        NP
                      </span>
                      <span className="inline-flex items-center rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold text-cobalt">
                        {partnerCopy.type}
                      </span>
                    </div>
                    <h3 className="mt-5 font-display text-lg font-semibold leading-snug text-ink">
                      {partnerCopy.name}
                    </h3>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                      <MapPin size={16} weight="duotone" className="text-cobalt" aria-hidden="true" />
                      {partnerCopy.location}
                    </p>
                    <p className="mt-4 text-sm leading-relaxed text-muted">{partnerCopy.description}</p>
                    <p className="mt-5 flex items-start gap-1.5 border-t border-line pt-4 text-xs leading-relaxed text-muted">
                      <SealCheck size={15} weight="duotone" className="mt-0.5 shrink-0 text-cobalt" aria-hidden="true" />
                      <span>{partnerCopy.basis}</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </Reveal>

          <Reveal delay={0.08} className="mt-12">
            <PartnerCards locale={locale} />
          </Reveal>

          <Reveal delay={0.1} className="mt-10 rounded-[22px] border border-line bg-paper-soft p-6">
            <h2 className="font-display text-xl font-semibold text-ink">{PARTNER_NOTICE[locale].title}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{PARTNER_NOTICE[locale].body}</p>
            <a href="https://www.moj.go.jp/isa/policies/ssw/nyuukokukanri06_00104.html" target="_blank" rel="noreferrer" data-seo-event="official_source_clicked" data-content-id="partner-listing-limit" data-jurisdiction="JP" data-locale={locale} className="mt-3 inline-flex text-sm font-semibold text-cobalt underline underline-offset-4">{PARTNER_NOTICE[locale].link}</a>
          </Reveal>
        </div>
      </section>

      <CtaBanner locale={locale} />
    </main>
  );
}
