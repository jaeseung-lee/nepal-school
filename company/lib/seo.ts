import type { Metadata } from "next";
import { getMessages, LOCALES, LOCALE_DETAILS, localizedHref, type Locale } from "./i18n";
import { SITE, SITE_URL } from "./site";

export const CONTENT_LAST_MODIFIED = "2026-07-16";

export function languageAlternates(path: string): Record<string, string> {
  const languages = Object.fromEntries(
    LOCALES.map((locale) => [locale, `${SITE_URL}${localizedHref(locale, path)}`]),
  );
  return { ...languages, "x-default": `${SITE_URL}${localizedHref("ko", path)}` };
}

export function buildPageMetadata({
  title,
  description,
  path,
  locale = "ko",
  keywords,
}: {
  title: string;
  description: string;
  path: string;
  locale?: Locale;
  keywords?: string[];
}): Metadata {
  const messages = getMessages(locale);
  const canonical = localizedHref(locale, path);
  const fullTitle = `${title} - ${messages.site.name}`;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    keywords,
    alternates: { canonical, languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      siteName: messages.site.name,
      locale: LOCALE_DETAILS[locale].ogLocale,
      url: `${SITE_URL}${canonical}`,
      title: fullTitle,
      description,
    },
    twitter: { card: "summary_large_image", title: fullTitle, description },
  };
}

export function buildRootMetadata(locale: Locale): Metadata {
  const messages = getMessages(locale);
  const title = `${messages.site.name} - ${messages.site.seoTitle}`;
  const verification: Metadata["verification"] = {
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : {}),
    other: {
      ...(process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
        ? { "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION }
        : {}),
      ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
        ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
        : {}),
    },
  };

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s - ${messages.site.name}` },
    description: messages.site.description,
    alternates: {
      canonical: localizedHref(locale, "/"),
      languages: languageAlternates("/"),
    },
    openGraph: {
      type: "website",
      siteName: messages.site.name,
      locale: LOCALE_DETAILS[locale].ogLocale,
      url: `${SITE_URL}${localizedHref(locale, "/")}`,
      title,
      description: messages.site.description,
    },
    twitter: { card: "summary_large_image", title, description: messages.site.description },
    verification,
    other: {
      "organization-legal-name": SITE.legalName.en,
    },
  };
}
