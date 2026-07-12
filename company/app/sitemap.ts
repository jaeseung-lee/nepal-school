import type { MetadataRoute } from "next";
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
  return routes.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: "monthly",
    priority,
  }));
}
