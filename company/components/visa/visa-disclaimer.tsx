import { Info } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

// 모든 비자 페이지 공통 고지 - 제도 변동 가능성과 일반 정보임을 명시 (사실 안전장치)
export default function VisaDisclaimer() {
  return (
    <div className="flex gap-3 rounded-[18px] border border-line bg-paper p-5 text-sm leading-relaxed text-muted">
      <Info size={20} className="mt-0.5 shrink-0 text-cobalt" weight="duotone" aria-hidden="true" />
      <p>
        비자 제도와 수치는 정부 고시·각의결정에 따라 변경될 수 있습니다. 이 페이지의 내용은 작성 시점
        기준의 일반 정보이며, 개별 기업의 요건과 최신 기준은{" "}
        <Link href="/contact" className="font-medium text-cobalt underline underline-offset-2">
          상담 문의
        </Link>
        를 통해 확인해 주세요.
      </p>
    </div>
  );
}
