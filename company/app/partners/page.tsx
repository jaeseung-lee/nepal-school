import type { Metadata } from "next";
import PageBanner from "@/components/page-banner";
import PartnerCards from "@/components/partner-cards";
import CtaBanner from "@/components/cta-banner";

export const metadata: Metadata = {
  title: "파트너십",
  description:
    "네팔·베트남·한국의 검증된 기관과 협력합니다. Richhood Overseas와 2026년 7월 5일 MOU를 체결하고, 선발·검증·출입국 행정·정착 지원 체계를 구축합니다.",
  alternates: { canonical: "/partners" },
};

const mouItems = [
  {
    title: "협약 기관",
    desc: "Richhood Overseas Inc. (P) Ltd. · 네팔 인력공급기관",
  },
  {
    title: "체결일",
    desc: "2026년 7월 5일",
  },
  {
    title: "Richhood Overseas 역할",
    desc: "근로자 선발, 자격요건 검증, 출입국 관련 행정 지원",
  },
  {
    title: "정우인재개발원 역할",
    desc: "한국 입국 근로자의 안정적 정착을 위한 법무·노무·행정·회계 지원",
  },
];

export default function PartnersPage() {
  return (
    <main>
      <PageBanner
        eyebrow="Trusted Network"
        titleEn="Verified Partners"
        titleKo="파트너십"
        desc="네팔·베트남·한국의 신뢰할 수 있는 기관들과 함께합니다. 선발-교육-송출-매칭의 각 단계마다 검증된 파트너가 있습니다."
        crumb="파트너십"
        bgImage="/kv/banner-partners.webp"
      />

      <section className="max-w-content mx-auto px-5 lg:px-8 py-20 lg:py-28">
        <div className="mb-14 rounded-[20px] border border-primary-main/15 bg-primary-main/[0.03] p-6 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="text-xs font-display font-semibold tracking-[0.22em] text-primary-main uppercase">MOU Partner</span>
              <h2 className="mt-3 text-2xl lg:text-3xl font-bold text-gray-900">Richhood Overseas와 국제사업 업무협약 체결</h2>
              <p className="mt-4 text-[15px] text-gray-600 leading-relaxed">
                정우인재개발원은 네팔 인력공급기관 Richhood Overseas Inc. (P) Ltd.와 업무협약을 체결했습니다.
                양 기관은 직업기술교육, 한국·일본 취업 연계, 해외취업을 위한 직무·어학교육, 출입국 세부 절차를 협력 범위로 정하고 선발부터 정착까지의 실행 체계를 함께 구축합니다.
              </p>
            </div>
            <div className="shrink-0 rounded-2xl bg-white border border-gray-200 px-5 py-4">
              <p className="text-xs font-semibold text-gray-400">SIGNED</p>
              <p className="mt-1 font-display text-2xl font-bold text-primary-main">2026.07.05</p>
            </div>
          </div>

          <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {mouItems.map((item) => (
              <div key={item.title} className="rounded-2xl bg-white border border-gray-200 p-5">
                <dt className="text-xs font-semibold text-gold-deep">{item.title}</dt>
                <dd className="mt-2 text-sm text-gray-700 leading-relaxed">{item.desc}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-2">
          <PartnerCards />
        </div>
        <p className="mt-6 text-xs text-gray-400">※ 파트너 로고·명칭은 각 기관의 사용 허락을 받은 뒤 실제 로고로 교체될 예정입니다.</p>
      </section>

      {/* 하단 CTA 배너 */}
      <CtaBanner />
    </main>
  );
}
