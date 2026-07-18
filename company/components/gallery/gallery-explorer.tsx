"use client";

import { ArrowLeft, ArrowRight, ArrowsOutSimple, X } from "@phosphor-icons/react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
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
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef(false);
  const wasOpenRef = useRef(false);
  const swipeStartRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const dialogTitleId = useId();
  const dialogLabelId = useId();
  const dialogMetaId = useId();

  const filteredItems = useMemo(
    () => activeCategory === "all"
      ? orderedItems
      : orderedItems.filter((item) => item.category === activeCategory),
    [activeCategory, orderedItems],
  );
  const activeIndex = activeId ? filteredItems.findIndex((item) => item.id === activeId) : -1;
  const activeItem = activeIndex >= 0 ? filteredItems[activeIndex] : null;
  const isLightboxOpen = activeItem !== null;

  const closeLightbox = useCallback(() => {
    if (!activeId) return;
    restoreFocusRef.current = true;
    setActiveId(null);
  }, [activeId]);

  const moveLightbox = useCallback((direction: -1 | 1) => {
    const nextIndex = activeIndex + direction;

    if (activeIndex < 0 || nextIndex < 0 || nextIndex >= filteredItems.length) return;
    setActiveId(filteredItems[nextIndex].id);
  }, [activeIndex, filteredItems]);

  useEffect(() => {
    if (!isLightboxOpen) return;

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveLightbox(-1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveLightbox(1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeItem, closeLightbox, moveLightbox]);

  useEffect(() => {
    if (!activeItem) {
      wasOpenRef.current = false;

      if (restoreFocusRef.current) {
        const trigger = lastTriggerRef.current;
        restoreFocusRef.current = false;
        window.requestAnimationFrame(() => trigger?.focus());
      }

      return;
    }

    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    }
  }, [isLightboxOpen]);

  useEffect(() => {
    if (!isLightboxOpen) return;

    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [isLightboxOpen]);

  const openLightbox = (item: GalleryDisplayItem, trigger: HTMLButtonElement) => {
    lastTriggerRef.current = trigger;
    setActiveId(item.id);
  };

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement;

    if (event.shiftKey && current === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // Keep controls clickable: pointer capture retargets the following click to
    // this swipe surface, which would otherwise prevent the arrow buttons from
    // receiving their onClick event.
    if (event.target instanceof Element && event.target.closest("button")) return;

    swipeStartRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const finishSwipe = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || start.pointerId !== event.pointerId) return;

    const horizontalDistance = event.clientX - start.x;
    const verticalDistance = event.clientY - start.y;
    const threshold = 44;

    if (
      Math.abs(horizontalDistance) < threshold
      || Math.abs(horizontalDistance) < Math.abs(verticalDistance) * 1.25
    ) return;

    moveLightbox(horizontalDistance < 0 ? 1 : -1);
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
                          priority={index < 2}
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

      {activeItem && (
        <div
          className="fixed inset-0 z-[80] bg-primary-deepest/95 p-3 text-white backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeLightbox();
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={labels.dialogLabel}
            aria-labelledby={`${dialogLabelId} ${dialogMetaId} ${dialogTitleId}`}
            tabIndex={-1}
            onKeyDown={handleDialogKeyDown}
            className="mx-auto flex h-full max-w-[1480px] flex-col"
          >
            <span id={dialogLabelId} className="sr-only">{labels.dialogLabel}</span>
            <div className="flex shrink-0 items-center justify-between gap-4 pb-3 sm:pb-4">
              <p id={dialogMetaId} className="text-xs font-semibold uppercase tracking-[0.16em] text-white/72">
                {labels.categories[activeItem.category]} <span className="mx-2 text-white/35">/</span> {imagePosition(activeIndex, filteredItems.length)}
              </p>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeLightbox}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/35 bg-white/8 px-4 text-sm font-semibold text-white transition hover:bg-white/16 motion-reduce:transition-none"
              >
                <X size={18} weight="bold" aria-hidden="true" />
                {labels.close}
              </button>
            </div>

            <div
              className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center overflow-hidden"
              style={{ touchAction: "pan-y" }}
              onPointerDown={handlePointerDown}
              onPointerUp={finishSwipe}
              onPointerCancel={() => { swipeStartRef.current = null; }}
            >
              <Image
                src={activeItem.src}
                alt={activeItem.alt}
                fill
                priority
                sizes="100vw"
                className="object-contain select-none"
              />
              <button
                type="button"
                onClick={() => moveLightbox(-1)}
                disabled={activeIndex <= 0}
                aria-label={labels.previous}
                className="absolute left-0 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/35 bg-primary-deepest/55 text-white transition hover:bg-white/16 disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none sm:left-3 sm:h-14 sm:w-14"
              >
                <ArrowLeft size={23} weight="bold" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => moveLightbox(1)}
                disabled={activeIndex >= filteredItems.length - 1}
                aria-label={labels.next}
                className="absolute right-0 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/35 bg-primary-deepest/55 text-white transition hover:bg-white/16 disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none sm:right-3 sm:h-14 sm:w-14"
              >
                <ArrowRight size={23} weight="bold" aria-hidden="true" />
              </button>
            </div>

            <div className="shrink-0 pt-4 sm:pt-5">
              <h2 id={dialogTitleId} className="max-w-4xl text-base font-medium leading-relaxed text-white sm:text-lg">
                {activeItem.caption}
              </h2>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
