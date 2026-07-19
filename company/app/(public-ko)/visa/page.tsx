import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import VisaHubContent from "@/components/page-content/visa-hub-content";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "외국인 채용 비자 정보 - 한국 E-9·E-7·D-2·D-4, 일본 특정기능",
    description:
      "외국인 인력 채용에 쓰이는 비자와 제도를 안내합니다. 한국 고용허가제 E-9, 전문인력 E-7, 유학 D-2·D-4와 일본 특정기능 1호, 개호·숙박 분야, 육성취로의 요건과 절차를 확인하세요.",
    path: "/visa",
  }),
  keywords: ["외국인 채용 비자", "외국인 근로자 비자", "취업비자 종류", "고용허가제", "특정기능"],
};

export default function VisaHubPage() {
  return <VisaHubContent />;
}
