import type { Metadata } from "next";
import { HomeContent } from "@/components/page-content/home-content";

import { getMessages } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/seo";

const messages = getMessages("ko");
// 레이아웃과 같은 세그먼트의 page에는 title.template이 적용되지 않으므로 회사명을 직접 붙인다.
export const metadata: Metadata = {
  ...buildPageMetadata({
    title: messages.site.seoTitle,
    description: `${messages.site.description} ${messages.network.description}`,
    path: "/",
  }),
  title: { absolute: `${messages.site.seoTitle} - ${messages.site.name}` },
};

export default function HomePage() {
  return <HomeContent />;
}
