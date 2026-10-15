import Image from "next/image";
import Link from "next/link";
import { getKeyVisualPhoto, type KeyVisual } from "@/lib/key-visuals";
import { getMessages, localizedHref, type Locale } from "@/lib/i18n";

interface PageBannerProps {
  locale?: Locale;
  eyebrow: string;
  context: string;
  /** `titleKo` remains temporarily accepted for legacy Korean-only visa pages. */
  title?: string;
  titleKo?: string;
  desc: string;
  crumb: string;
  /** 영문 장식 라벨 (`SECTION_LABELS.pages.*`). */
  label?: string;
  /** 현장 실사(`KEY_VISUALS`). 없으면 사진 없는 다크 밴드로 그린다. */
  photo?: KeyVisual;
}

/**
 * 서브페이지 첫 화면. 어두운 풀블리드 사진 위에 투명 헤더가 겹치도록 `data-hero-overlay`를 단다.
 */
export default function PageBanner({ locale = "ko", eyebrow, context, title, titleKo, desc, crumb, label, photo }: PageBannerProps) {
  const common = getMessages(locale).common;
  const heading = title ?? titleKo;
  const image = photo ? getKeyVisualPhoto(photo, locale) : null;

  return (
    <section
      data-hero-overlay
      className={`surface-dark relative isolate flex flex-col justify-end overflow-hidden bg-night pt-32 text-white sm:pt-40 ${image ? "min-h-[clamp(32.5rem,72svh,47.5rem)]" : "min-h-[clamp(26rem,56svh,36rem)]"}`}
    >
      {image ? (
        <>
          <Image
            src={image.src}
            alt={image.alt}
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover"
            style={{ objectPosition: image.position }}
          />
          <div className="hero-scrim absolute inset-0 -z-10" aria-hidden="true" />
        </>
      ) : null}

      <div className="page-wrap pb-12 lg:pb-16">
        <nav aria-label={common.currentLocation}>
          <ol className="flex flex-wrap items-center gap-2 text-meta text-white/85">
            <li>
              <Link href={localizedHref(locale, "/")} className="underline-offset-4 transition hover:text-white hover:underline">
                {common.home}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{crumb}</li>
          </ol>
        </nav>

        {label ? (
          <p className="eyebrow mt-10 text-white" lang="en">
            {label}
          </p>
        ) : null}
        <h1 className={`${label ? "mt-5" : "mt-10"} max-w-[18em] text-display text-balance text-white`}>
          {heading}
        </h1>

        <div className="mt-10 grid gap-5 border-t border-white/30 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,32.5rem)] lg:gap-16">
          <p className="text-meta text-white/85">
            <span className="font-semibold text-white">{eyebrow}</span>
            {context ? (
              <>
                <span aria-hidden="true"> · </span>
                {context}
              </>
            ) : null}
          </p>
          <p className="text-description text-white/90">{desc}</p>
        </div>
      </div>
    </section>
  );
}
