import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";

interface PageBannerProps {
  eyebrow: string;
  context: string;
  titleKo: string;
  desc: string;
  crumb: string;
  bgImage?: string;
}

const BANNER_IMAGES: Record<string, string> = {
  "/kv/banner-about.webp": "/kv/redesign/principles.webp",
  "/kv/banner-services.webp": "/kv/redesign/training.webp",
  "/kv/banner-partners.webp": "/kv/redesign/partner.webp",
  "/kv/banner-why.webp": "/kv/redesign/principles.webp",
  "/kv/banner-contact.webp": "/kv/redesign/contact.webp",
};

export default function PageBanner({ eyebrow, context, titleKo, desc, crumb, bgImage }: PageBannerProps) {
  const image = bgImage ? BANNER_IMAGES[bgImage] ?? bgImage : "/kv/redesign/principles.webp";

  return (
    <section className="relative overflow-hidden border-b border-line bg-paper">
      <div className="max-w-content mx-auto grid gap-10 px-5 py-14 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-20">
        <div className="flex flex-col justify-between gap-10">
          <nav className="flex items-center gap-2 text-sm text-muted" aria-label="현재 위치">
            <Link href="/" className="transition hover:text-cobalt">
              홈
            </Link>
            <ArrowRight size={14} aria-hidden="true" />
            <span className="font-medium text-ink">{crumb}</span>
          </nav>
          <div>
            <p className="text-sm font-semibold text-cobalt">{eyebrow}</p>
            <h1 className="mt-4 font-display text-4xl font-semibold text-ink text-balance break-keep lg:text-6xl">
              {titleKo}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{desc}</p>
            <p className="mt-6 text-sm font-medium text-gray-500">{context}</p>
          </div>
        </div>
        <div className="relative min-h-[280px] overflow-hidden rounded-[28px] border border-line bg-gray-100 lg:min-h-[380px]">
          <Image src={image} alt={`${crumb}를 설명하는 현장 이미지`} fill sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" />
        </div>
      </div>
    </section>
  );
}
