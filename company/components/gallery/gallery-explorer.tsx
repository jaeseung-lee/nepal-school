"use client";

import { ArrowsOutSimple } from "@phosphor-icons/react";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import GalleryLightbox from "@/components/gallery/gallery-lightbox";
import type { GalleryCategory } from "@/lib/gallery";

export interface GalleryDisplayItem {
  id: string;
  src: string;
  category: GalleryCategory;
  order: number;
  alt: string;
  caption: string;
}

export interface GalleryLabels {
  allCategories: string;
  categories: Record<GalleryCategory, string>;
  filterLabel: string;
  viewImage: string;
  previous: string;
  next: string;
  close: string;
  empty: string;
  dialogLabel: string;
}

interface GalleryExplorerProps {
  items: GalleryDisplayItem[];
  labels: GalleryLabels;
}

const CATEGORIES: GalleryCategory[] = ["training", "facilities", "visits", "meetings"];

const CARD_LAYOUTS = [
  {
    column: "col-span-2 sm:col-span-2 lg:col-span-7",
    ratio: "aspect-[4/3] lg:aspect-[16/10]",
    sizes: "(min-width: 1024px) 57vw, (min-width: 640px) 66vw, 100vw",
  },
  {
    column: "col-span-1 sm:col-span-1 lg:col-span-5",
    ratio: "aspect-[3/4] lg:aspect-[4/3]",
    sizes: "(min-width: 1024px) 42vw, (min-width: 640px) 33vw, 50vw",
  },
  {
    column: "col-span-1 sm:col-span-1 lg:col-span-4",
    ratio: "aspect-[3/4] lg:aspect-[4/5]",
    sizes: "(min-width: 1024px) 34vw, (min-width: 640px) 33vw, 50vw",
  },
  {
    column: "col-span-1 sm:col-span-2 lg:col-span-8",
    ratio: "aspect-[4/3] lg:aspect-[16/9]",
    sizes: "(min-width: 1024px) 66vw, (min-width: 640px) 66vw, 50vw",
  },
  {
    column: "col-span-2 sm:col-span-2 lg:col-span-6",
    ratio: "aspect-[4/3] lg:aspect-[3/2]",
    sizes: "(min-width: 1024px) 50vw, (min-width: 640px) 66vw, 100vw",
  },
  {
    column: "col-span-1 sm:col-span-1 lg:col-span-3",
    ratio: "aspect-square lg:aspect-[3/4]",
    sizes: "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw",
  },
] as const;

function sequence(value: number) {
  return String(value).padStart(2, "0");
}

function imagePosition(index: number, total: number) {
  return `${sequence(index + 1)} / ${sequence(total)}`;
}

export default function GalleryExplorer({ items, labels }: GalleryExplorerProps) {
  const orderedItems = useMemo(
    () => [...items].sort((first, second) => first.order - second.order),
    [items],
  );
  const [activeCategory, setActiveCategory] = useState<GalleryCategory | "all">("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const filteredItems = useMemo(
    () => activeCategory === "all"
      ? orderedItems
      : orderedItems.filter((item) => item.category === activeCategory),
    [activeCategory, orderedItems],
  );
  const lightboxItems = useMemo(
    () => filteredItems.map((item) => ({
      ...item,
      meta: labels.categories[item.category],
    })),
    [filteredItems, labels.categories],
  );

  const openLightbox = (item: GalleryDisplayItem, trigger: HTMLButtonElement) => {
    lastTriggerRef.current = trigger;
    setActiveId(item.id);
  };

  return (
    <>
      <div className="border-y border-line bg-paper-soft">
        <div className="max-w-content mx-auto flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {labels.filterLabel}
          </p>
          <div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1 sm:justify-end" role="toolbar" aria-label={labels.filterLabel}>
            <button
              type="button"
              aria-pressed={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition motion-reduce:transition-none ${
                activeCategory === "all"
                  ? "border-cobalt bg-cobalt text-white"
                  : "border-line bg-white text-ink hover:border-cobalt hover:text-cobalt"
              }`}
            >
              {labels.allCategories}
            </button>
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(category)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition motion-reduce:transition-none ${
                  activeCategory === category
                    ? "border-cobalt bg-cobalt text-white"
                    : "border-line bg-white text-ink hover:border-cobalt hover:text-cobalt"
                }`}
              >
                {labels.categories[category]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-12 sm:py-16 lg:px-8 lg:py-20">
          {filteredItems.length ? (
            <div className="grid grid-cols-2 items-start gap-x-3 gap-y-9 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-11 lg:grid-cols-12 lg:gap-x-5 lg:gap-y-14">
              {filteredItems.map((item, index) => {
                const layout = CARD_LAYOUTS[index % CARD_LAYOUTS.length];
                const categoryLabel = labels.categories[item.category];
                const position = imagePosition(index, filteredItems.length);

                return (
                  <article key={item.id} className={layout.column}>
                    <button
                      type="button"
                      onClick={(event) => openLightbox(item, event.currentTarget)}
                      aria-label={`${labels.viewImage}: ${categoryLabel}, ${position}. ${item.caption}`}
                      className="group block w-full text-left"
                    >
                      <div className={`relative overflow-hidden bg-gray-200 ${layout.ratio}`}>
                        <Image
                          src={item.src}
                          alt={item.alt}
                          fill
                          sizes={layout.sizes}
                          className="object-cover transition duration-500 ease-out group-hover:scale-[1.025] motion-reduce:transition-none"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-primary-deepest/68 via-primary-deepest/0 to-transparent opacity-75 transition duration-300 group-hover:opacity-100 motion-reduce:transition-none" aria-hidden="true" />
                        <span className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-3 p-3 text-[11px] font-semibold uppercase tracking-[0.13em] text-white sm:p-4">
                          <span>{categoryLabel}</span>
                          <span>{position}</span>
                        </span>
                        <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-paper/92 text-cobalt opacity-0 shadow-sm transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none sm:right-4 sm:top-4" aria-hidden="true">
                          <ArrowsOutSimple size={17} weight="bold" />
                        </span>
                      </div>
                      <span className="mt-3 block max-w-[46rem] text-sm leading-relaxed text-muted sm:text-[0.95rem]">
                        {item.caption}
                      </span>
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="border-l-4 border-cobalt bg-white px-5 py-6 text-base leading-relaxed text-muted">
              {labels.empty}
            </p>
          )}
        </div>
      </section>

      <GalleryLightbox
        items={lightboxItems}
        activeId={activeId}
        onActiveIdChange={setActiveId}
        returnFocusRef={lastTriggerRef}
        labels={{
          dialogLabel: labels.dialogLabel,
          previous: labels.previous,
          next: labels.next,
          close: labels.close,
        }}
      />
    </>
  );
}
