import type { Locale } from "@/lib/i18n";

export const BLOG_LOCALES = ["ko", "ja", "ne"] as const;
export type BlogLocale = (typeof BLOG_LOCALES)[number];

export function isBlogLocale(locale: Locale | string): locale is BlogLocale {
  return BLOG_LOCALES.includes(locale as BlogLocale);
}

export function getBlogIndexPath(locale: BlogLocale): string {
  return locale === "ko" ? "/blog" : `/${locale}/blog`;
}

export function getBlogPostPath(locale: BlogLocale, slug: string): string {
  return `${getBlogIndexPath(locale)}/${slug}`;
}

export function isBlogPath(pathname: string): boolean {
  return /^\/(?:ja\/|ne\/)?blog(?:\/|$)/.test(pathname);
}

/**
 * Blog translations do not necessarily share a slug. Switching language from
 * a post therefore lands on the target language index instead of a 404 page.
 */
export function getBlogLocaleSwitchPath(locale: BlogLocale): string {
  return getBlogIndexPath(locale);
}
