import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// /sitemap.xml 자동 생성 (Next.js App Router)
// 새 페이지를 추가하면 아래 routes 배열에도 등록한다.
const routes: { path: string; priority: number }[] = [
  { path: "/", priority: 1.0 },
  { path: "/services", priority: 0.9 },
  { path: "/about", priority: 0.8 },
  { path: "/partners", priority: 0.7 },
  { path: "/why", priority: 0.7 },
  { path: "/contact", priority: 0.6 },
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
