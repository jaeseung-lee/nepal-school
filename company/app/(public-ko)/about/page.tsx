import type { Metadata } from "next";
import { AboutContent } from "@/components/page-content/about-content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "회사소개",
  description:
    "네팔 인재를 현지에서 교육해 한국·일본 기업에 합법적으로 연결하는 정우인재개발원을 소개합니다.",
  path: "/about",
});

export default function AboutPage() {
  return <AboutContent />;
}
