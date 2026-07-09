import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import OrganizationSchema from "@/components/organization-schema";
import { SITE, SITE_URL } from "@/lib/site";
import "./globals.css";

// 영문 디스플레이 폰트 (국문 본문 Pretendard는 layout <head>의 CDN 스타일시트로 로드)
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

const defaultTitle = `${SITE.nameKo} — ${SITE.slogan}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: defaultTitle,
    template: `%s — ${SITE.nameKo}`,
  },
  description: SITE.description,
  // 홈(/)의 canonical. 하위 페이지는 각 page.tsx에서 자기 경로로 재정의한다.
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.nameKo,
    locale: SITE.locale,
    url: SITE_URL,
    title: defaultTitle,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: SITE.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={outfit.variable}>
      <head>
        {/* 국문 본문 폰트: Pretendard (jsDelivr CDN) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="font-sans text-gray-900 bg-white antialiased">
        <OrganizationSchema />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
