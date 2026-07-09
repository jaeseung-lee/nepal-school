import type { Metadata } from "next";
import Link from "next/link";
import PageBanner from "@/components/page-banner";
import Collage from "@/components/collage";
import MetricsStrip from "@/components/metrics-strip";
import CtaBanner from "@/components/cta-banner";

export const metadata: Metadata = {
  title: "회사소개",
  description:
    "네팔·베트남 인재를 현지 교육부터 양성해 한국·일본 기업에 합법적으로 연결하는 글로벌 인적자원 개발 기업, 정우인재개발원 회사소개.",
  alternates: { canonical: "/about" },
};

const chip =
  "inline-flex items-center gap-1.5 rounded-full border border-gray-300 hover:border-primary-main hover:text-primary-main transition text-sm font-semibold px-5 py-2.5";

export default function AboutPage() {
  return (
    <main>
      <PageBanner
        eyebrow="About Us"
        titleEn="Who We Are"
        titleKo="회사소개"
        desc="네팔·베트남 인재를 현지 교육부터 양성해 한국·일본 기업에 합법적으로 연결하는 글로벌 인적자원 개발 기업입니다."
        crumb="회사소개"
        bgImage="/kv/banner-about.webp"
      />

      {/* 인트로 statement + 콜라주 */}
      <section className="max-w-content mx-auto px-5 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <p className="text-[26px] sm:text-[34px] font-bold leading-[1.32] tracking-tight text-balance">
              <span className="text-gray-900">
                인재는 보내는 것이 아니라,
                <br className="hidden sm:block" /> 키우는 것입니다.
              </span>
            </p>
            <p className="mt-6 text-base text-gray-600 leading-relaxed max-w-xl">정우인재개발원은 네팔·베트남 현지의 직업훈련부터 시작합니다. 직무·언어·문화를 갖춘 즉전력을 양성하고, 한국·일본 기업의 요건에 맞춰 합법적인 절차로 연결합니다. 2026년 7월 Richhood Overseas와 MOU를 체결해 네팔 근로자 선발·자격 검증·출입국 행정 협력 체계를 강화했으며, 선발–교육–시험–매칭–비자–정착까지 전 과정을 책임집니다.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/services" className={chip}>
                사업영역 <span aria-hidden="true">→</span>
              </Link>
              <Link href="/partners" className={chip}>
                파트너십 <span aria-hidden="true">→</span>
              </Link>
              <Link href="/why" className={chip}>
                신뢰·전문성 <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <Collage />
        </div>
      </section>

      {/* 숫자 / 신뢰 스트립 */}
      <MetricsStrip />

      {/* 하단 CTA 배너 */}
      <CtaBanner />
    </main>
  );
}
