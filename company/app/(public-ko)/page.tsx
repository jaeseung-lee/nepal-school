import { HomeContent } from "@/components/page-content/home-content";

import { getMessages } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/seo";

const messages = getMessages("ko");
export const metadata = buildPageMetadata({
  title: messages.site.seoTitle,
  description: `${messages.site.description} ${messages.network.description}`,
  path: "/",
});

export default function HomePage() {
  return <HomeContent />;
}
