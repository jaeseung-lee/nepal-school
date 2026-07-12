export interface VisaProcessStep {
  title: string;
  desc: string;
}

// 절차 타임라인 - 번호가 매겨진 세로 단계 목록
export default function VisaProcess({ steps }: { steps: VisaProcessStep[] }) {
  return (
    <ol className="grid gap-4">
      {steps.map((step, index) => (
        <li
          key={step.title}
          className="flex gap-4 rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cobalt-soft font-display text-lg font-semibold text-cobalt">
            {index + 1}
          </span>
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">{step.title}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{step.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
