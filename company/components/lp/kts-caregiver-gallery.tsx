"use client";

import { ArrowRight, ArrowsOutSimple } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import GalleryLightbox from "@/components/gallery/gallery-lightbox";
import { getLpV1GalleryItems, type LpV1GalleryLayout } from "@/lib/lp-v1-gallery";
import type { LP_V1_COPY, LpV1Locale } from "@/lib/lp-v1-copy";

type KtsCaregiverGalleryCopy = (typeof LP_V1_COPY)[LpV1Locale]["gallery"];

interface KtsCaregiverGalleryProps {
  locale: LpV1Locale;
  copy: KtsCaregiverGalleryCopy;
}

type TrainingLayout = {
  cell: string;
  frame: string;
  sizes: string;
};

const TRAINING_LAYOUTS: Record<LpV1GalleryLayout, TrainingLayout> = {
  lead: {
    cell: "col-span-2 lg:col-span-8 lg:row-span-5",
    frame: "aspect-[16/10] lg:aspect-auto",
    sizes: "(min-width: 1180px) 765px, (min-width: 1024px) 66vw, 100vw",
  },
  portrait: {
    cell: "col-span-1 lg:col-span-4 lg:row-span-5",
    frame: "aspect-[3/4] sm:aspect-[4/5] lg:aspect-auto",
    sizes: "(min-width: 1180px) 375px, (min-width: 1024px) 33vw, 50vw",
  },
  wide: {
    cell: "col-span-1 lg:col-span-3 lg:row-span-3",
    frame: "aspect-[3/4] sm:aspect-[4/3] lg:aspect-auto",
    sizes: "(min-width: 1180px) 280px, (min-width: 1024px) 25vw, 50vw",
  },
  standard: {
    cell: "col-span-1 lg:col-span-3 lg:row-span-3",
    frame: "aspect-[4/3] lg:aspect-auto",
    sizes: "(min-width: 1180px) 280px, (min-width: 1024px) 25vw, 50vw",
  },
};

function sequence(value: number) {
  return String(value).padStart(2, "0");
}

