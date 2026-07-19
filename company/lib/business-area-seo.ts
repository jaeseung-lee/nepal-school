import type { Metadata } from "next";
import type { BusinessAreaLocale, BusinessAreaSlug } from "@/lib/business-areas";
import { getMessages, LOCALE_DETAILS } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

export type BusinessAreaSeoLocale = BusinessAreaLocale;

export const BUSINESS_AREA_LAST_MODIFIED = "2026-07-19";

export function businessAreaPath(locale: BusinessAreaSeoLocale, slug: BusinessAreaSlug): string {
  const path = `/services/${slug}`;
  return locale === "ko" ? path : `/${locale}${path}`;
}

export function businessAreaLanguageAlternates(slug: BusinessAreaSlug): Record<string, string> {
  const koreanUrl = `${SITE_URL}${businessAreaPath("ko", slug)}`;
  return {
    ko: koreanUrl,
    ja: `${SITE_URL}${businessAreaPath("ja", slug)}`,
    "x-default": koreanUrl,
  };
}

export function buildBusinessAreaMetadata({
  locale,
  slug,
  title,
  description,
  image,
}: {
  locale: BusinessAreaSeoLocale;
  slug: BusinessAreaSlug;
  title: string;
  description: string;
  image?: { src: string; alt: string; width: number; height: number };
}): Metadata {
  const messages = getMessages(locale);
  const canonical = businessAreaPath(locale, slug);
  const fullTitle = `${title} - ${messages.site.name}`;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical,
      languages: businessAreaLanguageAlternates(slug),
    },
    openGraph: {
      type: "website",
      siteName: messages.site.name,
      locale: LOCALE_DETAILS[locale].ogLocale,
      alternateLocale: [LOCALE_DETAILS[locale === "ko" ? "ja" : "ko"].ogLocale],
      url: `${SITE_URL}${canonical}`,
      title: fullTitle,
      description,
      images: image
        ? [{ url: `${SITE_URL}${image.src}`, alt: image.alt, width: image.width, height: image.height }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: image ? [`${SITE_URL}${image.src}`] : undefined,
    },
  };
}
