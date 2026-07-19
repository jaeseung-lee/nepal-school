import {
  ArrowRight,
  Briefcase,
  Buildings,
  GraduationCap,
  HandHeart,
  HardHat,
  HouseLine,
  Student,
} from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import { getBusinessAreas } from "@/lib/business-areas";
import { getMessages, localizedHref, type Locale } from "@/lib/i18n";

const SERVICES = [
  {
    key: "training",
    href: "/services",
    image: "/kv/redesign/training.webp",
    icon: GraduationCap,
    featured: true,
  },
  {
    key: "koreaVisa",
    href: "/visa",
    image: "/kv/redesign/korea.webp",
    icon: Briefcase,
    featured: false,
  },
  {
    key: "japanSsw",
    href: "/visa/tokutei-ginou",
    image: "/kv/redesign/japan.webp",
    icon: HouseLine,
    featured: false,
  },
] as const;

const BUSINESS_AREA_ICONS = {
  caregiver: HandHeart,
  hospitality: Buildings,
  study: Student,
  welding: HardHat,
} as const;

const BUSINESS_AREA_THEME = {
  cobalt: {
    icon: "bg-cobalt-soft text-cobalt",
    label: "text-cobalt",
  },
  clay: {
    icon: "bg-clay/10 text-clay",
    label: "text-clay",
  },
  ink: {
    icon: "bg-gray-100 text-ink",
    label: "text-gray-700",
  },
} as const;

function BusinessAreaCards({ locale }: { locale: "ko" | "ja" }) {
  const areas = getBusinessAreas(locale);

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {areas.map((area, index) => {
        const Icon = BUSINESS_AREA_ICONS[area.sector];
        const image = area.evidence.images[0];
        const theme = BUSINESS_AREA_THEME[area.theme];

        return (
          <article
            key={area.slug}
            className="group overflow-hidden rounded-[26px] border border-line bg-surface shadow-sm shadow-ink/[0.04] transition duration-300 hover:-translate-y-1 hover:border-ink/20 hover:shadow-xl hover:shadow-ink/[0.08] focus-within:-translate-y-1 focus-within:border-cobalt motion-reduce:hover:translate-y-0 motion-reduce:focus-within:translate-y-0"
          >
            <Link
              href={localizedHref(locale, area.href)}
              aria-label={`${area.ui.destinationLabel} ${area.route.destinationName}, ${area.ui.modelLabel} ${area.route.model}. ${area.hero.title}. ${area.ui.detailsLabel}`}
              className="flex h-full flex-col"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  priority={index < 2}
                  sizes="(min-width: 1180px) 570px, (min-width: 768px) 50vw, 100vw"
                  style={{ objectPosition: image.objectPosition }}
                  className="object-cover transition duration-700 ease-out group-hover:scale-[1.035] group-focus-within:scale-[1.035] motion-reduce:transform-none"
                />
                <div
                  className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,26,31,0.05)_35%,rgba(24,26,31,0.68)_100%)]"
                  aria-hidden="true"
                />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <div className="flex w-fit items-center gap-2 rounded-full border border-white/25 bg-ink/80 px-3 py-1.5 text-white backdrop-blur-sm">
                    <span className="font-display text-[10px] font-bold tracking-[0.16em] text-white/70">
                      {area.route.destinationCode}
                    </span>
                    <span className="h-3 w-px bg-white/35" aria-hidden="true" />
                    <span className="text-[10px] font-medium text-white/70">{area.ui.destinationLabel}</span>
                    <span className="text-xs font-semibold">{area.route.destinationName}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.icon}`}
                  >
                    <Icon size={21} weight="duotone" aria-hidden="true" />
                  </span>
                  <div>
                    <p className={`text-[10px] font-bold tracking-[0.12em] ${theme.label}`}>
                      {area.ui.modelLabel}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-snug text-ink">
                      {area.route.model}
                    </p>
                  </div>
                </div>

                <h3 className="mt-5 font-display text-2xl font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[1.7rem]">
                  {area.hero.title}
                </h3>
                <p className="mt-4 pb-7 text-[15px] leading-relaxed text-muted">
                  {area.hero.summary}
                </p>

                <span className="mt-auto flex items-center justify-between border-t border-line pt-5 text-sm font-semibold text-ink transition-colors group-hover:text-cobalt group-focus-within:text-cobalt">
                  {area.ui.detailsLabel}
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper-soft transition duration-300 group-hover:translate-x-0.5 group-hover:border-cobalt/25 group-hover:bg-cobalt-soft group-focus-within:translate-x-0.5 group-focus-within:border-cobalt/25 group-focus-within:bg-cobalt-soft motion-reduce:transform-none">
                    <ArrowRight size={16} weight="bold" aria-hidden="true" />
                  </span>
                </span>
              </div>
            </Link>
          </article>
        );
      })}
    </div>
  );
}

function LegacyServiceCards({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const serviceCards = messages.home.serviceCards;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      {SERVICES.map((service) => {
        const Icon = service.icon;
        const copy = serviceCards[service.key];
        return (
          <article
            key={service.key}
            className={
              service.featured
                ? "group relative min-h-[520px] overflow-hidden rounded-[28px] border border-line bg-ink text-white lg:row-span-2"
                : "group grid overflow-hidden rounded-[24px] border border-line bg-surface shadow-sm shadow-ink/5 sm:grid-cols-[0.92fr_1fr]"
            }
          >
            <div className={service.featured ? "absolute inset-0" : "relative min-h-[220px] sm:min-h-full"}>
              <Image
                src={service.image}
                alt={copy.alt}
                fill
                sizes={service.featured ? "(min-width: 1024px) 650px, 100vw" : "(min-width: 1024px) 300px, 100vw"}
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
              />
              {service.featured ? <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(24,26,31,0.86),rgba(24,26,31,0.16)_56%)]" aria-hidden="true" /> : null}
            </div>
            <div className={service.featured ? "relative flex h-full flex-col justify-end p-7 lg:p-9" : "flex flex-col p-6 lg:p-7"}>
              <span className={service.featured ? "mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-cobalt" : "mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt"}>
                <Icon size={24} weight="duotone" aria-hidden="true" />
              </span>
              <h3 className={service.featured ? "font-display text-3xl font-semibold lg:text-5xl" : "font-display text-2xl font-semibold text-ink"}>
                {copy.title}
              </h3>
              <p className={service.featured ? "mt-4 max-w-xl text-base leading-relaxed text-white/78" : "mt-3 text-[15px] leading-relaxed text-muted"}>
                {copy.desc}
              </p>
              <Link href={localizedHref(locale, service.href)} className={service.featured ? "mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-cobalt transition hover:bg-cobalt-soft" : "mt-6 inline-flex w-fit items-center gap-2 text-sm font-semibold text-cobalt transition hover:text-cobalt-ink"}>
                {messages.common.details} <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function ServiceCards({ locale = "ko" }: { locale?: Locale }) {
  if (locale === "ko" || locale === "ja") {
    return <BusinessAreaCards locale={locale} />;
  }

  return <LegacyServiceCards locale={locale} />;
}
