import type { Metadata } from "next";
import { CheckCircle, ShieldCheck, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import PageBanner from "@/components/page-banner";
import CtaBanner from "@/components/cta-banner";
import Reveal from "@/components/reveal";

export const metadata: Metadata = {
  title: "신뢰·전문성",
  description:
    "신생 회사인데 왜 믿을 수 있는가. Richhood Overseas MOU를 포함한 검증된 파트너십, 제도·법규 전문성, 대표·팀 전문성, 투명한 프로세스.",
  alternates: { canonical: "/why" },
};

const principles = [
  {
    title: "검증된 파트너십",
    desc: "2026년 7월 5일 Richhood Overseas Inc. (P) Ltd.와 MOU를 체결해 네팔 근로자 선발, 자격 검증, 출입국 행정 협력 체계를 마련했습니다.",
  },
  {
    title: "제도와 법규 확인",
    desc: "한국의 E-9, E-7, D-2, D-4, E-8과 일본 특정기능 1호를 정부 공식 기준에 맞춰 검토합니다.",
  },
  {
    title: "대표와 현지 네트워크",
    desc: "대표이사 오제환과 현지 협력망을 갖춘 팀이 선발, 교육, 비자, 정착 흐름을 나누어 관리합니다.",
  },
  {
    title: "투명한 프로세스",
    desc: "단계별 역할, 일정, 필요서류, 비용과 절차를 사전에 안내하고 담당 범위를 분명히 나눕니다.",
  },
];

const refusals = [
  "송출국 규정에 어긋나는 과다 수수료 수취",
  "인신매매, 불법 알선, 노동권 침해",
  "검증되지 않은 비자 안내와 과장된 약속",
];

export default function WhyPage() {
  return (
    <main>
      <PageBanner
        eyebrow="운영 원칙"
        context="확인 가능한 사실과 제도 기준"
        titleKo="신뢰 기준"
        desc="화려한 약속보다 확인 가능한 사실, 제도 기준, 협력 역할을 먼저 공개합니다."
        crumb="신뢰·전문성"
        bgImage="/kv/banner-why.webp"
      />

      <section className="bg-paper">
        <div className="max-w-content mx-auto grid gap-10 px-5 py-20 lg:grid-cols-[0.9fr_1.15fr] lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">
              신뢰는 주장보다 운영 방식에서 나옵니다
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
              신생 기업이기 때문에 더 좁고 명확하게 말합니다. 확인 가능한 파트너십과 제도 범위만 공개합니다.
            </p>
            <div className="relative mt-8 min-h-[320px] overflow-hidden rounded-[28px] border border-line bg-gray-100">
              <Image src="/kv/redesign/principles.webp" alt="프로세스와 원칙을 검토하는 회의 장면" fill sizes="(min-width: 1024px) 430px, 100vw" className="object-cover" />
            </div>
          </Reveal>

          <Reveal delay={0.08} className="grid gap-4">
            {principles.map((item) => (
              <article key={item.title} className="rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5">
                <div className="flex gap-4">
                  <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
                    <CheckCircle size={22} weight="duotone" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-ink">{item.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-muted">{item.desc}</p>
                  </div>
                </div>
              </article>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="bg-paper-soft">
        <div className="max-w-content mx-auto px-5 py-16 lg:px-8 lg:py-20">
          <Reveal className="rounded-[28px] border border-line bg-surface p-7 shadow-sm shadow-ink/5 lg:p-9">
            <div className="flex max-w-3xl flex-col gap-4 sm:flex-row">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
                <ShieldCheck size={26} weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">우리는 다음을 하지 않습니다</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">한국, 일본, 네팔 각국 노동과 출입국 법규를 기준으로 운영합니다.</p>
              </div>
            </div>
            <ul className="mt-7 grid gap-3 lg:grid-cols-3">
              {refusals.map((item) => (
                <li key={item} className="flex gap-3 rounded-[18px] border border-line bg-paper p-4 text-sm leading-relaxed text-ink">
                  <WarningCircle size={20} className="mt-0.5 shrink-0 text-clay" weight="duotone" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
