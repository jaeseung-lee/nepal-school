import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import WhyContent from "@/components/page-content/why-content";

export const metadata: Metadata = buildPageMetadata({
  title: "신뢰·전문성",
  description:
    "신생 회사인데 왜 믿을 수 있는가. 네팔 6개 기관 MOU를 포함한 검증된 파트너십, 제도·법규 전문성, 대표·팀 전문성, 투명한 프로세스.",
  path: "/why",
});

export default function WhyPage() {
  return <WhyContent />;
}
