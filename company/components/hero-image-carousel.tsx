"use client";

import { ArrowLeft, ArrowRight, CaretDown, Pause, Play } from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useState, type FocusEvent, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";

const AUTO_ADVANCE_MS = 6_000;
/** 첫 사진(LCP)과 경쟁하지 않도록 나머지 사진은 잠시 뒤에 불러온다. */
const DEFER_SLIDES_MS = 2_000;

export interface HeroImageSlide {
  src: string;
  position?: string;
  caption?: string;
}

export interface HeroImageCarouselLabels {
  previousSlide: string;
  nextSlide: string;
  slideNavigation: string;
  pauseSlides: string;
  playSlides: string;
  slideStatus: string;
}

interface HeroImageCarouselProps {
  slides: readonly HeroImageSlide[];
  labels: HeroImageCarouselLabels;
  scrollLabel: string;
  scrollHref: string;
  children: ReactNode;
}

function slideNumber(value: number) {
  return String(value).padStart(2, "0");
}

/**
 * 히어로의 작은 클라이언트 섬: 제목·CTA는 서버에서 그린 children으로 받고,
 * 뒤의 현장 사진 교차 전환과 하단 캡션 바(번호·조작·SCROLL)만 맡는다.
 */
export default function HeroImageCarousel({ slides, labels, scrollLabel, scrollHref, children }: HeroImageCarouselProps) {
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [loadDeferred, setLoadDeferred] = useState(false);
  const hasMultipleSlides = slides.length > 1;
  const isPaused = Boolean(reduceMotion) || isManuallyPaused || isInteracting || !isDocumentVisible;

  useEffect(() => {
    const updateVisibility = () => setIsDocumentVisible(!document.hidden);

    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadDeferred(true), DEFER_SLIDES_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hasMultipleSlides || isPaused) return;

    const timer = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % slides.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [activeIndex, hasMultipleSlides, isPaused, slides.length]);

  if (!slides.length) return null;

  const activeSlide = activeIndex + 1;
  const totalSlides = slides.length;
  const goToSlide = (index: number) => {
    setActiveIndex((index + totalSlides) % totalSlides);
  };
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setIsInteracting(false);
  };
  const controlClass =
    "inline-flex size-11 items-center justify-center rounded-full text-white transition hover:bg-white/14 motion-reduce:transition-none";

  return (
    <div
      className="relative flex hero-min-h flex-col justify-end pt-32 sm:pt-40"
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onFocusCapture={() => setIsInteracting(true)}
      onBlurCapture={handleBlur}
    >
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        {slides.map((slide, index) => {
          const isActive = index === activeIndex;
          if (index > 0 && !loadDeferred && !isActive) return null;

          return (
            <Image
              key={slide.src}
              src={slide.src}
              alt=""
              fill
              priority={index === 0}
              sizes="100vw"
              style={{ objectPosition: slide.position }}
              className={`object-cover transition-opacity duration-[1300ms] ease-out motion-reduce:transition-none ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
            />
          );
        })}
        <div className="hero-scrim absolute inset-0" />
      </div>

      {children}

      <div className="page-wrap flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-white/30 py-2 text-meta text-white/85">
        <p aria-live={isPaused ? "polite" : "off"} className="flex items-center gap-4">
          <span aria-hidden="true" className="tabular-nums">
            {slideNumber(activeSlide)} / {slideNumber(totalSlides)}
          </span>
          <span className="sr-only">
            {labels.slideStatus} {activeSlide} / {totalSlides}
          </span>
          {slides[activeIndex]?.caption ? <span className="hidden sm:inline">{slides[activeIndex].caption}</span> : null}
        </p>

        <div className="flex items-center gap-1">
          {hasMultipleSlides ? (
            <div role="group" aria-label={labels.slideNavigation} className="flex items-center">
              <div className="hidden items-center sm:flex">
                {slides.map((slide, index) => {
                  const isActive = index === activeIndex;

                  return (
                    <button
                      key={slide.src}
                      type="button"
                      onClick={() => goToSlide(index)}
                      aria-label={`${labels.slideStatus} ${index + 1} / ${totalSlides}`}
                      aria-current={isActive ? "true" : undefined}
                      className="inline-flex min-h-11 min-w-8 items-center justify-center px-1"
                    >
                      <span
                        className={`block h-px transition-[width,background-color] duration-300 motion-reduce:transition-none ${
                          isActive ? "w-8 bg-white" : "w-4 bg-white/45 hover:bg-white/75"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={() => goToSlide(activeIndex - 1)} aria-label={labels.previousSlide} className={controlClass}>
                <ArrowLeft size={17} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => goToSlide(activeIndex + 1)} aria-label={labels.nextSlide} className={controlClass}>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              {!reduceMotion ? (
                <button
                  type="button"
                  onClick={() => setIsManuallyPaused((paused) => !paused)}
                  aria-label={isManuallyPaused ? labels.playSlides : labels.pauseSlides}
                  className={controlClass}
                >
                  {isManuallyPaused ? <Play size={15} weight="fill" aria-hidden="true" /> : <Pause size={15} weight="fill" aria-hidden="true" />}
                </button>
              ) : null}
            </div>
          ) : null}

          <a
            href={scrollHref}
            lang="en"
            className="group ml-2 inline-flex min-h-11 items-center gap-2 px-2 text-[11px] font-semibold tracking-[0.2em] text-white"
          >
            {scrollLabel}
            <CaretDown size={16} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-y-1 motion-reduce:transition-none" />
          </a>
        </div>
      </div>
    </div>
  );
}
