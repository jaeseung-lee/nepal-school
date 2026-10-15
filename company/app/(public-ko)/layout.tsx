import type { Metadata } from "next";
import PublicShell from "@/components/public-shell";
import { pretendard } from "@/app/fonts";
import { buildRootMetadata } from "@/lib/seo";
import "../globals.css";

export const metadata: Metadata = buildRootMetadata("ko");

// 요청마다 렌더되는 공개 페이지(홈·블로그)는 방문자가 많은 한국·일본에 가까운 서울 리전에서 실행한다.
// 지정하지 않으면 Vercel 기본값인 미국 동부(iad1)에서 실행된다. 정적 리터럴만 허용되어 [locale] 레이아웃에도 같은 값을 둔다.
export const preferredRegion = "icn1";

export default function KoreanPublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="bg-paper font-sans text-ink antialiased">
        <PublicShell locale="ko">{children}</PublicShell>
      </body>
    </html>
  );
}
