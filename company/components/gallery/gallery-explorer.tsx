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

const CATEGORIES: GalleryCategory[] = ["training", "facilities", "visits", "meetings", "interviews"];

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

/** 레퍼런스의 텍스트 탭처럼, 선택된 분류만 굵은 밑줄로 표시한다. */
const FILTER_CLASS =
  "inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-muted decoration-2 underline-offset-[10px] transition hover:text-ink aria-pressed:text-ink aria-pressed:underline motion-reduce:transition-none";

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
      <div className="border-b border-line bg-paper">
        <div className="page-wrap flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-meta text-muted">
            {labels.filterLabel}
          </p>
          <div className="-mx-1 flex max-w-full gap-x-5 overflow-x-auto px-1 sm:justify-end" role="group" aria-label={labels.filterLabel}>
            <button
              type="button"
              aria-pressed={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
              className={FILTER_CLASS}
            >
              {labels.allCategories}
            </button>
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(category)}
                className={FILTER_CLASS}
              >
                {labels.categories[category]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="bg-paper">
        <div className="page-wrap py-12 sm:py-16 lg:py-20">
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
                      className="group block w-full text-left focus-visible:outline-offset-4"
                    >
                      <div className={`relative overflow-hidden bg-image ${layout.ratio}`}>
                        <Image
                          src={item.src}
                          alt={item.alt}
                          fill
                          sizes={layout.sizes}
                          className="object-cover transition duration-500 ease-out group-hover:scale-[1.025] motion-reduce:transition-none"
                        />
                        <span className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-surface text-ink opacity-0 transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none sm:right-4 sm:top-4" aria-hidden="true">
                          <ArrowsOutSimple size={16} />
                        </span>
                      </div>
                      <span className="mt-3 flex items-center justify-between gap-3 text-meta text-muted" aria-hidden="true">
                        <span className="font-semibold text-ink">{categoryLabel}</span>
                        <span className="tabular-nums">{position}</span>
                      </span>
                      {/* 캡션은 사진의 맥락을 알려 주는 본문이라 HTML에 그대로 두고 화면에서만 두 줄로 줄인다 */}
                      <span className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink">{item.caption}</span>
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="border-l-2 border-ink py-2 pl-5 text-description text-muted">
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
