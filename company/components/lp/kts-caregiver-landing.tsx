"use client";

import {
  ArrowDown,
  ArrowRight,
  BowlFood,
  ChatsCircle,
  DownloadSimple,
  EnvelopeSimple,
  GlobeHemisphereWest,
  HandSoap,
  Handshake,
  Heartbeat,
  MapPin,
  SealCheck,
  ShieldCheck,
  WheelchairMotion,
  type Icon,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import KtsCaregiverGallery from "@/components/lp/kts-caregiver-gallery";
import {
  LP_V1_COPY,
  LP_V1_PDF_HREFS,
  LP_V1_SOURCE_URL,
  type LpV1DomainIcon,
  type LpV1Locale,
} from "@/lib/lp-v1-copy";

const DOMAIN_ICONS: Record<LpV1DomainIcon, Icon> = {
  ethics: ShieldCheck,
  nutrition: BowlFood,
  hygiene: HandSoap,
  mobility: WheelchairMotion,
  equipment: Heartbeat,
  psychosocial: ChatsCircle,
};

const PHOTO_PATHS = {
  lab: "/lp/v1/caregiver-lab.webp",
} as const;

export default function KtsCaregiverLanding({ locale }: { locale: LpV1Locale }) {
  const reduceMotion = useReducedMotion();
  const copy = LP_V1_COPY[locale];
  const heroProgram = locale === "ja" ? LP_V1_COPY.ja.hero : null;
  const pdfHref = LP_V1_PDF_HREFS[locale];
  const pdfEventId = `lp-v1-pdf-${locale}`;

  const scrollToCurriculum = () => {
    document.getElementById("curriculum")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  const skipToContent = () => {
    const main = document.getElementById("lp-main");
    main?.focus();
    main?.scrollIntoView({ behavior: "auto", block: "start" });
  };

  const mailHref = `mailto:joongwoohrd@gmail.com?subject=${encodeURIComponent(copy.contact.mailSubject)}`;
  const partnershipMailHref = `mailto:joongwoohrd@gmail.com?subject=${encodeURIComponent(copy.partnership.mailSubject)}`;

  return (
    <>
      <button type="button" onClick={skipToContent} className="fixed left-4 top-4 z-[100] min-h-11 -translate-y-24 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white focus:translate-y-0">
        {copy.skipToContent}
      </button>

      <main id="lp-main" tabIndex={-1} lang={locale} className={locale === "ja" ? "[word-break:normal] [overflow-wrap:anywhere]" : "[word-break:keep-all]"}>
        <section className="relative isolate overflow-hidden bg-paper pb-16 pt-8 sm:pb-20 sm:pt-12 lg:pb-28 lg:pt-16">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-cobalt-soft/80 blur-3xl" />
            <div className="absolute -left-32 bottom-0 h-64 w-64 rounded-full bg-clay/5 blur-3xl" />
          </div>

          <div className="mx-auto grid max-w-content items-center gap-10 px-5 lg:grid-cols-[0.78fr_1.22fr] lg:gap-14 lg:px-8">
            <div className="relative z-10">
              <p className="text-[11px] font-bold tracking-[0.18em] text-cobalt sm:text-xs">{copy.hero.eyebrow}</p>
              {heroProgram ? (
                <div className="mt-4 border-l-2 border-clay pl-3">
                  <p className="text-sm font-semibold leading-6 text-ink">{heroProgram.programLabel}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{heroProgram.programBasis}</p>
                </div>
              ) : null}
              <h1
                className={`${heroProgram ? "mt-4" : "mt-5"} max-w-2xl font-display font-semibold text-ink ${
                  locale === "ja"
                    ? "text-[clamp(2.3rem,10vw,3.4rem)] leading-[1.02] tracking-[-0.045em]"
                    : "text-[clamp(2.7rem,7.5vw,5.7rem)] leading-[0.98] tracking-[-0.055em]"
                }`}
              >
                {copy.hero.titleLines.map((line, index) => (
                  <span key={line} className={`block ${index === 1 ? "mt-2" : ""} ${index > 0 ? "text-cobalt" : ""} ${locale === "ja" ? "whitespace-nowrap" : ""}`}>
                    {line}
                  </span>
                ))}
              </h1>
              <p className="mt-7 max-w-xl text-[15px] leading-7 text-muted sm:text-base sm:leading-8">{copy.hero.description}</p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={scrollToCurriculum}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-white transition-colors hover:bg-cobalt"
                >
                  {copy.hero.curriculumCta} <ArrowDown size={17} weight="bold" aria-hidden="true" />
                </button>
                <a
                  href={pdfHref}
                  download
                  data-seo-event="cta_clicked"
                  data-content-id={pdfEventId}
                  data-locale={locale}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-line bg-white px-6 text-sm font-semibold text-ink transition-colors hover:border-cobalt hover:text-cobalt"
                >
                  <DownloadSimple size={18} weight="bold" aria-hidden="true" /> {copy.hero.pdfCta}
                </a>
              </div>
            </div>

            <figure className="relative mx-auto w-full max-w-3xl lg:mx-0">
              <div className="relative aspect-[5/4] overflow-hidden rounded-[28px] border border-line bg-gray-100 shadow-2xl shadow-cobalt-ink/10 sm:rounded-[34px]">
                <Image
                  src={PHOTO_PATHS.lab}
                  alt={copy.hero.imageAlt}
                  fill
                  priority
                  sizes="(min-width: 1180px) 680px, (min-width: 1024px) 58vw, 100vw"
                  className="object-cover object-[43%_50%]"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/55 to-transparent" aria-hidden="true" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 text-white sm:bottom-6 sm:left-6 sm:right-6">
                  <figcaption className="text-xs font-semibold tracking-[0.08em] sm:text-sm">{copy.hero.imageCaption}</figcaption>
                  <span className="shrink-0 rounded-full border border-white/35 bg-ink/25 px-3 py-1.5 text-[10px] font-semibold backdrop-blur-sm">{copy.hero.evidenceLabel}</span>
                </div>
              </div>
              <span className="absolute -left-2 -top-2 h-8 w-8 border-l-2 border-t-2 border-clay sm:-left-4 sm:-top-4" aria-hidden="true" />
              <span className="absolute -bottom-2 -right-2 h-8 w-8 border-b-2 border-r-2 border-clay sm:-bottom-4 sm:-right-4" aria-hidden="true" />
            </figure>
          </div>
        </section>

        <section aria-label={copy.facts.ariaLabel} className="border-y border-line bg-paper-soft">
          <div className="mx-auto max-w-content px-5 lg:px-8">
            <div className="grid sm:grid-cols-3">
              {copy.facts.items.map((fact, index) => (
                <dl key={fact.label} className={`py-7 sm:px-7 sm:py-9 ${index > 0 ? "border-t border-line sm:border-l sm:border-t-0" : ""}`}>
                  <dt className="text-xs font-semibold tracking-[0.08em] text-muted">{fact.label}</dt>
                  <dd className="mt-2 font-display text-4xl font-semibold tracking-[-0.045em] text-ink lg:text-5xl">{fact.value}</dd>
                  <dd className="mt-2 text-sm text-muted">{fact.note}</dd>
                </dl>
              ))}
            </div>
            <div className="flex flex-col gap-2 border-t border-line py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold text-cobalt">{copy.facts.evaluationLabel}</span>
              <span className="text-muted">{copy.facts.evaluation}</span>
            </div>
          </div>
        </section>

        <section aria-labelledby="partnership-title" className="bg-paper py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-content px-5 lg:px-8">
            <div className="relative overflow-hidden rounded-[28px] bg-cobalt-ink px-6 py-8 text-white shadow-2xl shadow-cobalt-ink/15 sm:rounded-[34px] sm:px-9 sm:py-10 lg:px-12 lg:py-12">
              <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full border-[52px] border-white/[0.045]" aria-hidden="true" />
              <div className="pointer-events-none absolute -bottom-28 left-[38%] h-64 w-64 rounded-full bg-cobalt/30 blur-3xl" aria-hidden="true" />

              <div className="relative grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.18em] text-white/55 sm:text-xs">{copy.partnership.eyebrow}</p>
                  <div className="mt-5 inline-flex min-h-9 items-center gap-2 rounded-full border border-clay/55 bg-clay/20 px-3.5 py-2 text-xs font-bold text-[#F4CDBA]">
                    <SealCheck size={18} weight="fill" aria-hidden="true" />
                    {copy.partnership.badge}
                  </div>
                  <h2 id="partnership-title" className="mt-5 max-w-xl font-display text-3xl font-semibold leading-[1.13] tracking-[-0.035em] sm:text-4xl lg:text-[2.7rem]">
                    {copy.partnership.title}
                  </h2>
                  <p className="mt-5 max-w-xl text-[15px] leading-7 text-white/72 sm:text-base sm:leading-8">{copy.partnership.description}</p>
                  <a
                    href={partnershipMailHref}
                    data-seo-event="cta_clicked"
                    data-content-id="lp-v1-mou-partnership"
                    data-jurisdiction="NP"
                    data-locale={locale}
                    className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-cobalt transition-colors hover:bg-cobalt-soft sm:px-6"
                  >
                    <EnvelopeSimple size={18} weight="bold" aria-hidden="true" /> {copy.partnership.cta}
                  </a>
                </div>

                <div>
                  <div role="group" aria-label={copy.partnership.rolesAriaLabel} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-stretch">
                    <div className="rounded-[22px] border border-white/15 bg-white/[0.08] p-5 backdrop-blur-sm sm:p-6">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                        <ShieldCheck size={24} weight="duotone" aria-hidden="true" />
                      </span>
                      <p className="mt-5 text-[10px] font-bold tracking-[0.16em] text-white/50">{copy.partnership.school.label}</p>
                      <h3 className="mt-2 font-display text-xl font-semibold leading-snug tracking-[-0.02em]">{copy.partnership.school.name}</h3>
                      <p className="mt-3 text-sm leading-6 text-white/67">{copy.partnership.school.role}</p>
                    </div>

                    <div className="flex items-center justify-center py-1 sm:px-1 sm:py-0">
                      <div className="flex flex-wrap items-center justify-center gap-2 text-[#F4CDBA] sm:w-[72px] sm:flex-col sm:gap-1.5">
                        <span className="h-px w-8 bg-clay/65 sm:h-8 sm:w-px" aria-hidden="true" />
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-clay/55 bg-clay/20">
                          <Handshake size={24} weight="duotone" aria-hidden="true" />
                        </span>
                        <span className="h-px w-8 bg-clay/65 sm:h-8 sm:w-px" aria-hidden="true" />
                        <span className="basis-full text-center text-[9px] font-bold leading-4 tracking-[0.06em] text-[#F4CDBA]/80">{copy.partnership.connector}</span>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-cobalt-soft/25 bg-cobalt/35 p-5 backdrop-blur-sm sm:p-6">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                        <GlobeHemisphereWest size={24} weight="duotone" aria-hidden="true" />
                      </span>
                      <p className="mt-5 text-[10px] font-bold tracking-[0.16em] text-white/50">{copy.partnership.joongwoo.label}</p>
                      <h3 className="mt-2 font-display text-xl font-semibold leading-snug tracking-[-0.02em]">{copy.partnership.joongwoo.name}</h3>
                      <p className="mt-3 text-sm leading-6 text-white/67">{copy.partnership.joongwoo.role}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[18px] border border-white/12 bg-black/10 px-4 py-4 sm:px-5">
                    <div className="flex items-start gap-3">
                      <SealCheck className="mt-0.5 shrink-0 text-[#F4CDBA]" size={20} weight="duotone" aria-hidden="true" />
                      <div>
                        <p className="text-[10px] font-bold tracking-[0.14em] text-white/50">{copy.partnership.basisLabel}</p>
                        <p className="mt-1.5 text-sm font-semibold leading-6 text-white/90">{copy.partnership.basis}</p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-white/45">{copy.partnership.note}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="curriculum" aria-labelledby="curriculum-title" className="scroll-mt-24 bg-paper py-20 sm:py-24 lg:py-32">
          <div className="mx-auto max-w-content px-5 lg:px-8">
            <div className="grid gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
              <div>
                <p className="text-xs font-bold tracking-[0.2em] text-cobalt">{copy.curriculum.eyebrow}</p>
                <h2 id="curriculum-title" className="mt-4 max-w-xl font-display text-3xl font-semibold leading-[1.12] tracking-[-0.035em] text-ink sm:text-4xl lg:text-5xl">
                  {copy.curriculum.title}
                </h2>
              </div>
              <p className="max-w-2xl self-end text-[15px] leading-7 text-muted sm:text-base sm:leading-8">{copy.curriculum.description}</p>
            </div>

            <ul aria-label={copy.curriculum.domainLabel} className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {copy.curriculum.domains.map((domain) => {
                const Icon = DOMAIN_ICONS[domain.icon];
                return (
                  <li key={domain.title} className="group flex min-h-[282px] flex-col rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/[0.03] transition-colors hover:border-cobalt/35 sm:p-7">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt transition group-hover:bg-cobalt group-hover:text-white">
                      <Icon size={25} weight="duotone" aria-hidden="true" />
                    </span>
                    <h3 className="mt-6 font-display text-xl font-semibold leading-snug tracking-[-0.02em] text-ink">{domain.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted">{domain.description}</p>
                    <p className="mt-auto border-t border-line pt-5 text-[11px] font-bold tracking-[0.09em] text-cobalt">{domain.detail}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section aria-labelledby="workflow-title" className="overflow-hidden bg-cobalt-ink py-20 text-white sm:py-24 lg:py-28">
          <div className="mx-auto grid max-w-content gap-14 px-5 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20 lg:px-8">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-xs font-bold tracking-[0.2em] text-white/60">{copy.workflow.eyebrow}</p>
              <h2 id="workflow-title" className="mt-5 max-w-lg font-display text-3xl font-semibold leading-[1.12] tracking-[-0.035em] sm:text-4xl lg:text-5xl">
                {copy.workflow.title}
              </h2>
              <p className="mt-6 max-w-xl text-[15px] leading-7 text-white/72 sm:text-base sm:leading-8">{copy.workflow.description}</p>
              <p className="mt-7 border-l-2 border-clay pl-4 text-sm leading-6 text-white/60">{copy.workflow.note}</p>
            </div>

            <ol aria-label={copy.workflow.stepLabel} className="relative pl-9 sm:pl-12">
              <span className="absolute bottom-8 left-[15px] top-8 w-px bg-white/20 sm:left-[19px]" aria-hidden="true" />
              {copy.workflow.steps.map((step, index) => (
                <motion.li
                  key={step.title}
                  initial={reduceMotion ? false : { opacity: 0, x: 18 }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.45, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="relative border-b border-white/15 py-7 first:pt-0 last:border-b-0 last:pb-0 sm:py-8"
                >
                  <span className="absolute -left-9 top-8 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-cobalt-ink text-[10px] font-bold text-white sm:-left-12 sm:h-10 sm:w-10 sm:text-xs" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="grid gap-2 sm:grid-cols-[0.55fr_1.45fr] sm:items-baseline sm:gap-6">
                    <h3 className="font-display text-2xl font-semibold tracking-[-0.025em]">{step.title}</h3>
                    <p className="text-sm leading-6 text-white/65 sm:text-[15px]">{step.description}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        <KtsCaregiverGallery locale={locale} copy={copy.gallery} />

        <section aria-labelledby="completion-title" className="bg-paper py-20 sm:py-24 lg:py-28">
          <div className="mx-auto grid max-w-content gap-8 px-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:px-8">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-cobalt">{copy.completion.eyebrow}</p>
              <h2 id="completion-title" className="mt-4 max-w-2xl font-display text-3xl font-semibold leading-[1.12] tracking-[-0.035em] text-ink sm:text-4xl">{copy.completion.title}</h2>
              <p className="mt-5 max-w-2xl text-[15px] leading-7 text-muted sm:text-base">{copy.completion.description}</p>

              <dl className="mt-9 divide-y divide-line border-y border-line">
                {copy.completion.items.map((item) => (
                  <div key={item.label} className="grid gap-1 py-5 sm:grid-cols-[0.35fr_0.65fr] sm:gap-5">
                    <dt className="text-sm font-semibold text-cobalt">{item.label}</dt>
                    <dd className="text-sm leading-6 text-ink">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <aside className="flex flex-col justify-between rounded-[28px] border border-clay/25 bg-[#F2E7DF] p-7 sm:p-9">
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/65 text-clay">
                  <ShieldCheck size={26} weight="duotone" aria-hidden="true" />
                </span>
                <h3 className="mt-7 font-display text-2xl font-semibold text-ink">{copy.completion.disclaimerTitle}</h3>
                <p className="mt-4 text-sm leading-7 text-gray-700">{copy.completion.disclaimer}</p>
              </div>
              <a
                href={LP_V1_SOURCE_URL}
                target="_blank"
                rel="noreferrer"
                data-seo-event="official_source_clicked"
                data-content-id="kts-caregiver-source"
                data-jurisdiction="NP"
                data-locale={locale}
                className="mt-8 inline-flex min-h-11 items-center gap-2 py-2 text-sm font-semibold text-clay underline decoration-clay/35 underline-offset-4 transition hover:text-gold-deep"
              >
                {copy.contact.sourceLabel} <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </a>
            </aside>
          </div>
        </section>

        <section aria-labelledby="contact-title" className="bg-paper pb-7 sm:pb-10">
          <div className="mx-auto max-w-content px-5 lg:px-8">
            <div className="relative overflow-hidden rounded-[28px] bg-cobalt px-6 py-10 text-white shadow-xl shadow-cobalt-ink/10 sm:px-10 sm:py-12 lg:rounded-[34px] lg:px-14 lg:py-16">
              <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full border-[56px] border-white/[0.06]" aria-hidden="true" />
              <div className="relative grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
                <div>
                  <p className="text-xs font-bold tracking-[0.2em] text-white/80">{copy.contact.eyebrow}</p>
                  <h2 id="contact-title" className="mt-4 max-w-xl font-display text-3xl font-semibold leading-[1.12] tracking-[-0.035em] sm:text-4xl lg:text-5xl">{copy.contact.title}</h2>
                  <p className="mt-6 max-w-xl text-[15px] leading-7 text-white/75 sm:text-base sm:leading-8">{copy.contact.description}</p>
                  <div className="mt-7 flex flex-wrap gap-2">
                    {copy.contact.inquiryTypes.map((type) => (
                      <span key={type} className="rounded-full border border-white/25 bg-white/[0.07] px-3 py-1.5 text-xs font-semibold text-white/85">{type}</span>
                    ))}
                  </div>
                  <a
                    href={mailHref}
                    data-seo-event="cta_clicked"
                    data-content-id="lp-v1-contact"
                    data-jurisdiction="NP"
                    data-locale={locale}
                    className="mt-9 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-cobalt transition-colors hover:bg-cobalt-soft"
                  >
                    <EnvelopeSimple size={18} weight="bold" aria-hidden="true" /> {copy.contact.cta}
                  </a>
                </div>

                <address className="grid content-start gap-4 not-italic">
                  <div className="rounded-[22px] border border-white/20 bg-white/[0.08] p-5 backdrop-blur-sm">
                    <p className="flex items-center gap-2 text-xs font-semibold text-white/80"><EnvelopeSimple size={16} weight="duotone" aria-hidden="true" /> {copy.contact.emailLabel}</p>
                    <a
                      href="mailto:joongwoohrd@gmail.com"
                      data-seo-event="cta_clicked"
                      data-content-id="lp-v1-contact"
                      data-jurisdiction="NP"
                      data-locale={locale}
                      className="mt-1 inline-flex min-h-11 items-center break-all text-sm font-semibold text-white underline decoration-white/30 underline-offset-4 sm:text-base"
                    >
                      joongwoohrd@gmail.com
                    </a>
                  </div>
                  <div className="rounded-[22px] border border-white/20 bg-white/[0.08] p-5 backdrop-blur-sm">
                    <p className="flex items-center gap-2 text-xs font-semibold text-white/80"><MapPin size={16} weight="duotone" aria-hidden="true" /> {copy.contact.schoolLabel}</p>
                    <p className="mt-2 text-sm leading-6 text-white">{copy.contact.schoolAddress}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/20 bg-white/[0.08] p-5 backdrop-blur-sm">
                    <p className="flex items-center gap-2 text-xs font-semibold text-white/80"><MapPin size={16} weight="duotone" aria-hidden="true" /> {copy.contact.officeLabel}</p>
                    <p className="mt-2 text-sm leading-6 text-white">{copy.contact.officeAddress}</p>
                  </div>
                </address>
              </div>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
