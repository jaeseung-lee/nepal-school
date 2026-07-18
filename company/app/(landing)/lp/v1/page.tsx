import type { Metadata } from "next";
import JsonLd from "@/components/json-ld";
import KtsCaregiverLanding from "@/components/lp/kts-caregiver-landing";
import OrganizationSchema from "@/components/organization-schema";
import { LP_V1_META } from "@/lib/lp-v1-copy";
import { SITE, SITE_URL } from "@/lib/site";

const PAGE_PATH = "/lp/v1";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const TITLE = LP_V1_META.ko.title;
const DESCRIPTION = LP_V1_META.ko.description;
const OG_IMAGE_PATH = "/lp/v1/og.png";
const OG_IMAGE_URL = `${SITE_URL}${OG_IMAGE_PATH}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "KTS 돌봄 교육",
    "네팔 간병인 교육",
    "Caregiver Aged Care",
    "ネパール 介護人材",
    "介護 職業訓練",
  ],
  alternates: { canonical: PAGE_PATH },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: PAGE_URL,
    siteName: SITE.brandName.ko,
    locale: "ko_KR",
    alternateLocale: ["ja_JP"],
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: "Kathmandu Technical School 돌봄 직업훈련 과정",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE_URL],
  },
};

export default function KtsCaregiverLandingPage() {
  return (
    <>
      <OrganizationSchema />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": `${SITE_URL}/#website`,
          url: SITE_URL,
          name: SITE.brandName.ko,
          alternateName: SITE.brandName.en,
          inLanguage: ["ko", "en", "ja", "ne", "vi", "lo"],
          publisher: { "@id": `${SITE_URL}/#organization` },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${PAGE_URL}#webpage`,
          url: PAGE_URL,
          name: TITLE,
          alternateName: LP_V1_META.ja.title,
          description: DESCRIPTION,
          inLanguage: ["ko", "ja"],
          isPartOf: { "@id": `${SITE_URL}/#website` },
          about: { "@id": `${SITE_URL}/#organization` },
          primaryImageOfPage: {
            "@type": "ImageObject",
            url: OG_IMAGE_URL,
            width: 1200,
            height: 630,
          },
        }}
      />
      <KtsCaregiverLanding />
    </>
  );
}
