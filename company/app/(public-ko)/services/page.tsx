import type { Metadata } from "next";
import { ServicesContent } from "@/components/page-content/services-content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "사업영역",
  description:
    "일본 개호 인재 채용, 일본 숙박 인재 채용, 한국 유학생 모집, 한국 용접 인재 채용의 네 가지 사업영역을 소개합니다. 네팔 현지 선발·교육부터 비자·입국·정착까지 지원합니다.",
  path: "/services",
});

export default function ServicesPage() {
  return <ServicesContent />;
}
