import { SITE, SITE_URL } from "@/lib/site";

// Organization 구조화 데이터 (JSON-LD)
// 구글 리치 결과와 AI 검색(ChatGPT·Perplexity·AI Overviews)의
// "엔티티 인식"을 위한 핵심 신호. 루트 레이아웃 <body>에서 1회 렌더한다.
export default function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    // WebSite.publisher(layout.tsx)가 이 @id로 상호 참조한다
    "@id": `${SITE_URL}/#organization`,
    name: SITE.nameKo,
    legalName: SITE.nameEn,
    alternateName: SITE.alternateName,
    url: SITE_URL,
    logo: `${SITE_URL}/opengraph-image`,
    image: `${SITE_URL}/opengraph-image`,
    description: SITE.description,
    foundingDate: SITE.foundingDate,
    founder: { "@type": "Person", name: SITE.founder },
    knowsLanguage: ["ko", "en", "ja", "ne"],
    areaServed: SITE.areaServed.map((name) => ({
      "@type": "Country",
      name,
    })),
    // 값이 채워지면 자동 포함 (미확정 필드는 스키마에서 제외해 오류 방지)
    ...(SITE.bizRegNo ? { taxID: SITE.bizRegNo } : {}),
    ...(SITE.email ? { email: SITE.email } : {}),
    ...(SITE.telephone ? { telephone: SITE.telephone } : {}),
    ...(SITE.streetAddress
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: SITE.streetAddress,
            addressCountry: "KR",
          },
        }
      : {}),
    ...(SITE.sameAs.length ? { sameAs: SITE.sameAs } : {}),
  };

  return (
    <script
      type="application/ld+json"
      // 구조화 데이터는 신뢰 소스(내부 상수)에서만 생성 - XSS 위험 없음
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
