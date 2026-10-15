import { Plus } from "@phosphor-icons/react/dist/ssr";
import type { VisaFaq } from "@/lib/visas";

// 파라미터화된 FAQ 아코디언 - 홈의 faq-section.tsx 우측 컬럼과 같은 스타일.
// 여기 렌더되는 faqs는 visa-schema.tsx의 FAQPage JSON-LD와 같은 배열이다.
export default function FaqList({ faqs }: { faqs: VisaFaq[] }) {
  return (
    <div className="border-t border-line">
      {faqs.map((faq, index) => (
        <details key={faq.q} open={index === 0} className="group border-b border-line">
          <summary className="grid min-h-11 cursor-pointer list-none grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-x-3 py-7 marker:content-none [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true" className="pt-1 text-meta tabular-nums text-muted">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-[17px] font-bold leading-snug tracking-[-0.02em] text-ink sm:text-lg">{faq.q}</span>
            <Plus size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-ink transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" />
          </summary>
          <p className="pb-8 pl-12 pr-8 text-description text-muted">{faq.a}</p>
        </details>
      ))}
    </div>
  );
}
