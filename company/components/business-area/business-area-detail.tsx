import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  EnvelopeSimple,
} from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import BreadcrumbSchema from "@/components/breadcrumb-schema";
import JsonLd from "@/components/json-ld";
import StatusMarker, { type StatusTone } from "@/components/status-marker";
import {
  getBusinessAreas,
  type BusinessArea,
  type BusinessAreaStageStatus,
} from "@/lib/business-areas";
import { businessAreaPath } from "@/lib/business-area-seo";
import { localizedHref } from "@/lib/i18n";
import { SITE, SITE_URL } from "@/lib/site";

/** 색 대신 모양으로 단계 상태를 구분한다. */
const STATUS_TONE: Record<BusinessAreaStageStatus, StatusTone> = {
  verified: "filled",
  "in-development": "half",
  "case-review": "hollow",
};

const REFERENCE_LINKS = {
  "japan-caregiver": {
    href: "/visa/tokutei-ginou-kaigo",
    ko: "특정기능 개호 비자 안내",
    ja: "特定技能「介護」の在留資格案内",
  },
  "japan-hospitality": {
    href: "/visa/tokutei-ginou-shukuhaku",
    ko: "특정기능 숙박 비자 안내",
    ja: "特定技能「宿泊」の在留資格案内",
  },
  "korea-study": {
    href: "/visa/d-2-d-4",
    ko: "한국 유학 D-2·D-4 안내",
    ja: "韓国留学 D-2・D-4 の案内",
  },
  "korea-welding": {
    href: "/visa/e-7",
    ko: "한국 전문인력 E-7 안내",
    ja: "韓国の専門人材 E-7 案内",
  },
} as const;

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

function RoutePanel({ area }: { area: BusinessArea }) {
  return (
    <div role="group" aria-label={area.ui.routeAriaLabel}>
      <div className="flex items-end gap-4 sm:gap-6">
        <div>
          <p className="text-meta text-white/70">{area.ui.originLabel}</p>
          <p className="mt-1.5 flex items-baseline gap-2">
            <span className="text-3xl font-[750] tracking-[-0.04em]">{area.route.originCode}</span>
            <span className="text-sm font-semibold">{area.route.originName}</span>
          </p>
        </div>
        <ArrowRight size={18} className="mb-2 shrink-0 text-white/70" aria-hidden="true" />
        <div>
          <p className="text-meta text-white/70">{area.ui.destinationLabel}</p>
          <p className="mt-1.5 flex items-baseline gap-2">
            <span className="text-3xl font-[750] tracking-[-0.04em]">{area.route.destinationCode}</span>
            <span className="text-sm font-semibold">{area.route.destinationName}</span>
          </p>
        </div>
      </div>
      <p className="mt-3 text-meta text-white/80">
        {area.ui.modelLabel} · <span className="font-semibold text-white">{area.route.model}</span>
      </p>
    </div>
  );
}

