import { serializeJsonLd } from "@/components/json-ld";
import { BRAND_ASSETS } from "@/lib/brand";
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
    name: SITE.brandName.ko,
    legalName: SITE.legalName.ko,
    // 브랜드 영문명과 법인 영문명이 같으면 한 번만 넣는다
    alternateName: [...new Set([SITE.brandName.en, SITE.legalName.en])],
    url: SITE_URL,
    logo: `${SITE_URL}${BRAND_ASSETS.lockup.color}`,
    image: `${SITE_URL}${BRAND_ASSETS.social}`,
    description: SITE.description,
    telephone: SITE.phones.map((phone) => phone.international),
    ...(SITE.email
      ? {
          email: SITE.email,
        }
      : {}),
    contactPoint: [
      ...(SITE.email
        ? [{
            "@type": "ContactPoint",
            email: SITE.email,
            contactType: "customer service",
          }]
        : []),
      ...SITE.phones.map((phone) => ({
        "@type": "ContactPoint",
        telephone: phone.international,
        contactType: "customer service",
        areaServed: phone.countryCode,
      })),
    ],
    ...(SITE.bizRegNo ? { taxID: SITE.bizRegNo } : {}),
    ...(SITE.streetAddress
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: SITE.streetAddress,
            addressCountry: "KR",
          },
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      // 구조화 데이터는 신뢰 소스(내부 상수)에서만 생성하고, json-ld.tsx와 같은 방식으로 직렬화한다
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}
