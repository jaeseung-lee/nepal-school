import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import { getMessages, localizedHref, type Locale } from "@/lib/i18n";
import { getKeyVisualPhoto, KEY_VISUALS } from "@/lib/key-visuals";
import { SECTION_LABELS } from "@/lib/section-labels";

/** 페이지 마지막 문의 유도 영역: 왼쪽 문구, 오른쪽 현장 사진의 50/50 분할. */
export default function CtaBanner({ locale = "ko" }: { locale?: Locale }) {
  const cta = getMessages(locale).cta;
  const photo = getKeyVisualPhoto(KEY_VISUALS.cta, locale);

  return (
    <section aria-labelledby="cta-title" className="@container border-t border-line bg-surface">
      <div className="grid lg:min-h-[45rem] lg:grid-cols-2">
        <div className="page-inset-start flex flex-col justify-center py-section pr-gutter">
          <p className="eyebrow text-ink" lang="en">
            {SECTION_LABELS.contact}
          </p>
          <h2 id="cta-title" className="mt-5 max-w-[14em] text-headline text-balance text-ink">
            {cta.title}
          </h2>
          <p className="mt-6 max-w-[30rem] text-description text-muted">{cta.description}</p>
          <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={localizedHref(locale, "/contact")}
              data-seo-event="cta_clicked"
              data-content-id="hiring-preparation"
              data-locale={locale}
              className="pill pill-lg pill-dark sm:min-w-60"
            >
              {cta.contactCta} <ArrowUpRight size={18} weight="bold" aria-hidden="true" />
            </Link>
            <Link href={localizedHref(locale, "/services")} className="pill pill-lg pill-outline sm:min-w-60">
              {cta.processCta} <ArrowUpRight size={18} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="relative min-h-[22.5rem] border-t border-line sm:min-h-[26.25rem] lg:min-h-0 lg:border-l lg:border-t-0">
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
            style={{ objectPosition: photo.position }}
          />
        </div>
      </div>
    </section>
  );
}
