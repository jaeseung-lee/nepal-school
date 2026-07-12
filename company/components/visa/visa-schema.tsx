import JsonLd from "@/components/json-ld";
import { SITE_URL } from "@/lib/site";
import type { Visa } from "@/lib/visas";

// 비자 상세 페이지의 구조화 데이터: BreadcrumbList + FAQPage.
// FAQ는 화면 아코디언과 같은 visa.faqs 배열에서 생성되어 항상 동기화된다.
// (구글의 FAQ 리치 결과 노출은 제한적이지만, AI 검색·엔티티 인식 신호로 유지 비용이 거의 없다)
export default function VisaSchema({ visa }: { visa: Visa }) {
  const pageUrl = `${SITE_URL}/visa/${visa.slug}`;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "비자 정보", item: `${SITE_URL}/visa` },
      { "@type": "ListItem", position: 3, name: visa.nameKo, item: pageUrl },
    ],
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: visa.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={faqPage} />
    </>
  );
}
