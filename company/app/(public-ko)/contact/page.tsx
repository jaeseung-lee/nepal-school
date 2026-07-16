import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import ContactContent from "@/components/page-content/contact-content";

export const metadata: Metadata = buildPageMetadata({
  title: "문의",
  description: "외국인력 채용·제휴 문의. 기업 요건을 알려주시면 적합한 인재와 절차를 안내드립니다.",
  path: "/contact",
});

export default function ContactPage() {
  return <ContactContent />;
}
