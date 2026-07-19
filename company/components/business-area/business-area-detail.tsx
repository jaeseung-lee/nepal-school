import {
  ArrowDown,
  ArrowRight,
  CheckCircle,
  EnvelopeSimple,
  FileText,
  MapPin,
  ShieldCheck,
  Wrench,
} from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import BreadcrumbSchema from "@/components/breadcrumb-schema";
import JsonLd from "@/components/json-ld";
import {
  getBusinessAreas,
  type BusinessArea,
  type BusinessAreaStageStatus,
  type BusinessAreaTheme,
} from "@/lib/business-areas";
import { businessAreaPath } from "@/lib/business-area-seo";
import { localizedHref } from "@/lib/i18n";
import { SITE, SITE_URL } from "@/lib/site";

const THEME: Record<
  BusinessAreaTheme,
  {
    text: string;
    surface: string;
    solid: string;
    dark: string;
    ring: string;
    wash: string;
  }
> = {
  cobalt: {
    text: "text-cobalt",
    surface: "bg-cobalt-soft",
    solid: "bg-cobalt",
    dark: "bg-cobalt-ink",
    ring: "border-cobalt/25",
    wash: "bg-cobalt/10",
  },
  clay: {
    text: "text-clay",
    surface: "bg-[#F2E7DF]",
    solid: "bg-clay",
    dark: "bg-[#542F22]",
    ring: "border-clay/25",
    wash: "bg-clay/10",
  },
  ink: {
    text: "text-ink",
    surface: "bg-gray-100",
    solid: "bg-ink",
    dark: "bg-[#101216]",
    ring: "border-ink/20",
    wash: "bg-ink/10",
  },
};

