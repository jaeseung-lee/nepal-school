import en from "@/messages/en.json";
import ja from "@/messages/ja.json";
import ko from "@/messages/ko.json";
import lo from "@/messages/lo.json";
import ne from "@/messages/ne.json";
import vi from "@/messages/vi.json";

/**
 * The languages used by the markets and partners described on the site.
 * Korean remains unprefixed so existing public URLs keep working; all other
 * languages use a first URL segment (for example, /ja/about).
 */
export const LOCALES = ["ko", "en", "ja", "ne", "vi", "lo"] as const;

export type Locale = (typeof LOCALES)[number];
export type Messages = typeof ko;

export const DEFAULT_LOCALE: Locale = "ko";

export const LOCALE_DETAILS: Record<Locale, { label: string; nativeLabel: string; ogLocale: string }> = {
  ko: { label: "Korean", nativeLabel: "한국어", ogLocale: "ko_KR" },
  en: { label: "English", nativeLabel: "English", ogLocale: "en_US" },
  ja: { label: "Japanese", nativeLabel: "日本語", ogLocale: "ja_JP" },
  ne: { label: "Nepali", nativeLabel: "नेपाली", ogLocale: "ne_NP" },
  vi: { label: "Vietnamese", nativeLabel: "Tiếng Việt", ogLocale: "vi_VN" },
  lo: { label: "Lao", nativeLabel: "ລາວ", ogLocale: "lo_LA" },
};

const CATALOGS: Record<Locale, Messages> = {
  ko,
  en: en as Messages,
  ja: ja as Messages,
  ne: ne as Messages,
  vi: vi as Messages,
  lo: lo as Messages,
};

export function isLocale(value: string | undefined): value is Locale {
  return Boolean(value && LOCALES.includes(value as Locale));
}

export function getMessages(locale: Locale = DEFAULT_LOCALE): Messages {
  return CATALOGS[locale];
}

/** Returns the locale encoded in a pathname, or Korean for legacy URLs. */
export function getLocaleFromPathname(pathname: string): Locale {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return isLocale(firstSegment) ? firstSegment : DEFAULT_LOCALE;
}

/**
 * Keep Korean URLs stable while making every non-Korean internal URL explicit.
 * External URLs, mailto links, and hash-only links are deliberately untouched.
 */
export function localizedHref(locale: Locale, href: string): string {
  if (
    locale === DEFAULT_LOCALE ||
    !href.startsWith("/") ||
    href.startsWith("//")
  ) {
    return href;
  }

  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

/** Changes the leading language segment and preserves the current page path. */
export function changeLocalePathname(pathname: string, locale: Locale): string {
  const segments = pathname.split("/").filter(Boolean);
  const pathWithoutLocale = isLocale(segments[0]) ? segments.slice(1) : segments;
  const canonicalPath = pathWithoutLocale.length ? `/${pathWithoutLocale.join("/")}` : "/";
  return localizedHref(locale, canonicalPath);
}
