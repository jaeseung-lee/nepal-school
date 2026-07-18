import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import HeroImageCarousel from "@/components/hero-image-carousel";
import { getMessages, localizedHref, type Locale } from "@/lib/i18n";

const HERO_FIELD_SLIDES = [
  { src: "/gallery/nursing-classroom-visit.webp" },
  { src: "/gallery/healthcare-training-simulation-ward.webp" },
  { src: "/gallery/campus-visit-outdoor-group.webp" },
] as const;

export default function HeroSlideshow({ locale }: { locale?: Locale }) {
  const messages = getMessages(locale);
  const hero = messages.home.hero;

  return (
    <section className="relative min-h-[calc(100dvh-72px)] overflow-hidden bg-ink text-white">
      <HeroImageCarousel
        slides={HERO_FIELD_SLIDES}
        labels={{
          previousSlide: hero.previousSlide,
          nextSlide: hero.nextSlide,
          slideNavigation: hero.slideNavigation,
          pauseSlides: hero.pauseSlides,
          playSlides: hero.playSlides,
          slideStatus: hero.slideStatus,
        }}
      />

      <div className="relative z-10 flex min-h-[calc(100dvh-72px)] items-end">
        <div className="max-w-content mx-auto w-full px-5 pb-28 pt-16 sm:pb-24 lg:px-8 lg:pb-28">
          <div className="max-w-3xl">
            <h1 className="font-display text-[clamp(2.75rem,6vw,5.8rem)] font-semibold leading-[0.98] text-balance">
              {hero.title}{" "}
              <br className="hidden sm:block" />
              {hero.lineBreak}
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-white/82 sm:text-xl">
              {hero.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={localizedHref(locale ?? "ko", "/contact")} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-base font-semibold text-cobalt transition hover:bg-cobalt-soft active:translate-y-px">
                {hero.contactCta} <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </Link>
              <Link href={localizedHref(locale ?? "ko", "/services")} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/55 bg-white/8 px-6 py-3.5 text-base font-semibold text-white backdrop-blur transition hover:bg-white/14 active:translate-y-px">
                {hero.servicesCta} <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