const STATUS_STYLE: Record<BusinessAreaStageStatus, { dot: string; badge: string }> = {
  verified: { dot: "bg-cobalt", badge: "border-cobalt/25 bg-cobalt-soft text-cobalt" },
  "in-development": { dot: "bg-clay", badge: "border-clay/25 bg-[#F2E7DF] text-clay" },
  "case-review": { dot: "bg-gray-500", badge: "border-line bg-paper-soft text-gray-700" },
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

function RoutePanel({ area }: { area: BusinessArea }) {
  const theme = THEME[area.theme];

  return (
    <div aria-label={area.ui.routeAriaLabel} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-y border-line py-5 sm:gap-5">
      <div>
        <p className="text-[10px] font-bold tracking-[0.15em] text-muted">{area.ui.originLabel}</p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className={`font-display text-3xl font-semibold tracking-[-0.04em] ${theme.text}`}>{area.route.originCode}</span>
          <span className="text-sm font-semibold text-ink">{area.route.originName}</span>
        </p>
      </div>
      <div className="flex min-w-16 items-center" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <ArrowRight size={18} weight="bold" className={theme.text} />
      </div>
      <div className="text-right">
        <p className="text-[10px] font-bold tracking-[0.15em] text-muted">{area.ui.destinationLabel}</p>
        <p className="mt-2 flex items-baseline justify-end gap-2">
          <span className="text-sm font-semibold text-ink">{area.route.destinationName}</span>
          <span className={`font-display text-3xl font-semibold tracking-[-0.04em] ${theme.text}`}>{area.route.destinationCode}</span>
        </p>
      </div>
      <p className="col-span-3 mt-1 text-center text-xs font-semibold text-muted">
        {area.ui.modelLabel} · <span className="text-ink">{area.route.model}</span>
      </p>
    </div>
  );
}

function StageLegend({ area }: { area: BusinessArea }) {
  const statuses: BusinessAreaStageStatus[] = ["verified", "in-development", "case-review"];

  return (
    <div className="mt-8 rounded-[22px] border border-white/15 bg-white/[0.06] p-5">
      <p className="text-[10px] font-bold tracking-[0.16em] text-white/55">{area.ui.frameworkLegendLabel}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {statuses.map((status) => (
          <div key={status} className="flex items-start gap-2.5">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_STYLE[status].dot}`} aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold text-white">{area.ui.status[status].label}</p>
              <p className="mt-1 text-[11px] leading-5 text-white/55">{area.ui.status[status].description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BusinessAreaDetail({ area }: { area: BusinessArea; locale?: "ko" | "ja" }) {
  const theme = THEME[area.theme];
  const otherAreas = getBusinessAreas(area.locale).filter((item) => item.slug !== area.slug);
  const canonicalPath = businessAreaPath(area.locale, area.slug);
  const pageUrl = `${SITE_URL}${canonicalPath}`;
  const mailHref = `mailto:${SITE.email}?subject=${encodeURIComponent(area.cta.subject)}`;
  const reference = REFERENCE_LINKS[area.slug];
  const referenceLabel = reference[area.locale];
  const isJapanese = area.locale === "ja";

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

      <section className="relative isolate overflow-hidden bg-paper pb-20 pt-8 sm:pb-24 sm:pt-12 lg:pb-28 lg:pt-16">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className={`absolute -right-40 -top-48 h-[32rem] w-[32rem] rounded-full blur-3xl ${theme.wash}`} />
          <div className="absolute -bottom-56 -left-44 h-[30rem] w-[30rem] rounded-full bg-white/80 blur-3xl" />
        </div>

        <div className="mx-auto max-w-content px-5 lg:px-8">
          <Link href={localizedHref(area.locale, "/services")} className={`inline-flex min-h-11 items-center gap-2 text-sm font-semibold transition hover:opacity-70 ${theme.text}`}>
            <ArrowRight size={15} weight="bold" className="rotate-180" aria-hidden="true" />
            {area.ui.businessAreasLabel}
          </Link>

          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16">
            <div>
              <p className={`text-[11px] font-bold tracking-[0.17em] sm:text-xs ${theme.text}`}>{area.hero.eyebrow}</p>
              <h1 className="mt-5 max-w-2xl font-display text-[clamp(2.65rem,6vw,5.2rem)] font-semibold leading-[0.99] tracking-[-0.055em] text-ink">
                {area.hero.title}
              </h1>
              <p className="mt-7 max-w-2xl text-[16px] leading-8 text-muted sm:text-[17px]">{area.hero.lead}</p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href={mailHref} data-seo-event="cta_clicked" data-content-id={`business-area-${area.slug}`} data-locale={area.locale} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition hover:brightness-90 ${theme.solid}`}>
                  <EnvelopeSimple size={18} weight="bold" aria-hidden="true" /> {area.cta.label}
                </a>
                <a href="#delivery-framework" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-line bg-white/85 px-6 text-sm font-semibold text-ink transition hover:border-ink/25">
                  {area.framework.title} <ArrowDown size={16} weight="bold" aria-hidden="true" />
                </a>
              </div>

              <div className="mt-9">
                <RoutePanel area={area} />
              </div>
            </div>

            <figure className="relative mx-auto w-full max-w-3xl lg:mx-0">
              <div className="relative aspect-[5/4] overflow-hidden rounded-[28px] border border-line bg-gray-100 shadow-2xl shadow-ink/10 sm:rounded-[36px]">
                <Image
                  src={area.evidence.images[0].src}
                  alt={area.evidence.images[0].alt}
                  fill
                  priority
                  sizes="(min-width: 1180px) 650px, (min-width: 1024px) 55vw, 100vw"
                  style={{ objectPosition: area.evidence.images[0].objectPosition }}
                  className="object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink/75 via-ink/25 to-transparent" aria-hidden="true" />
                <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white sm:p-7">
                  <span className="text-sm font-semibold">{area.evidence.images[0].caption}</span>
                  <span className="shrink-0 rounded-full border border-white/30 bg-ink/35 px-3 py-1.5 text-[10px] font-semibold backdrop-blur-sm">
                    {area.ui.imageKind[area.evidence.images[0].kind]}
                  </span>
                </figcaption>
              </div>
              <span className={`absolute -left-3 -top-3 h-10 w-10 border-l-2 border-t-2 ${theme.ring}`} aria-hidden="true" />
              <span className={`absolute -bottom-3 -right-3 h-10 w-10 border-b-2 border-r-2 ${theme.ring}`} aria-hidden="true" />
            </figure>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-paper-soft">
        <div className="mx-auto grid max-w-content gap-8 px-5 py-9 lg:grid-cols-[0.62fr_1.38fr] lg:items-center lg:px-8 lg:py-12">
          <div>
            <p className={`text-[10px] font-bold tracking-[0.17em] ${theme.text}`}>{area.ui.audienceEyebrow}</p>
            <p className="mt-2 text-sm font-semibold text-ink">{area.audience.label}</p>
          </div>
          <ul className="flex flex-wrap gap-2.5">
            {area.audience.items.map((item) => (
              <li key={item} className="rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm shadow-ink/[0.03]">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-paper py-20 sm:py-24 lg:py-28">
        <div className="mx-auto grid max-w-content gap-10 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-20 lg:px-8">
          <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${theme.surface} ${theme.text}`}>
            <Wrench size={27} weight="duotone" aria-hidden="true" />
          </div>
          <div>
            <p className={`text-xs font-bold tracking-[0.16em] ${theme.text}`}>{area.proposition.label}</p>
            <h2 className="mt-4 max-w-3xl font-display text-3xl font-semibold leading-[1.12] tracking-[-0.035em] text-ink sm:text-4xl lg:text-5xl">{area.proposition.title}</h2>
            <p className="mt-6 max-w-3xl text-[16px] leading-8 text-muted">{area.proposition.body}</p>
          </div>
        </div>
      </section>

      <section id="delivery-framework" className={`scroll-mt-24 py-20 text-white sm:py-24 lg:py-28 ${theme.dark}`}>
        <div className="mx-auto max-w-content px-5 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-xs font-bold tracking-[0.18em] text-white/60">{area.ui.frameworkEyebrow}</p>
              <h2 className="mt-5 font-display text-3xl font-semibold leading-[1.12] tracking-[-0.035em] sm:text-4xl lg:text-5xl">{area.framework.title}</h2>
              <p className="mt-6 text-[15px] leading-7 text-white/65 sm:text-base sm:leading-8">{area.framework.description}</p>
              <StageLegend area={area} />
            </div>

            <ol className="divide-y divide-white/15 border-y border-white/15">
              {area.stages.map((stage, index) => (
                <li key={stage.title} className="py-8 first:pt-0 lg:py-10 lg:first:pt-0">
                  <div className="flex items-start gap-4 sm:gap-6">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 text-xs font-bold text-white/75">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="font-display text-2xl font-semibold tracking-[-0.025em] text-white">{stage.title}</h3>
                        <span className={`w-fit rounded-full border px-3 py-1.5 text-[10px] font-bold ${STATUS_STYLE[stage.status].badge}`}>
                          {area.ui.status[stage.status].label}
                        </span>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-white/65 sm:text-[15px]">{stage.description}</p>
                      <ul className="mt-5 grid gap-2 sm:grid-cols-3">
                        {stage.points.map((point) => (
                          <li key={point} className="flex items-start gap-2 text-xs leading-5 text-white/75">
                            <CheckCircle size={15} weight="fill" className="mt-0.5 shrink-0 text-white/45" aria-hidden="true" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="bg-paper py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-content px-5 lg:px-8">
          <div className="grid gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
            <div>
              <p className={`text-xs font-bold tracking-[0.18em] ${theme.text}`}>{area.ui.evidenceEyebrow}</p>
              <h2 className="mt-4 font-display text-3xl font-semibold leading-[1.12] tracking-[-0.035em] text-ink sm:text-4xl lg:text-5xl">{area.evidence.title}</h2>
            </div>
            <p className="self-end text-[15px] leading-7 text-muted sm:text-base sm:leading-8">{area.evidence.description}</p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {area.evidence.images.map((item, index) => (
              <figure key={item.src} className={`overflow-hidden rounded-[26px] border border-line bg-surface ${index === 0 ? "md:mt-0" : "md:mt-10"}`}>
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    priority={index === 0}
                    sizes="(min-width: 768px) 50vw, 100vw"
                    style={{ objectPosition: item.objectPosition }}
                    className="object-cover"
                  />
                </div>
                <figcaption className="flex items-center justify-between gap-4 p-5 sm:p-6">
                  <span className="text-sm font-semibold text-ink">{item.caption}</span>
                  <span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold ${item.kind === "field-record" ? "bg-cobalt-soft text-cobalt" : "bg-gray-100 text-gray-700"}`}>
                    {area.ui.imageKind[item.kind]}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paper-soft py-20 sm:py-24">
        <div className="mx-auto grid max-w-content gap-8 px-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-8">
          <div className="rounded-[28px] border border-line bg-white p-7 sm:p-9">
            <p className={`text-xs font-bold tracking-[0.18em] ${theme.text}`}>{area.ui.checkpointsEyebrow}</p>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-[1.15] tracking-[-0.03em] text-ink">{area.checkpoints.title}</h2>
            <p className="mt-4 text-sm leading-7 text-muted">{area.checkpoints.description}</p>
            <ul className="mt-7 divide-y divide-line border-y border-line">
              {area.checkpoints.items.map((item) => (
                <li key={item} className="flex items-start gap-3 py-4 text-sm leading-6 text-ink">
                  <CheckCircle size={18} weight="duotone" className={`mt-0.5 shrink-0 ${theme.text}`} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <aside className={`flex flex-col rounded-[28px] border p-7 sm:p-9 ${theme.surface} ${theme.ring}`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/75 text-ink">
              <ShieldCheck size={26} weight="duotone" aria-hidden="true" />
            </span>
            <p className={`mt-7 text-xs font-bold tracking-[0.16em] ${theme.text}`}>{area.ui.noticeLabel}</p>
            <h2 className="mt-3 font-display text-2xl font-semibold leading-snug text-ink">{area.notice.title}</h2>
            <p className="mt-4 text-sm leading-7 text-gray-700">{area.notice.body}</p>
            <Link href={localizedHref(area.locale, reference.href)} className={`mt-auto inline-flex min-h-11 items-center gap-2 pt-8 text-sm font-semibold underline decoration-current/30 underline-offset-4 transition hover:opacity-70 ${theme.text}`}>
              <FileText size={18} weight="duotone" aria-hidden="true" />
              {referenceLabel}
              <ArrowRight size={15} weight="bold" aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </section>

      <section className="bg-paper py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-content px-5 lg:px-8">
          <p className="text-xs font-bold tracking-[0.18em] text-muted">{area.ui.relatedEyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.035em] text-ink">{area.relatedLabel}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {otherAreas.map((item) => (
              <Link key={item.slug} href={localizedHref(area.locale, item.href)} className="group rounded-[22px] border border-line bg-surface p-6 transition hover:-translate-y-0.5 hover:border-cobalt/30 hover:shadow-lg hover:shadow-ink/[0.05]">
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.13em] text-muted">
                  <MapPin size={14} weight="duotone" aria-hidden="true" />
                  {item.route.originCode} → {item.route.destinationCode}
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold leading-snug text-ink">{item.hero.title}</h3>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{item.hero.summary}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cobalt">
                  {area.ui.detailsLabel} <ArrowRight size={15} weight="bold" className="transition group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paper pb-10 sm:pb-14">
        <div className="mx-auto max-w-content px-5 lg:px-8">
          <div className={`relative overflow-hidden rounded-[30px] px-6 py-10 text-white shadow-xl shadow-ink/10 sm:px-10 sm:py-12 lg:px-14 lg:py-16 ${theme.solid}`}>
            <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border-[52px] border-white/[0.07]" aria-hidden="true" />
            <div className="relative grid gap-8 lg:grid-cols-[1.18fr_0.82fr] lg:items-end">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-white/70">{area.cta.eyebrow}</p>
                <h2 className="mt-4 max-w-3xl font-display text-3xl font-semibold leading-[1.1] tracking-[-0.035em] sm:text-4xl lg:text-5xl">{area.cta.title}</h2>
                <p className="mt-5 max-w-2xl text-[15px] leading-7 text-white/75 sm:text-base">{area.cta.description}</p>
              </div>
              <div className="lg:text-right">
                <a href={mailHref} data-seo-event="cta_clicked" data-content-id={`business-area-${area.slug}`} data-locale={area.locale} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-ink transition hover:bg-paper-soft">
                  <EnvelopeSimple size={18} weight="bold" aria-hidden="true" /> {area.ui.emailLabel}
                </a>
                <p className="mt-3 text-xs text-white/65">{SITE.email}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
