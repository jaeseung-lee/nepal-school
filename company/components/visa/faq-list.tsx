import { Plus } from "@phosphor-icons/react/dist/ssr";
import type { VisaFaq } from "@/lib/visas";

// 파라미터화된 FAQ 아코디언 - 홈의 faq-section.tsx 우측 컬럼과 같은 스타일.
// 여기 렌더되는 faqs는 visa-schema.tsx의 FAQPage JSON-LD와 같은 배열이다.
export default function FaqList({ faqs }: { faqs: VisaFaq[] }) {
  return (
    <div className="divide-y divide-line rounded-[28px] border border-line bg-surface">
      {faqs.map((faq, index) => (
        <details key={faq.q} open={index === 0} className="group">
          <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-5 text-[17px] font-semibold text-ink marker:content-none sm:px-7 [&::-webkit-details-marker]:hidden">
            {faq.q}
            <Plus size={20} className="shrink-0 text-cobalt transition-transform group-open:rotate-45" aria-hidden="true" />
          </summary>
          <p className="px-5 pb-6 pr-12 text-[15px] leading-relaxed text-muted sm:px-7">{faq.a}</p>
        </details>
      ))}
    </div>
  );
}
