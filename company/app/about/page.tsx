import type { Metadata } from "next";
import { AboutContent } from "@/components/page-content/about-content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "회사소개",
  description:
    "네팔 인재를 현지 교육부터 양성해 한국·일본 기업에 합법적으로 연결하는 글로벌 인적자원 개발 기업, 정우인재개발원 회사소개.",
  path: "/about",
});

export default function AboutPage() {
  return <AboutContent />;
}
