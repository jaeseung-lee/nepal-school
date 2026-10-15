import AnalyticsConsent from "@/components/analytics-consent";
import OrganizationSchema from "@/components/organization-schema";
import SeoTracker from "@/components/seo-tracker";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import JsonLd from "@/components/json-ld";
import { getMessages, type Locale } from "@/lib/i18n";
import { SITE, SITE_URL } from "@/lib/site";

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
          alternateName: SITE.brandName.en,
          inLanguage: ["ko", "en", "ja", "ne", "vi", "lo"],
          publisher: { "@id": `${SITE_URL}/#organization` },
        }}
      />
      <SeoTracker locale={locale} />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-ink"
      >
        {messages.header.skipToContent}
      </a>
      <SiteHeader />
      <div id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </div>
      <SiteFooter />
      <AnalyticsConsent locale={locale} />
    </>
  );
}
