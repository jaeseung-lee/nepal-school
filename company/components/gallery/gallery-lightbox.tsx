"use client";

import { ArrowLeft, ArrowRight, X } from "@phosphor-icons/react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";

export interface GalleryLightboxItem {
  id: string;
  src: string;
  alt: string;
  caption: string;
  meta?: string;
  objectPosition?: string;
}

export interface GalleryLightboxLabels {
  dialogLabel: string;
  previous: string;
  next: string;
  close: string;
}

interface GalleryLightboxProps {
  items: readonly GalleryLightboxItem[];
  activeId: string | null;
  onActiveIdChange: (activeId: string | null) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  labels: GalleryLightboxLabels;
}

function sequence(value: number) {
  return String(value).padStart(2, "0");
}

function imagePosition(index: number, total: number) {
  return `${sequence(index + 1)} / ${sequence(total)}`;
}

/**
 * Shared, controlled gallery dialog with keyboard, swipe, focus, and scroll
 * management. Keeping it mounted while `activeId` changes lets it restore
 * focus to the exact thumbnail that opened it.
 */
export default function GalleryLightbox({
  items,
  activeId,
  onActiveIdChange,
  returnFocusRef,
  labels,
}: GalleryLightboxProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);
  const swipeStartRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const dialogLabelId = useId();
  const dialogTitleId = useId();
  const dialogMetaId = useId();
  const activeIndex = activeId ? items.findIndex((item) => item.id === activeId) : -1;
  const activeItem = activeIndex >= 0 ? items[activeIndex] : null;
  const isOpen = activeItem !== null;

  const closeLightbox = useCallback(() => {
    if (!activeId) return;
    onActiveIdChange(null);
  }, [activeId, onActiveIdChange]);

  const moveLightbox = useCallback((direction: -1 | 1) => {
    const nextIndex = activeIndex + direction;
    if (activeIndex < 0 || nextIndex < 0 || nextIndex >= items.length) return;
    onActiveIdChange(items[nextIndex].id);
  }, [activeIndex, items, onActiveIdChange]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveLightbox(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveLightbox(1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeLightbox, isOpen, moveLightbox]);

  useEffect(() => {
    if (!activeItem) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        window.requestAnimationFrame(() => returnFocusRef.current?.focus());
      }
      return;
    }

    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    }
  }, [activeItem, returnFocusRef]);

  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

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
    // Pointer capture would retarget the following click and block controls.
    if (event.target instanceof Element && event.target.closest("button")) return;

    swipeStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
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

  if (!activeItem) return null;

  const position = imagePosition(activeIndex, items.length);
  const meta = activeItem.meta ? `${activeItem.meta} / ${position}` : position;

  return (
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
        aria-labelledby={`${dialogLabelId} ${dialogTitleId}`}
        aria-describedby={dialogMetaId}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="mx-auto flex h-full max-w-[1480px] flex-col"
      >
        <span id={dialogLabelId} className="sr-only">{labels.dialogLabel}</span>
        <div className="flex shrink-0 items-center justify-between gap-4 pb-3 sm:pb-4">
          <p id={dialogMetaId} className="text-xs font-semibold uppercase tracking-[0.16em] text-white/72">
            {meta}
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
            sizes="100vw"
            className="select-none object-contain"
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
            disabled={activeIndex >= items.length - 1}
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
  );
}
