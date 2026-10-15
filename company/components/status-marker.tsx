import type { ReactNode } from "react";

/** 색 대신 모양으로 상태를 구분한다: 채움(완료·확인), 반채움(진행 중), 빈 원(예정·검토). */
export type StatusTone = "filled" | "half" | "hollow";

const DOT_CLASS: Record<StatusTone, string> = {
  filled: "bg-current",
  half: "bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)] ring-1 ring-current ring-inset",
  hollow: "ring-1 ring-current ring-inset",
};

/** 점 모양 + 항상 보이는 텍스트 라벨. 글자색이 점 색을 정하므로 어두운 면에서는 text-white와 함께 쓴다. */
export default function StatusMarker({ tone, children, className = "" }: { tone: StatusTone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-meta font-semibold ${className}`}>
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${DOT_CLASS[tone]}`} />
      {children}
    </span>
  );
}
