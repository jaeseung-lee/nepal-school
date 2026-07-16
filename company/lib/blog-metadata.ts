import type { Metadata } from "next";
import { getBlogPosts, getPublishedTranslations, type BlogPost } from "@/lib/blog";
import { BLOG_COPY } from "@/lib/blog-copy";
import { BLOG_LOCALES, getBlogIndexPath, getBlogPostPath, type BlogLocale } from "@/lib/blog-routing";
import { getMessages, LOCALE_DETAILS } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

export function getBlogIndexMetadata(locale: BlogLocale): Metadata {
  const copy = BLOG_COPY[locale];
  const path = getBlogIndexPath(locale);
  const languages = Object.fromEntries(BLOG_LOCALES.map((language) => [language, SITE_URL + getBlogIndexPath(language)]));
  const firstPost = getBlogPosts(locale)[0];

  return {
    metadataBase: new URL(SITE_URL),
    title: copy.indexSeoTitle,
    description: copy.indexSeoDescription,
    alternates: { canonical: path, languages: { ...languages, "x-default": SITE_URL + "/blog" } },
    openGraph: {
      type: "website",
      siteName: getMessages(locale).site.name,
      locale: LOCALE_DETAILS[locale].ogLocale,
      url: SITE_URL + path,
      title: `${copy.indexSeoTitle} - ${getMessages(locale).site.name}`,
      description: copy.indexSeoDescription,
      images: [{ url: SITE_URL + (firstPost?.heroImage.src ?? "/kv/redesign/hero.webp"), alt: firstPost?.heroImage.alt ?? copy.indexTitle }],
    },
    twitter: { card: "summary_large_image", title: copy.indexSeoTitle, description: copy.indexSeoDescription },
  };
}

export function getBlogPostMetadata(post: BlogPost): Metadata {
  const path = getBlogPostPath(post.language, post.slug);
  const fullTitle = `${post.seoTitle} - ${getMessages(post.language).site.name}`;
  const translations = getPublishedTranslations(post.translationKey);
  const languages = Object.fromEntries(
    Object.entries(translations).map(([locale, translation]) => [
      locale,
      SITE_URL + getBlogPostPath(locale as BlogLocale, translation!.slug),
    ]),
  );

  return {
    metadataBase: new URL(SITE_URL),
    title: post.seoTitle,
    description: post.summary,
    keywords: post.keywords,
    robots: post.status === "review" ? { index: false, follow: false, noarchive: true } : undefined,
    alternates: {
      canonical: path,
      languages: post.status === "published"
        ? { ...languages, "x-default": SITE_URL + getBlogPostPath(post.language, post.slug) }
        : undefined,
    },
    openGraph: {
      type: "article",
      siteName: getMessages(post.language).site.name,
      locale: LOCALE_DETAILS[post.language].ogLocale,
      url: SITE_URL + path,
      title: fullTitle,
      description: post.summary,
      publishedTime: post.publishedAt,
      modifiedTime: post.modifiedAt,
      authors: [post.author.name],
      images: [{ url: SITE_URL + post.heroImage.src, width: post.heroImage.width, height: post.heroImage.height, alt: post.heroImage.alt }],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description: post.summary, images: [SITE_URL + post.heroImage.src] },
  };
}
