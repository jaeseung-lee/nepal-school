import type { MetadataRoute } from "next";
import { getAllBlogPosts, getPublishedTranslations } from "@/lib/blog";
import { BLOG_LOCALES, getBlogIndexPath, getBlogPostPath } from "@/lib/blog-routing";
import { BUSINESS_AREA_LOCALES, BUSINESS_AREA_SLUGS } from "@/lib/business-areas";
import {
  BUSINESS_AREA_LAST_MODIFIED,
  businessAreaLanguageAlternates,
  businessAreaPath,
} from "@/lib/business-area-seo";
import { LOCALES, localizedHref } from "@/lib/i18n";
import { CONTENT_LAST_MODIFIED, languageAlternates } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { VISAS } from "@/lib/visas";

const routes: { path: string; priority: number; changeFrequency?: "weekly" | "monthly" }[] = [
  { path: "/", priority: 1 },
  { path: "/services", priority: 0.9 },
  { path: "/visa", priority: 0.9 },
  { path: "/gallery", priority: 0.8 },
  { path: "/about", priority: 0.8 },
  { path: "/partners", priority: 0.7 },
  { path: "/why", priority: 0.7 },
  { path: "/contact", priority: 0.6 },
  { path: "/privacy", priority: 0.3 },
  ...VISAS.map((visa) => ({ path: `/visa/${visa.slug}`, priority: visa.sitemapPriority })),
];

export default function sitemap(): MetadataRoute.Sitemap {
  const localizedPages = LOCALES.flatMap((locale) =>
    routes.map(({ path, priority, changeFrequency = "monthly" }) => ({
      url: `${SITE_URL}${localizedHref(locale, path)}`,
      lastModified: CONTENT_LAST_MODIFIED,
      changeFrequency,
      priority,
      alternates: { languages: languageAlternates(path) },
    })),
  );

  const businessAreaPages: MetadataRoute.Sitemap = BUSINESS_AREA_SLUGS.flatMap((slug) =>
    BUSINESS_AREA_LOCALES.map((locale) => ({
      url: `${SITE_URL}${businessAreaPath(locale, slug)}`,
      lastModified: BUSINESS_AREA_LAST_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: 0.9,
      alternates: { languages: businessAreaLanguageAlternates(slug) },
    })),
  );

  const publishedPosts = getAllBlogPosts({ includeReview: false });
  const blogPages = publishedPosts.map((post) => {
    const translations = getPublishedTranslations(post.translationKey);
    const languages = Object.fromEntries(
      Object.entries(translations).map(([language, translation]) => [
        language,
        SITE_URL + getBlogPostPath(language as (typeof BLOG_LOCALES)[number], translation!.slug),
      ]),
    );
    return {
      url: SITE_URL + getBlogPostPath(post.language, post.slug),
      lastModified: post.modifiedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: { languages: { ...languages, "x-default": languages.ko } },
    };
  });

  const blogLastModified = publishedPosts.length
    ? publishedPosts.map((post) => post.modifiedAt).sort().at(-1)!
    : CONTENT_LAST_MODIFIED;
  const indexLanguages = Object.fromEntries(
    BLOG_LOCALES.map((language) => [language, SITE_URL + getBlogIndexPath(language)]),
  );

  return [
    ...localizedPages,
    ...businessAreaPages,
    ...BLOG_LOCALES.map((locale) => ({
      url: SITE_URL + getBlogIndexPath(locale),
      lastModified: blogLastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: { languages: { ...indexLanguages, "x-default": indexLanguages.ko } },
    })),
    ...blogPages,
  ];
}
