import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import { getBusinessAreas } from "@/lib/business-areas";
import { getMessages, localizedHref, type Locale } from "@/lib/i18n";
import { getKeyVisualPhoto, KEY_VISUALS } from "@/lib/key-visuals";

const LEGACY_SERVICES = [
  { key: "training", href: "/services", visual: KEY_VISUALS.legacyServices.training, market: "NEPAL" },
  { key: "koreaVisa", href: "/visa", visual: KEY_VISUALS.legacyServices.koreaVisa, market: "KOREA" },
  { key: "japanSsw", href: "/visa/tokutei-ginou", visual: KEY_VISUALS.legacyServices.japanSsw, market: "JAPAN" },
] as const;

/** 카드 제목 링크가 카드 전체를 덮고, 포커스 링도 카드 테두리에 그린다. */
const STRETCHED_LINK =
  "decoration-1 underline-offset-4 after:absolute after:inset-0 group-hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-ink";

function BusinessAreaCards({ locale }: { locale: "ko" | "ja" }) {
  const areas = getBusinessAreas(locale);

  return (
    <ul className="grid gap-x-8 gap-y-14 md:grid-cols-2">
      {areas.map((area) => {
        const image = area.evidence.images[0];
        const illustrative = image.kind === "illustrative";

        return (
          <li key={area.slug} className="group relative">
            <div className="relative aspect-[5/4] overflow-hidden bg-image">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 1440px) 680px, (min-width: 768px) 50vw, 100vw"
                style={{ objectPosition: image.objectPosition }}
                className={`object-cover transition duration-700 ease-out group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none ${illustrative ? "grayscale" : ""}`}
              />
            </div>
            <div className="mt-5 flex items-center justify-between gap-4 text-meta text-muted">
              <p>
                <span aria-hidden="true" className="font-semibold text-ink">
                  {area.route.originCode} → {area.route.destinationCode}
                </span>
                <span className="sr-only">
                  {area.ui.originLabel} {area.route.originName}, {area.ui.destinationLabel} {area.route.destinationName}
                </span>
                <span aria-hidden="true"> · </span>
                {area.route.model}
              </p>
              <p className="shrink-0">{area.ui.imageKind[image.kind]}</p>
            </div>
            <h3 className="mt-4 text-title text-balance text-ink">
              <Link
                href={localizedHref(locale, area.href)}
                aria-label={`${area.ui.destinationLabel} ${area.route.destinationName}, ${area.ui.modelLabel} ${area.route.model}. ${area.hero.title}. ${area.ui.detailsLabel}`}
                className={STRETCHED_LINK}
              >
                {area.hero.title}
              </Link>
            </h3>
            <p className="mt-3 max-w-[34rem] text-description text-muted">{area.hero.summary}</p>
            <p aria-hidden="true" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink">
              {area.ui.detailsLabel}
              <ArrowUpRight size={15} weight="bold" className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function LegacyServiceCards({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const serviceCards = messages.home.serviceCards;

  return (
    <ul className="grid gap-x-8 gap-y-14 md:grid-cols-3">
      {LEGACY_SERVICES.map((service, index) => {
        const copy = serviceCards[service.key];
        const photo = getKeyVisualPhoto(service.visual, locale);

        return (
          <li key={service.key} className="group relative">
            <div className="relative aspect-[5/4] overflow-hidden bg-image">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(min-width: 1440px) 450px, (min-width: 768px) 33vw, 100vw"
                style={{ objectPosition: photo.position }}
                className="object-cover transition duration-700 ease-out group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
              />
            </div>
            <p className="mt-5 text-meta text-muted" lang="en">
              <span className="tabular-nums">{String(index + 1).padStart(2, "0")}</span> · {service.market}
            </p>
            <h3 className="mt-4 text-title text-balance text-ink">
              <Link href={localizedHref(locale, service.href)} className={STRETCHED_LINK}>
                {copy.title}
              </Link>
            </h3>
            <p className="mt-3 text-description text-muted">{copy.desc}</p>
            <p aria-hidden="true" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink">
              {messages.common.details}
              <ArrowUpRight size={15} weight="bold" className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export default function ServiceCards({ locale = "ko" }: { locale?: Locale }) {
  if (locale === "ko" || locale === "ja") {
    return <BusinessAreaCards locale={locale} />;
  }

  return <LegacyServiceCards locale={locale} />;
}
