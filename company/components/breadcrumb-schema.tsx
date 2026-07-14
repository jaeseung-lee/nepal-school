import JsonLd from "@/components/json-ld";
import { getMessages, localizedHref, type Locale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

// 하위 페이지 공용 BreadcrumbList 구조화 데이터 (홈 → 현재 페이지).
// page-banner.tsx의 시각적 브레드크럼과 짝을 이룬다.
// 비자 상세 페이지는 visa-schema.tsx가 3단 구조(홈 → 비자 정보 → 상세)로 별도 렌더한다.
export default function BreadcrumbSchema({ name, path, locale }: { name: string; path: string; locale?: Locale }) {
  const messages = getMessages(locale);
  const localizedPath = localizedHref(locale ?? "ko", path);
  const localizedHome = localizedHref(locale ?? "ko", "/");

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: messages.common.home, item: `${SITE_URL}${localizedHome}` },
          { "@type": "ListItem", position: 2, name, item: `${SITE_URL}${localizedPath}` },
        ],
      }}
    />
  );
}
