import type { Metadata } from "next";
import PrivacyContent from "@/components/page-content/privacy-content";
import { PRIVACY_COPY } from "@/lib/privacy-copy";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  ...PRIVACY_COPY.ko,
  title: PRIVACY_COPY.ko.title,
  description: PRIVACY_COPY.ko.description,
  path: "/privacy",
});

export default function PrivacyPage() {
  return <PrivacyContent locale="ko" />;
}
