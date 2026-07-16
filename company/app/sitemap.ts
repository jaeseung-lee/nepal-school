import type { MetadataRoute } from "next";
import { getAllBlogPosts, getPublishedTranslations } from "@/lib/blog";
import { BLOG_LOCALES, getBlogIndexPath, getBlogPostPath } from "@/lib/blog-routing";
import { LOCALES, localizedHref } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { VISAS } from "@/lib/visas";

// /sitemap.xml 자동 생성 (Next.js App Router)
// 새 페이지를 추가하면 아래 routes 배열에도 등록한다.
// 비자 상세 페이지는 lib/visas.ts의 VISAS에서 자동 파생된다.
const routes: { path: string; priority: number }[] = [
  { path: "/", priority: 1.0 },
  { path: "/services", priority: 0.9 },
  { path: "/visa", priority: 0.9 },
  { path: "/about", priority: 0.8 },
  { path: "/partners", priority: 0.7 },
  { path: "/why", priority: 0.7 },
  { path: "/contact", priority: 0.6 },
  ...VISAS.map((visa) => ({
    path: `/visa/${visa.slug}`,
    priority: visa.sitemapPriority,
  })),
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const localizedPages = LOCALES.flatMap((locale) =>
    routes.map(({ path, priority }) => ({
      url: `${SITE_URL}${localizedHref(locale, path)}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority,
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
      lastModified: new Date(post.modifiedAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: { languages },
    };
  });
  const blogLastModified = publishedPosts.length
    ? new Date(Math.max(...publishedPosts.map((post) => new Date(post.modifiedAt).getTime())))
    : lastModified;
  const indexLanguages = Object.fromEntries(
    BLOG_LOCALES.map((language) => [language, SITE_URL + getBlogIndexPath(language)]),
  );

  return [
    ...localizedPages,
    ...BLOG_LOCALES.map((locale) => ({
      url: SITE_URL + getBlogIndexPath(locale),
      lastModified: blogLastModified,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: { languages: indexLanguages },
    } as const)),
    ...blogPages,
  ];
}
