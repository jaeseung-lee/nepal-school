import type { Metadata } from "next";
import { SITE } from "./site";

// 페이지별 canonical + OG/Twitter 메타 생성 헬퍼.
// Next.js 메타데이터는 최상위 필드 단위 얕은 병합이라 페이지에서 openGraph를
// 정의하면 layout의 openGraph 전체가 대체된다 - type/siteName/locale을 매번 포함해야 한다.
// openGraph.title에는 layout의 title.template이 적용되지 않으므로 여기서 직접 조립한다.
export function buildPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const fullTitle = `${title} - ${SITE.nameKo}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE.nameKo,
      locale: SITE.locale,
      url: path,
      title: fullTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
  };
}
