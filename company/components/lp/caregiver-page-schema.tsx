import JsonLd from "@/components/json-ld";
import { businessAreaPath } from "@/lib/business-area-seo";
import { LP_V1_META, type LpV1Locale } from "@/lib/lp-v1-copy";
import { SITE_URL } from "@/lib/site";

const CAREGIVER_SLUG = "japan-caregiver" as const;

export default function CaregiverPageSchema({ locale }: { locale: LpV1Locale }) {
  const url = `${SITE_URL}${businessAreaPath(locale, CAREGIVER_SLUG)}`;
  const metadata = LP_V1_META[locale];

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: metadata.title,
        description: metadata.description,
        inLanguage: locale,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        publisher: { "@id": `${SITE_URL}/#organization` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${SITE_URL}/lp/v1/og.png`,
          width: 1200,
          height: 630,
        },
      }}
    />
  );
}
