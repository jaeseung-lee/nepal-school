import Link from "next/link";
import HeroSlideshow from "@/components/hero-slideshow";
import MetricsStrip from "@/components/metrics-strip";
import Collage from "@/components/collage";
import ServiceCards from "@/components/service-cards";
import PartnerCards from "@/components/partner-cards";
import ProcessSteps from "@/components/process-steps";
import FaqSection from "@/components/faq-section";
import CtaBanner from "@/components/cta-banner";

export default function HomePage() {
  return (
    <main>
      {/* 히어로 (풀블리드 슬라이드쇼) */}
      <HeroSlideshow />

      {/* 숫자 / 신뢰 스트립 */}
      <MetricsStrip />

      {/* 회사소개 teaser */}
      <section className="max-w-content mx-auto px-5 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <span className="text-xs font-display font-semibold tracking-[0.22em] text-primary-main uppercase">About Us</span>
            <p className="mt-5 text-[26px] sm:text-[32px] font-bold leading-[1.35] tracking-tight text-balance">
              <span className="text-gray-900">
                네팔·베트남 인재를 현지 교육부터 양성해
                <br className="hidden sm:block" /> 한국·일본 기업에 합법적으로 연결
              </span>
              <span className="text-gray-400">
                하는
                <br className="hidden sm:block" /> 글로벌 인적자원 개발 기업입니다.
              </span>
            </p>
            <p className="mt-6 text-base text-gray-600 leading-relaxed max-w-xl">2026년 6월 출발한 신생 기업이지만, Richhood Overseas와의 MOU를 포함한 현지 파트너 네트워크와 제도 전문성을 기반으로 선발–교육–시험–매칭–비자–정착까지 전 과정을 책임집니다.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/about" className="inline-flex items-center gap-1.5 rounded-full bg-primary-main hover:bg-primary-light transition text-white text-sm font-semibold px-5 py-2.5">
                회사소개 자세히 <span aria-hidden="true">→</span>
              </Link>
              <Link href="/why" className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 hover:border-primary-main hover:text-primary-main transition text-sm font-semibold px-5 py-2.5">
                신뢰·전문성 <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <Collage />
        </div>
      </section>

      {/* 사업영역 teaser */}
      <section className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-content mx-auto px-5 lg:px-8 py-20 lg:py-28">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-2xl">
              <span className="text-xs font-display font-semibold tracking-[0.22em] text-primary-main uppercase">Our Business</span>
              <h2 className="mt-3 font-display text-3xl lg:text-5xl font-bold text-gray-900 tracking-tight">Shaping Global Talent</h2>
              <p className="mt-3 text-2xl font-bold text-gray-900">3대 사업영역</p>
            </div>
            <Link href="/services" className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 hover:border-primary-main hover:text-primary-main transition text-sm font-semibold px-5 py-2.5 shrink-0">
              사업영역 자세히 <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="mt-12">
            <ServiceCards />
          </div>
        </div>
      </section>

      {/* 원스톱 프로세스 7단계 */}
      <ProcessSteps />

      {/* 파트너십 teaser */}
      <section className="max-w-content mx-auto px-5 lg:px-8 py-20 lg:py-28">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <span className="text-xs font-display font-semibold tracking-[0.22em] text-primary-main uppercase">Trusted Network</span>
            <h2 className="mt-3 font-display text-3xl lg:text-5xl font-bold text-gray-900 tracking-tight">Verified Partners</h2>
            <p className="mt-3 text-2xl font-bold text-gray-900">국경을 넘는 신뢰는, 검증된 MOU 파트너에서</p>
          </div>
          <Link href="/partners" className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 hover:border-primary-main hover:text-primary-main transition text-sm font-semibold px-5 py-2.5 shrink-0">
            파트너십 자세히 <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="mt-12">
          <PartnerCards />
        </div>
      </section>

      {/* 자주 묻는 질문 (AI 검색 인용 최적화) */}
      <FaqSection />

      {/* 하단 CTA 배너 */}
      <CtaBanner />
    </main>
  );
}
