import AnalyticsConsent from "@/components/analytics-consent";
import OrganizationSchema from "@/components/organization-schema";
import SeoTracker from "@/components/seo-tracker";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import JsonLd from "@/components/json-ld";
import { getMessages, type Locale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

export default function PublicShell({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  const messages = getMessages(locale);

  return (
    <>
      <OrganizationSchema />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": `${SITE_URL}/#website`,
          url: SITE_URL,
          name: messages.site.name,
          alternateName: "JOONG WOO HRD",
          inLanguage: ["ko", "en", "ja", "ne", "vi", "lo"],
          publisher: { "@id": `${SITE_URL}/#organization` },
        }}
      />
      <SeoTracker locale={locale} />
      <SiteHeader />
      {children}
      <SiteFooter />
      <AnalyticsConsent locale={locale} />
    </>
  );
}
