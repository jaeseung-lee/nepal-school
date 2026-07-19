import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import WhyContent from "@/components/page-content/why-content";

export const metadata: Metadata = buildPageMetadata({
  title: "신뢰·전문성",
  description:
    "신생 기업인 정우인재개발원이 공개하는 네팔 6개 기관 MOU, 제도·법규 확인 기준, 대표와 팀의 역할, 투명한 절차를 소개합니다.",
  path: "/why",
});

export default function WhyPage() {
  return <WhyContent />;
}
