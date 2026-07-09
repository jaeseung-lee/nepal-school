import type { Metadata } from "next";
import { Handshake, SealCheck } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import PageBanner from "@/components/page-banner";
import PartnerCards from "@/components/partner-cards";
import CtaBanner from "@/components/cta-banner";
import Reveal from "@/components/reveal";

export const metadata: Metadata = {
  title: "파트너십",
  description:
    "네팔·베트남·한국의 검증된 기관과 협력합니다. Richhood Overseas와 2026년 7월 5일 MOU를 체결하고, 선발·검증·출입국 행정·정착 지원 체계를 구축합니다.",
  alternates: { canonical: "/partners" },
};

const mouItems = [
  { title: "협약 기관", desc: "Richhood Overseas Inc. (P) Ltd. 네팔 인력공급기관" },
  { title: "체결일", desc: "2026년 7월 5일" },
  { title: "Richhood Overseas 역할", desc: "근로자 선발, 자격요건 검증, 출입국 관련 행정 지원" },
  { title: "정우인재개발원 역할", desc: "한국 입국 근로자의 안정적 정착을 위한 법무, 노무, 행정, 회계 지원" },
];

export default function PartnersPage() {
  return (
    <main>
      <PageBanner
        eyebrow="협력 네트워크"
        context="역할이 확인된 기관 협력"
        titleKo="파트너십"
        desc="네팔, 베트남, 한국의 기관들과 역할을 나누어 선발, 교육, 송출, 매칭 흐름을 구축합니다."
        crumb="파트너십"
        bgImage="/kv/banner-partners.webp"
      />

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <div className="grid overflow-hidden rounded-[32px] border border-line bg-surface shadow-sm shadow-ink/5 lg:grid-cols-[0.95fr_1.1fr]">
              <div className="relative min-h-[320px] bg-gray-100">
                <Image src="/kv/redesign/partner.webp" alt="국제 파트너십 협의 장면" fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
              </div>
              <div className="p-7 lg:p-9">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
                  <Handshake size={26} weight="duotone" aria-hidden="true" />
                </span>
                <h2 className="mt-6 font-display text-3xl font-semibold text-ink lg:text-4xl">
                  Richhood Overseas와 국제사업 업무협약 체결
                </h2>
                <p className="mt-5 text-[15px] leading-relaxed text-muted">
                  정우인재개발원은 네팔 인력공급기관 Richhood Overseas Inc. (P) Ltd.와 업무협약을 체결했습니다. 양 기관은 직업기술교육, 한국과 일본 취업 연계, 직무와 어학교육, 출입국 세부 절차를 협력 범위로 정했습니다.
                </p>
                <dl className="mt-8 grid gap-4 sm:grid-cols-2">
                  {mouItems.map((item) => (
                    <div key={item.title} className="rounded-[18px] border border-line bg-paper p-4">
                      <dt className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <SealCheck size={18} className="text-cobalt" weight="duotone" aria-hidden="true" />
                        {item.title}
                      </dt>
                      <dd className="mt-2 text-sm leading-relaxed text-muted">{item.desc}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08} className="mt-12">
            <PartnerCards />
          </Reveal>
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
