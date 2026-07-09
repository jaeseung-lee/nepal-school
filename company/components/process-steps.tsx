import { ArrowRight, ClipboardText, GlobeHemisphereEast, UserFocus } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";

const PHASES = [
  {
    title: "현지 준비",
    desc: "모집 이후 바로 송출하지 않고 직무, 언어, 문화 적응을 먼저 확인합니다.",
    steps: ["선발", "교육", "시험"],
    icon: UserFocus,
  },
  {
    title: "기업 매칭",
    desc: "기업 요건과 제도 요건을 함께 검토한 뒤 계약과 비자 절차로 넘깁니다.",
    steps: ["매칭", "계약과 비자"],
    icon: ClipboardText,
  },
  {
    title: "입국 이후",
    desc: "배치 이후에도 생활 지원과 행정 확인을 이어가 정착 리스크를 줄입니다.",
    steps: ["입국", "정착"],
    icon: GlobeHemisphereEast,
  },
];

export default function ProcessSteps() {
  return (
    <section className="border-y border-line bg-paper-soft">
      <div className="max-w-content mx-auto grid gap-10 px-5 py-20 lg:grid-cols-[0.9fr_1.25fr] lg:px-8 lg:py-28">
        <div>
          <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">
            선발부터 정착까지 한 흐름으로 관리합니다
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
            7단계를 세 그룹으로 나누어 누가, 언제, 무엇을 확인하는지 기업이 이해하기 쉽게 정리합니다.
          </p>
          <div className="relative mt-8 min-h-[260px] overflow-hidden rounded-[28px] border border-line bg-gray-100">
            <Image src="/kv/redesign/process.webp" alt="비자와 계약 절차를 상징하는 문서 이미지" fill sizes="(min-width: 1024px) 430px, 100vw" className="object-cover" />
          </div>
        </div>
        <div className="grid gap-4">
          {PHASES.map((phase) => {
            const Icon = phase.icon;
            return (
              <article key={phase.title} className="rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
                    <Icon size={25} weight="duotone" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-ink">{phase.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{phase.desc}</p>
                  </div>
                </div>
                <ol className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {phase.steps.map((step, index) => (
                    <li key={step} className="flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink">
                      {step}
                      {index < phase.steps.length - 1 ? <ArrowRight size={14} className="text-cobalt" aria-hidden="true" /> : null}
                    </li>
                  ))}
                </ol>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
