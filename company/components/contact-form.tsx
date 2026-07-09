import { ArrowRight, ClipboardText, EnvelopeSimple, WarningCircle } from "@phosphor-icons/react/dist/ssr";

const REQUEST_ITEMS = [
  "채용 희망 직무와 인원",
  "희망 입국 시기",
  "검토 중인 비자나 제도",
  "근무 지역과 숙소 지원 여부",
];

export default function ContactForm() {
  return (
    <div className="rounded-[28px] border border-line bg-surface p-7 shadow-sm shadow-ink/5 lg:p-9">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
        <ClipboardText size={26} weight="duotone" aria-hidden="true" />
      </div>
      <h3 className="mt-6 font-display text-2xl font-semibold text-ink">웹 문의 연동 준비 중</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        현재 이 화면에서는 내용을 전송하지 않습니다. 실제 접수 채널이 확정되기 전까지는 기업이 준비해야 할 정보를 먼저 안내합니다.
      </p>

      <div className="mt-7 rounded-[22px] border border-line bg-paper p-5">
        <h4 className="text-sm font-semibold text-ink">상담 전 정리하면 좋은 정보</h4>
        <ul className="mt-4 grid gap-3 text-sm text-muted">
          {REQUEST_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <ArrowRight size={16} className="mt-0.5 shrink-0 text-cobalt" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-[18px] border border-cobalt/20 bg-cobalt-soft p-4 text-sm text-cobalt-ink">
        <WarningCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>폼 제출 버튼을 임시로 만들지 않았습니다. 실제 이메일 또는 접수 endpoint가 정해지면 이 영역을 전송 폼으로 전환합니다.</p>
      </div>

      <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink">
        <EnvelopeSimple size={18} weight="duotone" aria-hidden="true" />
        접수 채널 확정 후 활성화
      </div>
    </div>
  );
}
