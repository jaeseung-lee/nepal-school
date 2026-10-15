import { ArrowUpRight, Plus } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import JsonLd from "@/components/json-ld";
import { getMessages, localizedHref, type Locale } from "@/lib/i18n";
import { SECTION_LABELS } from "@/lib/section-labels";

// FAQPage JSON-LD와 화면은 같은 카탈로그 값에서 파생해 항상 동기화한다.
const FAQ_KEYS = ["company", "visa", "process", "countries"] as const;

export default function FaqSection({ locale = "ko" }: { locale?: Locale }) {
  const faqCopy = getMessages(locale).home.faq;
  const faqs = FAQ_KEYS.map((key) => ({ key, ...faqCopy.items[key] }));

  return (
    <section aria-labelledby="faq-title" className="border-t border-line bg-paper py-section">
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
      <div className="page-wrap grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="eyebrow text-ink" lang="en">
            {SECTION_LABELS.questions}
          </p>
          <h2 id="faq-title" className="mt-5 max-w-[14em] text-headline text-balance text-ink">
            {faqCopy.title}
          </h2>
          <p className="mt-6 max-w-[30rem] text-description text-muted">{faqCopy.description}</p>
        </div>

        <div className="border-t border-line">
          {faqs.map((faq, index) => (
            <details key={faq.key} open={index === 0} className="group border-b border-line">
              <summary className="grid min-h-11 cursor-pointer list-none grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-x-3 py-7 marker:content-none [&::-webkit-details-marker]:hidden">
                <span aria-hidden="true" className="pt-1 text-meta tabular-nums text-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-[17px] font-bold leading-snug tracking-[-0.02em] text-ink sm:text-lg">{faq.q}</span>
                <Plus size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-ink transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" />
              </summary>
              <div className="pb-8 pl-12 pr-8">
                <p className="text-description text-muted">{faq.a}</p>
                {"linkLabel" in faq ? (
                  <Link
                    href={localizedHref(locale, "/visa")}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink underline decoration-ink/35 underline-offset-4 hover:decoration-ink"
                  >
                    {faq.linkLabel} <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
