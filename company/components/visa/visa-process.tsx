export interface VisaProcessStep {
  title: string;
  desc: string;
}

// 절차 타임라인 - 번호가 매겨진 헤어라인 행 목록
export default function VisaProcess({ steps }: { steps: VisaProcessStep[] }) {
  return (
    <ol className="border-t border-line">
      {steps.map((step, index) => (
        <li key={step.title} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 border-b border-line py-6">
          <span className="pt-1 text-meta tabular-nums text-muted" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <h3 className="text-lg font-bold tracking-[-0.02em] text-ink">{step.title}</h3>
            <p className="mt-2 text-description text-muted">{step.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
