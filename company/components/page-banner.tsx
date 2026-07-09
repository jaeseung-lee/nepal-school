import Link from "next/link";

interface PageBannerProps {
  /** 소제목(영문 eyebrow, 예: "About Us") */
  eyebrow: string;
  /** 영문 대형 헤드라인 */
  titleEn: string;
  /** 국문 부제 */
  titleKo: string;
  /** 배너 설명 문구 */
  desc: string;
  /** 브레드크럼 현재 위치 라벨 */
  crumb: string;
  /** 배경 KV 사진 경로 (없으면 단색 패턴) */
  bgImage?: string;
}

/** 내부 페이지 상단 배너 (브레드크럼 + eyebrow + 영문 h1 + 국문 부제 + 설명) */
export default function PageBanner({ eyebrow, titleEn, titleKo, desc, crumb, bgImage }: PageBannerProps) {
  return (
    <section className="relative overflow-hidden bg-primary-dark text-white">
      {/* 배경 KV 사진 (bgImage 없으면 단색 패턴 폴백) */}
      {bgImage ? (
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${bgImage}')` }} aria-hidden="true"></div>
      ) : (
        <div className="absolute inset-0 ph-dark" aria-hidden="true"></div>
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-deepest/90 via-primary-dark/75 to-primary-main/50" aria-hidden="true"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-primary-deepest/85 via-transparent to-transparent" aria-hidden="true"></div>
      <div className="relative max-w-content mx-auto px-5 lg:px-8 pt-36 pb-14 lg:pt-44 lg:pb-20">
        <nav className="text-xs text-white/55 flex items-center gap-2" aria-label="현재 위치">
          <Link href="/" className="hover:text-white transition">
            홈
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-white/90">{crumb}</span>
        </nav>
        <span className="mt-5 inline-block text-xs font-display font-semibold tracking-[0.22em] text-gold-light uppercase">{eyebrow}</span>
        <h1 className="mt-3 font-display text-4xl lg:text-6xl font-bold tracking-tight">{titleEn}</h1>
        <p className="mt-3 text-xl lg:text-2xl font-bold">{titleKo}</p>
        <p className="mt-4 max-w-2xl text-base text-white/75 leading-relaxed">{desc}</p>
      </div>
    </section>
  );
}
