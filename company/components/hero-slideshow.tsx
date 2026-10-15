import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import HeroImageCarousel from "@/components/hero-image-carousel";
import KeepTogether from "@/components/keep-together";
import { getMessages, localizedHref, type Locale } from "@/lib/i18n";
import { getKeyVisualPhoto, KEY_VISUALS } from "@/lib/key-visuals";
import { SECTION_LABELS } from "@/lib/section-labels";

export default function HeroSlideshow({ locale = "ko" }: { locale?: Locale }) {
  const messages = getMessages(locale);
  const hero = messages.home.hero;
  const slides = KEY_VISUALS.homeHero.map((visual) => {
    const photo = getKeyVisualPhoto(visual, locale);
    return { src: photo.src, position: photo.position, caption: photo.title };
  });

  return (
    <section data-hero-overlay aria-labelledby="hero-title" className="surface-dark relative isolate overflow-hidden bg-night text-white">
      <HeroImageCarousel
        slides={slides}
        scrollLabel={SECTION_LABELS.scroll}
        scrollHref="#intro"
        labels={{
          previousSlide: hero.previousSlide,
          nextSlide: hero.nextSlide,
          slideNavigation: hero.slideNavigation,
          pauseSlides: hero.pauseSlides,
          playSlides: hero.playSlides,
          slideStatus: hero.slideStatus,
        }}
      >
        <div className="page-wrap pb-10 sm:pb-14 lg:pb-[4.5rem]">
          <p className="eyebrow text-white" lang="en">
            {SECTION_LABELS.heroEyebrow}
          </p>
          <h1 id="hero-title" className="mt-6 max-w-[18em] text-display text-balance">
            <KeepTogether text={hero.title} />{" "}
            <br className="hidden sm:block" />
            <KeepTogether text={hero.lineBreak} />
          </h1>
          {locale !== "en" ? (
            <p className="mt-6 max-w-[30rem] text-sm font-semibold leading-relaxed text-white/90" lang="en">
              {SECTION_LABELS.heroLine}
            </p>
          ) : null}
          <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <p className="max-w-xl text-description text-white/90">{hero.description}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={localizedHref(locale, "/contact")} className="pill pill-light">
                {hero.contactCta} <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
              </Link>
              <Link href={localizedHref(locale, "/services")} className="pill pill-outline-light">
                {hero.servicesCta} <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </HeroImageCarousel>
    </section>
  );
}
