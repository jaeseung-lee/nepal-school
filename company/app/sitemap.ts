import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog";
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

  // 초기 블로그는 한국어 원문만 제공합니다. 번역이 준비되기 전 비어 있거나
  // 중복된 로케일 URL을 만들지 않도록 다국어 sitemap 루프와 분리합니다.
  const blogPages = BLOG_POSTS.map((post) => ({
    url: SITE_URL + "/blog/" + post.slug,
    lastModified: new Date(post.modifiedAt),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));
  const blogLastModified = new Date(
    Math.max(...BLOG_POSTS.map((post) => new Date(post.modifiedAt).getTime())),
  );

  return [
    ...localizedPages,
    {
      url: SITE_URL + "/blog",
      lastModified: blogLastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...blogPages,
  ];
}
