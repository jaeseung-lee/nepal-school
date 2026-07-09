import type { Metadata } from "next";
import PageBanner from "@/components/page-banner";
import CtaBanner from "@/components/cta-banner";

export const metadata: Metadata = {
  title: "신뢰·전문성",
  description:
    "신생 회사인데 왜 믿을 수 있는가. Richhood Overseas MOU를 포함한 검증된 파트너십, 제도·법규 전문성, 대표·팀 전문성, 투명한 프로세스.",
  alternates: { canonical: "/why" },
};

const pillarBadge =
  "inline-flex w-11 h-11 rounded-xl bg-primary-main/10 text-primary-main items-center justify-center font-display text-lg font-bold";

export default function WhyPage() {
  return (
    <main>
      <PageBanner
        eyebrow="Why Joong Woo"
        titleEn="Built on Principles"
        titleKo="신뢰·전문성"
        desc="화려한 약속이 아니라, 지키는 원칙으로 증명합니다. 정우인재개발원의 신뢰는 4가지 사실에서 나옵니다."
        crumb="신뢰·전문성"
        bgImage="/kv/banner-why.webp"
      />

      <section className="max-w-content mx-auto px-5 lg:px-8 py-20 lg:py-28">
        <div className="mt-2">
          <div className="grid gap-6 sm:grid-cols-2">
            <article className="rounded-[20px] bg-white border border-gray-200 p-8">
              <span className={pillarBadge} aria-hidden="true">01</span>
              <h3 className="mt-4 text-xl font-bold text-gray-900">검증된 파트너십</h3>
              <p className="mt-3 text-[15px] text-gray-600 leading-relaxed">신생 회사의 한계를 검증된 기관과의 협력으로 채웁니다. 2026년 7월 5일 Richhood Overseas Inc. (P) Ltd.와 MOU를 체결해 네팔 근로자 선발·자격 검증·출입국 행정 협력 체계를 마련했습니다.</p>
            </article>
            <article className="rounded-[20px] bg-white border border-gray-200 p-8">
              <span className={pillarBadge} aria-hidden="true">02</span>
              <h3 className="mt-4 text-xl font-bold text-gray-900">제도·법규 전문성</h3>
              <p className="mt-3 text-[15px] text-gray-600 leading-relaxed">외국인 채용의 핵심은 제도를 정확히 아는 것. 한국(E-9·E-7·D-2·D-4·계절근로)과 일본(특정기능1호) 제도를 정부 공식 기준으로 정리하고, 매년 바뀌는 요건을 추적합니다.</p>
              <p className="mt-3 text-xs text-gray-400">모든 제도 설명에는 정부·공식 출처와 기준일을 병기합니다.</p>
            </article>
            <article className="rounded-[20px] bg-white border border-gray-200 p-8">
              <span className={pillarBadge} aria-hidden="true">03</span>
              <h3 className="mt-4 text-xl font-bold text-gray-900">대표·팀의 전문성</h3>
              <p className="mt-3 text-[15px] text-gray-600 leading-relaxed">대표이사 오제환과 현지 네트워크를 갖춘 팀이 함께합니다.</p>
              {/* 입력 필요: 대표·팀 약력은 사실 확인 후 기재 */}
              <p className="mt-3 inline-block rounded-lg bg-gray-50 border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-400">대표·핵심 인력 약력 입력 예정 (사실 확인 후 기재)</p>
            </article>
            <article className="rounded-[20px] bg-white border border-gray-200 p-8">
              <span className={pillarBadge} aria-hidden="true">04</span>
              <h3 className="mt-4 text-xl font-bold text-gray-900">투명한 프로세스</h3>
              <p className="mt-3 text-[15px] text-gray-600 leading-relaxed">단계별 역할·일정·필요서류를 사전에 안내하고, 비용·절차를 투명하게 고지합니다. 현지 선발과 검증, 출입국 행정, 입국 후 정착 지원의 담당 범위를 명확히 나누어 관리합니다.</p>
            </article>
          </div>
        </div>

        <div className="mt-8 rounded-[20px] bg-primary-dark text-white p-8 lg:p-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-deepest to-primary-main/50" aria-hidden="true"></div>
          <div className="relative">
            <h3 className="text-lg font-bold">우리는 다음을 하지 않습니다</h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3 text-sm text-white/85">
              <li className="flex gap-2">
                <span className="text-gold-light" aria-hidden="true">—</span> 송출국 규정에 어긋나는 과다 수수료 수취
              </li>
              <li className="flex gap-2">
                <span className="text-gold-light" aria-hidden="true">—</span> 인신매매·불법 알선, 인권·노동권 침해
              </li>
              <li className="flex gap-2">
                <span className="text-gold-light" aria-hidden="true">—</span> 검증되지 않은 비자 안내와 과장된 약속
              </li>
            </ul>
            <p className="mt-4 text-xs text-white/55">한국·일본·네팔 각국 노동·출입국 법규를 준수합니다.</p>
          </div>
        </div>
      </section>

      {/* 하단 CTA 배너 */}
      <CtaBanner />
    </main>
  );
}
