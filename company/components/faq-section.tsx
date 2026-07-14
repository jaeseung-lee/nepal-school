import { Plus } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import JsonLd from "@/components/json-ld";
import { getMessages, type Locale } from "@/lib/i18n";

// FAQPage JSON-LD와 화면은 같은 카탈로그 값에서 파생해 항상 동기화한다.
const FAQ_KEYS = ["company", "visa", "process", "countries", "trust"] as const;

export default function FaqSection({ locale }: { locale?: Locale }) {
  const faqCopy = getMessages(locale).home.faq;
  const faqs = FAQ_KEYS.map((key) => ({ key, ...faqCopy.items[key] }));

  return (
    <section className="border-t border-line bg-paper">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: { "@type": "Answer", text: faq.a },
          })),
        }}
      />
      <div className="max-w-content mx-auto grid gap-10 px-5 py-20 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-28">
        <div>
          <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">
            {faqCopy.title}
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
            {faqCopy.description}
          </p>
          <div className="relative mt-8 min-h-[260px] overflow-hidden rounded-[28px] border border-line bg-gray-100">
            <Image src="/kv/redesign/consultation.webp" alt={faqCopy.alt} fill sizes="(min-width: 1024px) 430px, 100vw" className="object-cover" />
          </div>
        </div>

        <div className="divide-y divide-line rounded-[28px] border border-line bg-surface">
          {faqs.map((faq, index) => (
            <details key={faq.key} open={index === 0} className="group">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-5 text-[17px] font-semibold text-ink marker:content-none sm:px-7 [&::-webkit-details-marker]:hidden">
                {faq.q}
                <Plus size={20} className="shrink-0 text-cobalt transition-transform group-open:rotate-45" aria-hidden="true" />
              </summary>
              <p className="px-5 pb-6 pr-12 text-[15px] leading-relaxed text-muted sm:px-7">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
