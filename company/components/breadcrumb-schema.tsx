import JsonLd from "@/components/json-ld";
import { SITE_URL } from "@/lib/site";

// 하위 페이지 공용 BreadcrumbList 구조화 데이터 (홈 → 현재 페이지).
// page-banner.tsx의 시각적 브레드크럼과 짝을 이룬다.
// 비자 상세 페이지는 visa-schema.tsx가 3단 구조(홈 → 비자 정보 → 상세)로 별도 렌더한다.
export default function BreadcrumbSchema({ name, path }: { name: string; path: string }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
          { "@type": "ListItem", position: 2, name, item: `${SITE_URL}${path}` },
        ],
      }}
    />
  );
}
