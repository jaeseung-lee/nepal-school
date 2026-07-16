import type { Metadata } from "next";
import { PartnersContent } from "@/components/page-content/partners-content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "파트너십",
  description:
    "네팔 현지 5개 기관과 2026년 7월 국제사업 MOU 체결. 인력송출 3개사와 직업기술·교육 2개 기관이 선발·검증·교육·출입국 행정을 분담합니다.",
  path: "/partners",
});

export default function PartnersPage() {
  return <PartnersContent />;
}