export default function KtsCaregiverGallery({ locale, copy }: KtsCaregiverGalleryProps) {
  const items = useMemo(() => getLpV1GalleryItems(locale), [locale]);
  const trainingItems = useMemo(
    () => items.filter((item) => item.group === "training"),
    [items],
  );
  const partnershipItems = useMemo(
    () => items.filter((item) => item.group === "partnership"),
    [items],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const lightboxItems = useMemo(
    () => items.map((item) => ({
      id: item.id,
      src: item.src,
      alt: item.alt,
      caption: item.caption,
      objectPosition: item.objectPosition,
      meta: item.group === "training" ? copy.trainingLabel : copy.partnershipLabel,
    })),
    [copy.partnershipLabel, copy.trainingLabel, items],
  );

  const openLightbox = (id: string, trigger: HTMLButtonElement) => {
    lastTriggerRef.current = trigger;
    setActiveId(id);
  };

  return (
    <section aria-labelledby="gallery-title" className="border-y border-line bg-paper-soft py-20 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-content px-5 lg:px-8">
        <div className="grid gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-cobalt">{copy.eyebrow}</p>
            <h2 id="gallery-title" className="mt-4 max-w-xl font-display text-3xl font-semibold leading-[1.12] tracking-[-0.035em] text-ink sm:text-4xl lg:text-5xl">
              {copy.title}
            </h2>
          </div>
          <div className="flex flex-col items-start justify-end gap-5">
            <p className="max-w-2xl text-[15px] leading-7 text-muted sm:text-base sm:leading-8">
              {copy.description}
            </p>
            <Link
              href={locale === "ja" ? "/ja/gallery" : "/gallery"}
              data-seo-event="cta_clicked"
              data-content-id="lp-v1-full-gallery"
              data-locale={locale}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-cobalt underline decoration-cobalt/30 underline-offset-4 transition-colors hover:text-cobalt-ink motion-reduce:transition-none"
            >
              {copy.fullGallery} <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mt-14 border-t border-line pt-6 sm:mt-16 sm:pt-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cobalt">
                01 · {copy.trainingLabel}
              </p>
              <h3 id="training-evidence-title" className="mt-2 font-display text-2xl font-semibold tracking-[-0.025em] text-ink sm:text-3xl">
                {copy.trainingTitle}
              </h3>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted">{copy.trainingDescription}</p>
          </div>

          <div
            aria-labelledby="training-evidence-title"
            className="mt-7 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 lg:min-h-[920px] lg:grid-cols-12 lg:grid-rows-[repeat(8,minmax(0,1fr))] lg:gap-5"
          >
            {trainingItems.map((item, index) => {
              const layout = TRAINING_LAYOUTS[item.layout];
              const makeLastWideOnMobile = index === trainingItems.length - 1
                ? "col-span-2 sm:col-span-1"
                : "";

              return (
                <article key={item.id} className={`h-full min-h-0 ${layout.cell} ${makeLastWideOnMobile}`}>
                  <button
                    type="button"
                    onClick={(event) => openLightbox(item.id, event.currentTarget)}
                    aria-label={`${copy.viewImage}: ${copy.trainingLabel}, ${sequence(index + 1)} / ${sequence(trainingItems.length)}. ${item.caption}`}
                    className="group flex h-full w-full flex-col text-left"
                  >
                    <span className={`relative block min-h-0 w-full overflow-hidden border border-line bg-gray-100 lg:flex-1 ${layout.frame}`}>
                      <Image
                        src={item.src}
                        alt={item.alt}
                        fill
                        sizes={layout.sizes}
                        style={{ objectPosition: item.objectPosition }}
                        className="object-cover transition duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
                      />
                      <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-primary-deepest/50 to-transparent" aria-hidden="true" />
                      <span className="absolute bottom-3 left-3 rounded-sm border border-white/35 bg-primary-deepest/55 px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-white backdrop-blur-sm sm:bottom-4 sm:left-4">
                        T{sequence(index + 1)}
                      </span>
                      <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-paper/92 text-cobalt opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none sm:right-4 sm:top-4" aria-hidden="true">
                        <ArrowsOutSimple size={17} weight="bold" />
                      </span>
                    </span>
                    <span className="mt-3 flex items-start justify-between gap-3 border-t border-line pt-2 text-sm leading-6 text-muted">
                      <span>{item.caption}</span>
                      <span className="hidden shrink-0 font-mono text-[10px] font-semibold tracking-[0.12em] text-cobalt sm:inline" aria-hidden="true">
                        {item.width}×{item.height}
                      </span>
                    </span>
                  </button>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-20 border-t border-line pt-6 sm:mt-24 sm:pt-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cobalt">
                02 · {copy.partnershipLabel}
              </p>
              <h3 id="partnership-evidence-title" className="mt-2 font-display text-2xl font-semibold tracking-[-0.025em] text-ink sm:text-3xl">
                {copy.partnershipTitle}
              </h3>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted">{copy.partnershipDescription}</p>
          </div>

          <ol
            aria-labelledby="partnership-evidence-title"
            className="mt-7 grid grid-cols-2 border-l border-t border-line bg-line lg:grid-cols-5"
          >
            {partnershipItems.map((item, index) => (
              <li key={item.id} className="min-w-0 border-b border-r border-line bg-paper-soft p-2.5 sm:p-3">
                <button
                  type="button"
                  onClick={(event) => openLightbox(item.id, event.currentTarget)}
                  aria-label={`${copy.viewImage}: ${copy.partnershipLabel}, ${sequence(index + 1)} / ${sequence(partnershipItems.length)}. ${item.caption}`}
                  className="group block h-full w-full text-left"
                >
                  <span className="relative block aspect-[4/3] overflow-hidden bg-gray-100">
                    <Image
                      src={item.src}
                      alt={item.alt}
                      fill
                      sizes="(min-width: 1180px) 220px, (min-width: 1024px) 20vw, 50vw"
                      style={{ objectPosition: item.objectPosition }}
                      className="object-cover transition duration-500 ease-out group-hover:scale-[1.025] motion-reduce:transition-none"
                    />
                    <span className="absolute left-0 top-0 min-w-9 bg-primary-deepest px-2 py-1.5 text-center font-mono text-[10px] font-bold tracking-[0.14em] text-white">
                      {sequence(index + 1)}
                    </span>
                    <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-paper/92 text-cobalt opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none" aria-hidden="true">
                      <ArrowsOutSimple size={15} weight="bold" />
                    </span>
                  </span>
                  <span className="block min-h-[4.75rem] border-t border-line px-0.5 pt-3 text-xs leading-5 text-muted sm:text-[13px]">
                    {item.caption}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <GalleryLightbox
        items={lightboxItems}
        activeId={activeId}
        onActiveIdChange={setActiveId}
        returnFocusRef={lastTriggerRef}
        labels={{
          dialogLabel: copy.dialogLabel,
          previous: copy.previous,
          next: copy.next,
          close: copy.close,
        }}
      />
    </section>
  );
}
