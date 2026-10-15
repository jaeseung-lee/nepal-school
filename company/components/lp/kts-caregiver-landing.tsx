"use client";

import {
  ArrowDown,
  ArrowUpRight,
  DownloadSimple,
  EnvelopeSimple,
} from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";
import Image from "next/image";
import KtsCaregiverGallery from "@/components/lp/kts-caregiver-gallery";
import {
  LP_V1_COPY,
  LP_V1_PDF_HREFS,
  LP_V1_SOURCE_URL,
  type LpV1Locale,
} from "@/lib/lp-v1-copy";
import { SITE } from "@/lib/site";

const PHOTO_PATHS = {
  lab: "/lp/v1/caregiver-lab.webp",
} as const;

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

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

  const mailHref = `mailto:${SITE.email}?subject=${encodeURIComponent(copy.contact.mailSubject)}`;
  const partnershipMailHref = `mailto:${SITE.email}?subject=${encodeURIComponent(copy.partnership.mailSubject)}`;

  return (
    <>
      <button type="button" onClick={skipToContent} className="fixed left-4 top-4 z-[100] min-h-11 -translate-y-24 bg-white px-4 py-2 text-sm font-semibold text-ink focus:translate-y-0">
        {copy.skipToContent}
      </button>

      <main id="lp-main" tabIndex={-1} lang={locale} className={`outline-none ${locale === "ja" ? "[word-break:normal] [overflow-wrap:anywhere]" : "[word-break:keep-all]"}`}>
        <section data-hero-overlay className="surface-dark relative isolate flex min-h-[clamp(38rem,90svh,56rem)] flex-col justify-end overflow-hidden bg-night pt-32 text-white sm:pt-40">
          <Image
            src={PHOTO_PATHS.lab}
            alt={copy.hero.imageAlt}
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover object-[43%_50%]"
          />
          <div className="hero-scrim absolute inset-0 -z-10" aria-hidden="true" />
          {/* 글이 많은 히어로라 위쪽 라벨까지 대비를 확보하도록 한 겹 더 덮는다. */}
          <div className="absolute inset-0 -z-10 bg-night/30" aria-hidden="true" />

          <div className="page-wrap pb-12 lg:pb-16">
            <p className="eyebrow text-white">{copy.hero.eyebrow}</p>
            {heroProgram ? (
              <div className="mt-5 border-l-2 border-white/70 pl-3">
                <p className="text-sm font-semibold leading-6 text-white">{heroProgram.programLabel}</p>
                <p className="mt-1 text-xs leading-5 text-white/90">{heroProgram.programBasis}</p>
              </div>
            ) : null}
            <h1
              className={`${heroProgram ? "mt-5" : "mt-6"} max-w-3xl font-[750] ${
                locale === "ja"
                  ? "text-[clamp(2.3rem,10vw,3.4rem)] leading-[1.08] tracking-[-0.045em]"
                  : "text-display"
              }`}
            >
              {copy.hero.titleLines.map((line, index) => (
                <span key={line} className={`block ${index > 0 ? "text-white/65" : ""} ${locale === "ja" ? "whitespace-nowrap" : ""}`}>
                  {line}
                </span>
              ))}
            </h1>
            <p className="mt-7 max-w-xl text-description text-white/90">{copy.hero.description}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={scrollToCurriculum} className="pill pill-light">
                {copy.hero.curriculumCta} <ArrowDown size={16} weight="bold" aria-hidden="true" />
              </button>
              <a
                href={pdfHref}
                download
                data-seo-event="cta_clicked"
                data-content-id={pdfEventId}
                data-locale={locale}
                className="pill pill-outline-light"
              >
                <DownloadSimple size={17} weight="bold" aria-hidden="true" /> {copy.hero.pdfCta}
              </a>
            </div>

            <p className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-white/30 pt-5 text-meta text-white/80">
              <span>{copy.hero.imageCaption}</span>
              <span className="font-semibold text-white">{copy.hero.evidenceLabel}</span>
            </p>
          </div>
        </section>

        <section aria-label={copy.facts.ariaLabel} className="border-b border-line bg-paper">
          <div className="page-wrap">
            <div className="grid sm:grid-cols-3">
              {copy.facts.items.map((fact, index) => (
                <dl key={fact.label} className={`py-8 sm:py-10 ${index > 0 ? "border-t border-line sm:border-l sm:border-t-0 sm:pl-8" : "sm:pr-8"}`}>
                  <dt className="text-meta text-muted">{fact.label}</dt>
                  <dd className="mt-3 text-[clamp(2.25rem,1.5rem+2vw,3.5rem)] font-[750] leading-none tracking-[-0.045em] text-ink tabular-nums">{fact.value}</dd>
                  <dd className="mt-3 text-sm text-muted">{fact.note}</dd>
                </dl>
              ))}
            </div>
            <div className="flex flex-col gap-2 border-t border-line py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="font-bold text-ink">{copy.facts.evaluationLabel}</span>
              <span className="text-muted">{copy.facts.evaluation}</span>
            </div>
          </div>
        </section>

        <section aria-labelledby="partnership-title" className="surface-dark bg-night py-section text-white">
          <div className="page-wrap grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-8">
            <div className="lg:col-span-5">
              <p className="eyebrow text-white">{copy.partnership.eyebrow}</p>
              <p className="mt-6 inline-flex border border-white/50 px-3 py-1.5 text-xs font-bold text-white">{copy.partnership.badge}</p>
              <h2 id="partnership-title" className="mt-6 max-w-xl text-headline text-balance">
                {copy.partnership.title}
              </h2>
              <p className="mt-6 max-w-xl text-description text-white/80">{copy.partnership.description}</p>
              <a
                href={partnershipMailHref}
                data-seo-event="cta_clicked"
                data-content-id="lp-v1-mou-partnership"
                data-jurisdiction="NP"
                data-locale={locale}
                className="pill pill-light mt-8"
              >
                <EnvelopeSimple size={17} weight="bold" aria-hidden="true" /> {copy.partnership.cta}
              </a>
            </div>

            <div className="lg:col-span-6 lg:col-start-7">
              <div role="group" aria-label={copy.partnership.rolesAriaLabel} className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4">
                <div className="border-t border-white/40 pt-6">
                  <p className="text-meta text-white/65">{copy.partnership.school.label}</p>
                  <h3 className="mt-3 text-title text-white">{copy.partnership.school.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/75">{copy.partnership.school.role}</p>
                </div>

                <div className="flex items-center justify-center sm:w-20 sm:flex-col sm:pt-6">
                  <span className="text-xl text-white/80" aria-hidden="true">↔</span>
                  <span className="ml-3 text-center text-[10px] font-bold leading-4 tracking-[0.06em] text-white/70 sm:ml-0 sm:mt-2">{copy.partnership.connector}</span>
                </div>

                <div className="border-t border-white/40 pt-6">
                  <p className="text-meta text-white/65">{copy.partnership.joongwoo.label}</p>
                  <h3 className="mt-3 text-title text-white">{copy.partnership.joongwoo.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/75">{copy.partnership.joongwoo.role}</p>
                </div>
              </div>

              <div className="mt-10 border-t border-white/15 pt-5">
                <p className="text-meta text-white/65">{copy.partnership.basisLabel}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/90">{copy.partnership.basis}</p>
              </div>
              <p className="mt-5 text-xs leading-5 text-white/65">{copy.partnership.note}</p>
            </div>
          </div>
        </section>

        <section id="curriculum" aria-labelledby="curriculum-title" className="scroll-mt-28 bg-paper py-section">
          <div className="page-wrap">
            <div className="grid gap-7 lg:grid-cols-12 lg:gap-8">
              <div className="lg:col-span-5">
                <p className="eyebrow text-ink">{copy.curriculum.eyebrow}</p>
                <h2 id="curriculum-title" className="mt-5 max-w-xl text-headline text-balance text-ink">
                  {copy.curriculum.title}
                </h2>
              </div>
              <p className="max-w-2xl self-end text-description text-muted lg:col-span-6 lg:col-start-7">{copy.curriculum.description}</p>
            </div>

            <ul aria-label={copy.curriculum.domainLabel} className="mt-14 grid gap-x-8 md:grid-cols-2 lg:grid-cols-3">
              {copy.curriculum.domains.map((domain, index) => (
                <li key={domain.title} className="flex flex-col border-t border-ink py-7">
                  <span className="text-meta tabular-nums text-muted" aria-hidden="true">{twoDigits(index + 1)}</span>
                  <h3 className="mt-4 text-title text-ink">{domain.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{domain.description}</p>
                  <p className="mt-auto pt-6 text-meta font-semibold text-ink">{domain.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="workflow-title" className="surface-dark bg-night py-section text-white">
          <div className="page-wrap grid gap-14 lg:grid-cols-12 lg:gap-8">
            <div className="lg:sticky lg:top-32 lg:col-span-5 lg:self-start">
              <p className="eyebrow text-white">{copy.workflow.eyebrow}</p>
              <h2 id="workflow-title" className="mt-5 max-w-lg text-headline text-balance">
                {copy.workflow.title}
              </h2>
              <p className="mt-6 max-w-xl text-description text-white/80">{copy.workflow.description}</p>
              <p className="mt-7 border-l-2 border-white/60 pl-4 text-sm leading-6 text-white/75">{copy.workflow.note}</p>
            </div>

            <ol aria-label={copy.workflow.stepLabel} className="border-t border-white/30 lg:col-span-6 lg:col-start-7">
              {copy.workflow.steps.map((step, index) => (
                <li key={step.title} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 border-b border-white/15 py-7 sm:py-8">
                  <span className="pt-1.5 text-meta tabular-nums text-white/65" aria-hidden="true">{twoDigits(index + 1)}</span>
                  <div className="grid gap-2 sm:grid-cols-[0.55fr_1.45fr] sm:items-baseline sm:gap-6">
                    <h3 className="text-title text-white">{step.title}</h3>
                    <p className="text-sm leading-6 text-white/75 sm:text-[15px]">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <KtsCaregiverGallery locale={locale} copy={copy.gallery} />

        <section aria-labelledby="completion-title" className="border-t border-line bg-paper py-section">
          <div className="page-wrap grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-6">
              <p className="eyebrow text-ink">{copy.completion.eyebrow}</p>
              <h2 id="completion-title" className="mt-5 max-w-2xl text-subhead text-balance text-ink">{copy.completion.title}</h2>
              <p className="mt-5 max-w-2xl text-description text-muted">{copy.completion.description}</p>

              <dl className="mt-9 border-t border-ink">
                {copy.completion.items.map((item) => (
                  <div key={item.label} className="grid gap-1 border-b border-line py-5 sm:grid-cols-[0.35fr_0.65fr] sm:gap-5">
                    <dt className="text-[13px] text-muted">{item.label}</dt>
                    <dd className="text-sm leading-6 text-ink">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <aside className="flex flex-col justify-between border-t-2 border-ink bg-paper-soft p-8 lg:col-span-5 lg:col-start-8 lg:p-10">
              <div>
                <h3 className="text-title text-ink">{copy.completion.disclaimerTitle}</h3>
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
                className="mt-8 inline-flex min-h-11 items-center gap-2 py-2 text-sm font-semibold text-ink underline decoration-ink/35 underline-offset-4 transition hover:decoration-ink"
              >
                {copy.contact.sourceLabel} <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
              </a>
            </aside>
          </div>
        </section>

        <section aria-labelledby="contact-title" className="bg-paper pb-section">
          <div className="page-wrap">
            <div className="surface-dark grid gap-12 bg-night px-6 py-12 text-white sm:px-10 lg:grid-cols-12 lg:gap-8 lg:px-14 lg:py-16">
              <div className="lg:col-span-6">
                <p className="eyebrow text-white">{copy.contact.eyebrow}</p>
                <h2 id="contact-title" className="mt-5 max-w-xl text-headline text-balance">{copy.contact.title}</h2>
                <p className="mt-6 max-w-xl text-description text-white/80">{copy.contact.description}</p>
                <div className="mt-7 flex flex-wrap gap-2">
                  {copy.contact.inquiryTypes.map((type) => (
                    <span key={type} className="border border-white/30 px-3 py-1.5 text-xs font-semibold text-white/90">{type}</span>
                  ))}
                </div>
                <a
                  href={mailHref}
                  data-seo-event="cta_clicked"
                  data-content-id="lp-v1-contact"
                  data-jurisdiction="NP"
                  data-locale={locale}
                  className="pill pill-light mt-9"
                >
                  <EnvelopeSimple size={17} weight="bold" aria-hidden="true" /> {copy.contact.cta}
                </a>
              </div>

              <address className="border-t border-white/30 not-italic lg:col-span-5 lg:col-start-8">
                <div className="border-b border-white/15 py-5">
                  <p className="text-meta text-white/65">{copy.contact.emailLabel}</p>
                  <a
                    href={`mailto:${SITE.email}`}
                    data-seo-event="cta_clicked"
                    data-content-id="lp-v1-contact"
                    data-jurisdiction="NP"
                    data-locale={locale}
                    className="mt-1 inline-flex min-h-11 items-center break-all text-sm font-semibold text-white underline decoration-white/35 underline-offset-4 hover:decoration-white sm:text-base"
                  >
                    {SITE.email}
                  </a>
                </div>
                <div className="border-b border-white/15 py-5">
                  <p className="text-meta text-white/65">{copy.contact.schoolLabel}</p>
                  <p className="mt-2 text-sm leading-6 text-white">{copy.contact.schoolAddress}</p>
                </div>
                <div className="border-b border-white/15 py-5">
                  <p className="text-meta text-white/65">{copy.contact.officeLabel}</p>
                  <p className="mt-2 text-sm leading-6 text-white">{copy.contact.officeAddress}</p>
                </div>
              </address>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
