import type { Metadata } from "next";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import PageBanner from "@/components/page-banner";
import Collage from "@/components/collage";
import MetricsStrip from "@/components/metrics-strip";
import CtaBanner from "@/components/cta-banner";
import Reveal from "@/components/reveal";

export const metadata: Metadata = {
  title: "회사소개",
  description:
    "네팔·베트남 인재를 현지 교육부터 양성해 한국·일본 기업에 합법적으로 연결하는 글로벌 인적자원 개발 기업, 정우인재개발원 회사소개.",
  alternates: { canonical: "/about" },
};

const chip =
  "inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-cobalt hover:text-cobalt";

export default function AboutPage() {
  return (
    <main>
      <PageBanner
        eyebrow="회사 개요"
        context="현지 교육부터 정착 지원까지"
        titleKo="회사소개"
        desc="네팔·베트남 인재를 현지 교육부터 양성해 한국·일본 기업에 합법적으로 연결하는 글로벌 인적자원 개발 기업입니다."
        crumb="회사소개"
        bgImage="/kv/banner-about.webp"
      />

      <section className="bg-paper">
        <div className="max-w-content mx-auto grid gap-12 px-5 py-20 lg:grid-cols-[1fr_1.05fr] lg:px-8 lg:py-28">
          <Reveal className="flex flex-col justify-center">
            <h2 className="font-display text-3xl font-semibold text-ink text-balance lg:text-5xl">
              인재는 보내는 것이 아니라, 준비시키는 것입니다
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted">
              정우인재개발원은 네팔과 베트남 현지의 직업훈련부터 시작합니다. 직무, 언어, 문화를 갖춘 인재를 한국과 일본 기업 요건에 맞춰 합법적인 절차로 연결합니다.
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
              2026년 7월 Richhood Overseas와 MOU를 체결해 네팔 근로자 선발, 자격 검증, 출입국 행정 협력 체계를 강화했습니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/services" className={chip}>
                사업영역 <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
              <Link href="/partners" className={chip}>
                파트너십 <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
              <Link href="/why" className={chip}>
                신뢰 기준 <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <Collage />
          </Reveal>
        </div>
      </section>

      <MetricsStrip />
      <CtaBanner />
    </main>
  );
}
