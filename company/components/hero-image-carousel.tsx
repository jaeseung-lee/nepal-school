"use client";

import { ArrowLeft, ArrowRight, Pause, Play } from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useState, type FocusEvent } from "react";
import { useReducedMotion } from "motion/react";

const AUTO_ADVANCE_MS = 6_000;

export interface HeroImageSlide {
  src: string;
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
}

function slideNumber(value: number) {
  return String(value).padStart(2, "0");
}

/**
 * A deliberately small client island: all headline and CTA content remains
 * server-rendered while the field photography crossfades behind it.
 */
export default function HeroImageCarousel({ slides, labels }: HeroImageCarouselProps) {
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const hasMultipleSlides = slides.length > 1;
  const isPaused = Boolean(reduceMotion) || isManuallyPaused || isInteracting || !isDocumentVisible;

  useEffect(() => {
    const updateVisibility = () => setIsDocumentVisible(!document.hidden);

    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
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

  return (
    <div
      className="absolute inset-0"
      role="region"
      aria-label={labels.slideNavigation}
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onFocusCapture={() => setIsInteracting(true)}
      onBlurCapture={handleBlur}
    >
      {slides.map((slide, index) => {
        const isActive = index === activeIndex;

        return (
          <Image
            key={slide.src}
            src={slide.src}
            alt=""
            aria-hidden="true"
            fill
            priority={index === 0}
            sizes="100vw"
            className={`object-cover transition-opacity duration-[1300ms] ease-out motion-reduce:transition-none ${
              isActive ? "opacity-100" : "opacity-0"
            }`}
          />
        );
      })}

      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,26,31,0.64)_0%,rgba(24,26,31,0.38)_43%,rgba(24,26,31,0.06)_100%)]" aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(24,26,31,0.58),rgba(24,26,31,0.02)_52%)]" aria-hidden="true" />

      {hasMultipleSlides && (
        <div className="absolute inset-x-0 bottom-0 z-30">
          <div className="max-w-content mx-auto flex justify-end px-5 pb-5 lg:px-8 lg:pb-7">
            <div className="flex min-h-11 items-center gap-1.5 rounded-full border border-white/25 bg-primary-deepest/48 px-2.5 text-white shadow-lg shadow-primary-deepest/10 backdrop-blur-md sm:gap-2 sm:px-3">
              <span className="mr-1 whitespace-nowrap text-[0.7rem] font-semibold tracking-[0.16em] text-white/72 tabular-nums">
                {slideNumber(activeSlide)} / {slideNumber(totalSlides)}
              </span>
              <nav className="flex items-center" aria-label={labels.slideNavigation}>
                {slides.map((slide, index) => {
                  const isActive = index === activeIndex;

                  return (
                    <button
                      key={slide.src}
                      type="button"
                      onClick={() => goToSlide(index)}
                      aria-label={`${labels.slideStatus} ${index + 1} / ${totalSlides}`}
                      aria-current={isActive ? "true" : undefined}
                      className="inline-flex min-h-11 min-w-8 items-center justify-center rounded-full px-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      <span className={`block h-1 rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none ${isActive ? "w-8 bg-white" : "w-3 bg-white/45 hover:bg-white/75"}`} />
                    </button>
                  );
                })}
              </nav>
              <span className="mx-0.5 h-5 w-px bg-white/25" aria-hidden="true" />
              <button
                type="button"
                onClick={() => goToSlide(activeIndex - 1)}
                aria-label={labels.previousSlide}
                className="inline-flex min-h-11 min-w-9 items-center justify-center rounded-full text-white transition hover:bg-white/14 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
              >
                <ArrowLeft size={18} weight="bold" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => goToSlide(activeIndex + 1)}
                aria-label={labels.nextSlide}
                className="inline-flex min-h-11 min-w-9 items-center justify-center rounded-full text-white transition hover:bg-white/14 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
              >
                <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </button>
              {!reduceMotion && (
                <button
                  type="button"
                  onClick={() => setIsManuallyPaused((paused) => !paused)}
                  aria-label={isManuallyPaused ? labels.playSlides : labels.pauseSlides}
                  className="inline-flex min-h-11 min-w-9 items-center justify-center rounded-full text-white transition hover:bg-white/14 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
                >
                  {isManuallyPaused ? <Play size={17} weight="fill" aria-hidden="true" /> : <Pause size={17} weight="fill" aria-hidden="true" />}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
