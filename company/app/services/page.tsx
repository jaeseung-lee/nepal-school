import type { Metadata } from "next";
import PageBanner from "@/components/page-banner";
import ServiceCards from "@/components/service-cards";
import ProcessSteps from "@/components/process-steps";
import CtaBanner from "@/components/cta-banner";

export const metadata: Metadata = {
  title: "사업영역",
  description:
    "네팔 직업훈련학교, 한국 취업비자(E-9·E-7·D-2·D-4·계절근로), 일본 특정기능까지. 정우인재개발원의 3대 사업영역과 원스톱 프로세스.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <main>
      <PageBanner
        eyebrow="Our Business"
        titleEn="Shaping Global Talent"
        titleKo="사업영역"
        desc="단순 알선이 아닙니다. 현지 교육 → 비자 → 매칭으로 이어지는 일괄 구조로, 기업에는 검증된 즉전력 인재를 연결합니다."
        crumb="사업영역"
        bgImage="/kv/banner-services.webp"
      />

      <section className="max-w-content mx-auto px-5 lg:px-8 py-20 lg:py-28">
        <span className="text-xs font-display font-semibold tracking-[0.22em] text-primary-main uppercase">3대 사업영역</span>
        <h2 className="mt-3 text-2xl font-bold text-gray-900">교육 · 한국 · 일본</h2>
        <div className="mt-10">
          <ServiceCards />
        </div>
      </section>

      {/* 원스톱 프로세스 7단계 */}
      <ProcessSteps />

      {/* 하단 CTA 배너 */}
      <CtaBanner />
    </main>
  );
}
