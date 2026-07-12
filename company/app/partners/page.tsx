import type { Metadata } from "next";
import { Handshake, MapPin, SealCheck } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import PageBanner from "@/components/page-banner";
import BreadcrumbSchema from "@/components/breadcrumb-schema";
import { buildPageMetadata } from "@/lib/seo";
import PartnerCards from "@/components/partner-cards";
import CtaBanner from "@/components/cta-banner";
import Reveal from "@/components/reveal";

export const metadata: Metadata = buildPageMetadata({
  title: "파트너십",
  description:
    "네팔 현지 5개 기관과 2026년 7월 국제사업 MOU 체결. 인력송출 3개사와 직업기술·교육 2개 기관이 선발·검증·교육·출입국 행정을 분담합니다.",
  path: "/partners",
});

const mouItems = [
  { title: "체결일", desc: "2026년 7월 5일" },
  { title: "협약 구성", desc: "인력송출 3개사 + 직업기술·교육 2개 기관, 각각 MOU 체결" },
  { title: "파트너 역할", desc: "근로자 선발과 자격 검증, 직업기술·직무·어학 교육, 출입국 관련 행정 지원" },
  { title: "정우인재개발원 역할", desc: "한국·일본 기업 발굴과 매칭, 입국 근로자의 법무·노무·행정·회계 정착 지원" },
];

// MOU 체결 5개 기관 — 공식 등록으로 확인된 사실만 게시(로고·미확인 정보 미표기)
const MOU_PARTNERS = [
  {
    name: "Richhood Overseas Inc. (P) Ltd.",
    type: "인력송출기관",
    location: "네팔 카트만두",
    desc: "근로자 선발, 자격요건 검증, 출입국 관련 행정을 지원합니다.",
    basis: "네팔 회사등록청(OCR) 등록 · 일본 OTIT·JITCO 인정 송출기관",
    icon: Handshake,
  },
  {
    name: "Sunkoshi Manpower Service Pvt. Ltd.",
    type: "인력송출기관",
    location: "네팔 카트만두",
    desc: "1995년 설립. 한국·일본 등으로 해외 인력을 송출합니다.",
    basis: "OCR 등록 · 네팔 노동부 해외고용국(DoFE) 인가 · OTIT·JITCO 인정(일본 사무소)",
    icon: Handshake,
  },
  {
    name: "Satyawati Overseas Concern Pvt. Ltd.",
    type: "인력송출기관",
    location: "네팔 카트만두",
    desc: "한국·일본 방향 근로자 선발과 송출을 협력합니다.",
    basis: "OCR 등록 · 일본 OTIT·JITCO 인정 송출기관",
    icon: Handshake,
  },
  {
    name: "Bhairav Industrial Skills Hub Pvt. Ltd.",
    type: "산업기술 훈련원",
    location: "네팔 루판데히 틸로타마",
    desc: "용접 특화 직업기술교육을 운영하고 해외취업 후보를 발굴합니다.",
    basis: "네팔 회사등록청(OCR) 등록",
    icon: SealCheck,
  },
  {
    name: "Ocean Technical Institute Pvt. Ltd.",
    type: "교육·훈련 기관",
    location: "네팔 카트만두",
    desc: "학생 모집과 직무·어학 교육, 출국 전 교육을 담당합니다.",
    basis: "네팔 회사등록청(OCR) 등록",
    icon: SealCheck,
  },
];

export default function PartnersPage() {
  return (
    <main>
      <BreadcrumbSchema name="파트너십" path="/partners" />
      <PageBanner
        eyebrow="협력 네트워크"
        context="역할이 확인된 기관 협력"
        titleKo="파트너십"
        desc="네팔과 한국의 기관들과 역할을 나누어 선발, 교육, 송출, 매칭 흐름을 구축합니다."
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
                  네팔 5개 기관과 국제사업 업무협약 체결
                </h2>
                <p className="mt-5 text-[15px] leading-relaxed text-muted">
                  정우인재개발원은 2026년 7월 5일, 네팔 현지 인력송출 3개사와 직업기술·교육 2개 기관과 각각 업무협약을 체결했습니다. 양측은 직업기술교육, 한국과 일본 취업 연계, 직무와 어학교육, 출입국 세부 절차를 협력 범위로 정했습니다.
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

          <Reveal delay={0.08} className="mt-16">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-cobalt">2026년 7월 국제사업 업무협약</p>
              <h2 className="mt-4 font-display text-3xl font-semibold text-ink lg:text-4xl">
                MOU 체결 5개 기관
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                근로자를 송출하는 인력송출 3개사와, 선발·교육을 맡는 직업기술·교육 2개 기관으로 구성됩니다. 각 기관은 공식 등록으로 확인된 사실만 표기합니다.
              </p>
            </div>
            <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {MOU_PARTNERS.map((partner) => {
                const Icon = partner.icon;
                return (
                  <li
                    key={partner.name}
                    className="flex flex-col rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-paper text-sm font-bold text-cobalt">
                        NP
                      </span>
                      <span className="inline-flex items-center rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold text-cobalt">
                        {partner.type}
                      </span>
                    </div>
                    <h3 className="mt-5 font-display text-lg font-semibold leading-snug text-ink">
                      {partner.name}
                    </h3>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                      <MapPin size={16} weight="duotone" className="text-cobalt" aria-hidden="true" />
                      {partner.location}
                    </p>
                    <p className="mt-4 text-sm leading-relaxed text-muted">{partner.desc}</p>
                    <p className="mt-5 flex items-start gap-1.5 border-t border-line pt-4 text-xs leading-relaxed text-muted">
                      <SealCheck size={15} weight="duotone" className="mt-0.5 shrink-0 text-cobalt" aria-hidden="true" />
                      <span>{partner.basis}</span>
                    </p>
                  </li>
                );
              })}
            </ul>
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
