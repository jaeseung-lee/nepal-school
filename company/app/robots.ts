import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// /robots.txt 자동 생성 (Next.js App Router)
// - 전체 크롤 허용 + 사이트맵 위치 안내
// - 주요 AI 검색 크롤러를 명시적으로 허용해 GEO(생성형 검색) 가시성 확보
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: [
          "GPTBot", // OpenAI — ChatGPT 웹 검색
          "OAI-SearchBot", // OpenAI 검색
          "ChatGPT-User", // ChatGPT 브라우징
          "ClaudeBot", // Anthropic
          "PerplexityBot", // Perplexity
          "Google-Extended", // Google Gemini / AI Overviews
        ],
        allow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
