import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import LocaleDocumentAttributes from "@/components/locale-document-attributes";
import OrganizationSchema from "@/components/organization-schema";
import JsonLd from "@/components/json-ld";
import { SITE, SITE_URL } from "@/lib/site";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

const defaultTitle = `${SITE.nameKo} - ${SITE.seoTitle}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: defaultTitle,
    template: `%s - ${SITE.nameKo}`,
  },
  description: SITE.description,
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
        {/* Pretendard CDN은 렌더링 차단 리소스 - preconnect로 DNS/TCP/TLS 왕복을 선행시킨다 */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="bg-paper font-sans text-ink antialiased">
        <LocaleDocumentAttributes />
        <OrganizationSchema />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            url: SITE_URL,
            name: SITE.nameKo,
            inLanguage: "ko",
            publisher: { "@id": `${SITE_URL}/#organization` },
          }}
        />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
