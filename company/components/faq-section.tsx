import { Plus } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/components/json-ld";

// a: FAQPage JSON-LD용 순수 텍스트(항상 필수), render: 링크 등이 필요한 경우의 표시용 JSX.
// 두 값은 같은 내용을 유지해야 화면과 구조화 데이터가 어긋나지 않는다.
const FAQS: { q: string; a: string; render?: React.ReactNode }[] = [
  {
    q: "정우인재개발원은 어떤 회사인가요?",
    a: "정우인재개발원은 네팔 인재를 현지 직업훈련부터 양성해 한국과 일본 기업에 합법적으로 연결하는 글로벌 인적자원 개발 기업입니다.",
  },
  {
    q: "어떤 취업비자와 제도를 지원하나요?",
    a: "한국은 E-9, E-7, D-2, D-4, E-8을 지원하고 일본은 특정기능 1호를 지원합니다. 기업 요건과 직무에 맞는 제도를 검토합니다. 제도별 요건과 절차는 비자 정보 페이지에서 확인할 수 있습니다.",
    render: (
      <>
        한국은 E-9, E-7, D-2, D-4, E-8을 지원하고 일본은 특정기능 1호를 지원합니다. 기업 요건과
        직무에 맞는 제도를 검토합니다. 제도별 요건과 절차는{" "}
        <Link href="/visa" className="font-medium text-cobalt underline underline-offset-2">
          비자 정보
        </Link>
        에서 확인할 수 있습니다.
      </>
    ),
  },
  {
    q: "채용은 어떤 절차로 진행되나요?",
    a: "선발, 교육, 시험, 매칭, 계약과 비자, 입국, 정착의 흐름으로 진행됩니다. 각 단계는 현지 파트너와 역할을 나누어 관리합니다.",
  },
  {
    q: "어느 나라의 인재를 연결하나요?",
    a: "네팔 현지에서 양성한 인재를 한국과 일본 기업에 연결합니다. 현재 협력망은 3개국을 중심으로 운영됩니다.",
  },
  {
    q: "신생 기업인데 신뢰할 수 있나요?",
    a: "검증 가능한 객관 지표만 공개하고 확인할 수 없는 취업자 수나 순위는 표기하지 않습니다. 네팔 5개 기관과의 MOU를 포함한 협력 체계를 기반으로 운영합니다.",
  },
];

export default function FaqSection() {
  return (
    <section className="border-t border-line bg-paper">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((faq) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: { "@type": "Answer", text: faq.a },
          })),
        }}
      />
      <div className="max-w-content mx-auto grid gap-10 px-5 py-20 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-28">
        <div>
          <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">
            기업이 먼저 확인해야 할 질문
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
            외국인력 채용은 제도와 역할을 먼저 확인해야 리스크를 줄일 수 있습니다.
          </p>
          <div className="relative mt-8 min-h-[260px] overflow-hidden rounded-[28px] border border-line bg-gray-100">
            <Image src="/kv/redesign/consultation.webp" alt="기업 상담 장면" fill sizes="(min-width: 1024px) 430px, 100vw" className="object-cover" />
          </div>
        </div>

        <div className="divide-y divide-line rounded-[28px] border border-line bg-surface">
          {FAQS.map((faq, index) => (
            <details key={faq.q} open={index === 0} className="group">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-5 text-[17px] font-semibold text-ink marker:content-none sm:px-7 [&::-webkit-details-marker]:hidden">
                {faq.q}
                <Plus size={20} className="shrink-0 text-cobalt transition-transform group-open:rotate-45" aria-hidden="true" />
              </summary>
              <p className="px-5 pb-6 pr-12 text-[15px] leading-relaxed text-muted sm:px-7">{faq.render ?? faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
