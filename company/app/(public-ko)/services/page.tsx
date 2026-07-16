import type { Metadata } from "next";
import { ServicesContent } from "@/components/page-content/services-content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "사업영역",
  description:
    "네팔 직업훈련학교, 한국 취업비자(E-9·E-7·D-2·D-4), 일본 특정기능까지. 정우인재개발원의 3대 사업영역과 원스톱 프로세스.",
  path: "/services",
});

export default function ServicesPage() {
  return <ServicesContent />;
}