function StageLegend({ area }: { area: BusinessArea }) {
  const statuses: BusinessAreaStageStatus[] = ["verified", "in-development", "case-review"];

  return (
    <div className="mt-10 border-t border-white/15 pt-6">
      <p className="text-meta text-white/70">{area.ui.frameworkLegendLabel}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {statuses.map((status) => (
          <div key={status}>
            <StatusMarker tone={STATUS_TONE[status]} className="text-white">{area.ui.status[status].label}</StatusMarker>
            <p className="mt-1.5 text-[12px] leading-5 text-white/65">{area.ui.status[status].description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BusinessAreaDetail({ area }: { area: BusinessArea; locale?: "ko" | "ja" }) {
  const otherAreas = getBusinessAreas(area.locale).filter((item) => item.slug !== area.slug);
  const canonicalPath = businessAreaPath(area.locale, area.slug);
  const pageUrl = `${SITE_URL}${canonicalPath}`;
  const mailHref = `mailto:${SITE.email}?subject=${encodeURIComponent(area.cta.subject)}`;
  const reference = REFERENCE_LINKS[area.slug];
  const referenceLabel = reference[area.locale];
  const isJapanese = area.locale === "ja";
  const heroImage = area.evidence.images[0];
  // 개념 이미지는 실제 현장으로 오해되지 않도록 히어로 배경에 쓰지 않는다.
  const heroPhoto = heroImage?.kind === "field-record" ? heroImage : null;

  return (
    <main lang={area.locale} className={isJapanese ? "[word-break:normal] [overflow-wrap:anywhere]" : "[word-break:keep-all]"}>
      <BreadcrumbSchema name={area.hero.title} path={area.href} locale={area.locale} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          "@id": `${pageUrl}#service`,
          url: pageUrl,
          name: area.meta.title,
          description: area.meta.description,
          serviceType: area.schema.serviceType,
          provider: { "@id": `${SITE_URL}/#organization` },
          areaServed: { "@type": "Country", name: area.schema.areaServed },
          audience: area.schema.audienceType.map((audienceType) => ({ "@type": "Audience", audienceType })),
          availableLanguage: ["ko", "ja"],
        }}
      />

      <section
        data-hero-overlay
        className={`surface-dark relative isolate flex flex-col justify-end overflow-hidden bg-night pt-32 text-white sm:pt-40 ${heroPhoto ? "min-h-[clamp(38rem,86svh,54rem)]" : "min-h-[clamp(32rem,70svh,44rem)]"}`}
      >
        {heroPhoto ? (
          <>
            <Image
              src={heroPhoto.src}
              alt={heroPhoto.alt}
              fill
              priority
              sizes="100vw"
              style={{ objectPosition: heroPhoto.objectPosition }}
              className="-z-20 object-cover"
            />
            <div className="hero-scrim absolute inset-0 -z-10" aria-hidden="true" />
            {/* 글이 많은 히어로라 위쪽 라벨까지 대비를 확보하도록 한 겹 더 덮는다. */}
            <div className="absolute inset-0 -z-10 bg-night/30" aria-hidden="true" />
          </>
        ) : null}

        <div className="page-wrap pb-12 lg:pb-16">
          <Link href={localizedHref(area.locale, "/services")} className="inline-flex min-h-11 items-center gap-2 text-meta font-semibold text-white/85 underline-offset-4 transition hover:text-white hover:underline">
            <ArrowLeft size={14} weight="bold" aria-hidden="true" />
            {area.ui.businessAreasLabel}
          </Link>

          <p className="eyebrow mt-8 text-white">{area.hero.eyebrow}</p>
          <h1 className="mt-5 max-w-[16em] text-display text-balance">{area.hero.title}</h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-[1.85] text-white/90">{area.hero.lead}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={mailHref} data-seo-event="cta_clicked" data-content-id={`business-area-${area.slug}`} data-locale={area.locale} className="pill pill-light">
              <EnvelopeSimple size={17} weight="bold" aria-hidden="true" /> {area.cta.label}
            </a>
            <a href="#delivery-framework" className="pill pill-outline-light">
              {area.framework.title} <ArrowDown size={15} weight="bold" aria-hidden="true" />
            </a>
          </div>

          <div className="mt-10 grid gap-6 border-t border-white/30 pt-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
            <RoutePanel area={area} />
            {heroPhoto ? (
              <p className="text-meta text-white/80 lg:text-right">
                <span className="font-semibold text-white">{area.ui.imageKind[heroPhoto.kind]}</span>
                <span aria-hidden="true"> · </span>
                {heroPhoto.caption}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-paper">
        <div className="page-wrap grid gap-6 py-10 lg:grid-cols-12 lg:items-center lg:gap-8 lg:py-12">
          <div className="lg:col-span-4">
            <p className="eyebrow text-ink">{area.ui.audienceEyebrow}</p>
            <p className="mt-2 text-sm font-semibold text-muted">{area.audience.label}</p>
          </div>
          <ul className="flex flex-wrap gap-2.5 lg:col-span-8">
            {area.audience.items.map((item) => (
              <li key={item} className="border border-ink/20 bg-surface px-4 py-2.5 text-sm font-semibold text-ink">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-paper py-section">
        <div className="page-wrap grid gap-8 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <p className="text-meta tabular-nums text-muted" aria-hidden="true">01</p>
            <p className="eyebrow mt-4 text-ink">{area.proposition.label}</p>
          </div>
          <div className="lg:col-span-8">
            <h2 className="max-w-3xl text-headline text-balance text-ink">{area.proposition.title}</h2>
            <p className="mt-6 max-w-3xl text-[16px] leading-[1.85] text-muted">{area.proposition.body}</p>
          </div>
        </div>
      </section>

      <section id="delivery-framework" className="surface-dark scroll-mt-28 bg-night py-section text-white">
        <div className="page-wrap">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:sticky lg:top-32 lg:col-span-5 lg:self-start">
              <p className="eyebrow text-white">{area.ui.frameworkEyebrow}</p>
              <h2 className="mt-5 text-headline text-balance">{area.framework.title}</h2>
              <p className="mt-6 text-description text-white/75">{area.framework.description}</p>
              <StageLegend area={area} />
            </div>

            <ol className="border-t border-white/30 lg:col-span-6 lg:col-start-7">
              {area.stages.map((stage, index) => (
                <li key={stage.title} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 border-b border-white/15 py-8 lg:py-10">
                  <span className="pt-1.5 text-meta tabular-nums text-white/65" aria-hidden="true">{twoDigits(index + 1)}</span>
                  <div className="min-w-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-title text-white">{stage.title}</h3>
                      <StatusMarker tone={STATUS_TONE[stage.status]} className="shrink-0 text-white">{area.ui.status[stage.status].label}</StatusMarker>
                    </div>
                    <p className="mt-4 text-description text-white/75">{stage.description}</p>
                    <ul className="mt-5 grid gap-2 sm:grid-cols-3">
                      {stage.points.map((point) => (
                        <li key={point} className="border-t border-white/15 pt-2 text-[12px] leading-5 text-white/80">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="bg-paper py-section">
        <div className="page-wrap">
          <div className="grid gap-7 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-5">
              <p className="eyebrow text-ink">{area.ui.evidenceEyebrow}</p>
              <h2 className="mt-5 text-headline text-balance text-ink">{area.evidence.title}</h2>
            </div>
            <p className="self-end text-description text-muted lg:col-span-6 lg:col-start-7">{area.evidence.description}</p>
          </div>

          <div className="mt-12 grid gap-x-8 gap-y-10 md:grid-cols-2">
            {area.evidence.images.map((item, index) => (
              <figure key={item.src} className={index === 0 ? "" : "md:mt-16"}>
                <div className="relative aspect-[4/3] overflow-hidden bg-image">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    sizes="(min-width: 1440px) 660px, (min-width: 768px) 50vw, 100vw"
                    style={{ objectPosition: item.objectPosition }}
                    className={`object-cover ${item.kind === "illustrative" ? "grayscale" : ""}`}
                  />
                </div>
                <figcaption className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-3">
                  <span className="text-sm font-semibold text-ink">{item.caption}</span>
                  <span className="shrink-0 text-meta font-semibold text-muted">{area.ui.imageKind[item.kind]}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-paper py-section">
        <div className="page-wrap grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-6">
            <p className="eyebrow text-ink">{area.ui.checkpointsEyebrow}</p>
            <h2 className="mt-5 text-subhead text-balance text-ink">{area.checkpoints.title}</h2>
            <p className="mt-4 text-description text-muted">{area.checkpoints.description}</p>
            <ol className="mt-8 border-t border-line">
              {area.checkpoints.items.map((item, index) => (
                <li key={item} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 border-b border-line py-4 text-[15px] leading-relaxed text-ink">
                  <span className="pt-0.5 text-meta tabular-nums text-muted" aria-hidden="true">{twoDigits(index + 1)}</span>
                  {item}
                </li>
              ))}
            </ol>
          </div>

          <aside className="flex flex-col border-t-2 border-ink bg-paper-soft p-8 lg:col-span-5 lg:col-start-8 lg:p-10">
            <p className="eyebrow text-ink">{area.ui.noticeLabel}</p>
            <h2 className="mt-4 text-title text-balance text-ink">{area.notice.title}</h2>
            <p className="mt-4 text-description text-gray-700">{area.notice.body}</p>
            <Link href={localizedHref(area.locale, reference.href)} className="mt-auto inline-flex min-h-11 items-center gap-2 pt-8 text-sm font-semibold text-ink underline decoration-ink/35 underline-offset-4 transition hover:decoration-ink">
              {referenceLabel}
              <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </section>

      <section className="border-t border-line bg-paper py-section">
        <div className="page-wrap">
          <p className="eyebrow text-ink">{area.ui.relatedEyebrow}</p>
          <h2 className="mt-5 text-subhead text-ink">{area.relatedLabel}</h2>
          <div className="mt-10 grid gap-x-8 md:grid-cols-3">
            {otherAreas.map((item) => (
              <Link key={item.slug} href={localizedHref(area.locale, item.href)} className="group border-t border-ink py-6">
                <p className="text-meta font-semibold text-muted">
                  {item.route.originCode} → {item.route.destinationCode}
                </p>
                <h3 className="mt-4 text-lg font-bold leading-snug tracking-[-0.02em] text-ink underline-offset-4 group-hover:underline">{item.hero.title}</h3>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{item.hero.summary}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink">
                  {area.ui.detailsLabel} <ArrowUpRight size={15} weight="bold" className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paper pb-section">
        <div className="page-wrap">
          <div className="surface-dark grid gap-8 bg-night px-6 py-12 text-white sm:px-10 lg:grid-cols-12 lg:items-end lg:gap-8 lg:px-14 lg:py-16">
            <div className="lg:col-span-8">
              <p className="eyebrow text-white">{area.cta.eyebrow}</p>
              <h2 className="mt-5 max-w-3xl text-headline text-balance">{area.cta.title}</h2>
              <p className="mt-5 max-w-2xl text-description text-white/80">{area.cta.description}</p>
            </div>
            <div className="lg:col-span-4 lg:text-right">
              <a href={mailHref} data-seo-event="cta_clicked" data-content-id={`business-area-${area.slug}`} data-locale={area.locale} className="pill pill-lg pill-light">
                <span className="inline-flex items-center gap-2">
                  <EnvelopeSimple size={18} weight="bold" aria-hidden="true" /> {area.ui.emailLabel}
                </span>
                <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
              </a>
              <p className="mt-3 text-xs text-white/70">{SITE.email}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
