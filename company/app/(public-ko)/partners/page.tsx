import type { Metadata } from "next";
import { PartnersContent } from "@/components/page-content/partners-content";
import { getMessages } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  ...getMessages("ko").pages.partners.metadata,
  path: "/partners",
});

export default function PartnersPage() {
  return <PartnersContent />;
}
