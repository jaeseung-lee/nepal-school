import { getAllBlogPosts } from "@/lib/blog";
import { buildLlmsTxt } from "@/lib/llms";

// 예약 발행 글이 공개되면 바로 목록에 들어가도록 요청 시 생성하고, CDN에는 1시간 캐시한다.
export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

export function GET() {
  return new Response(buildLlmsTxt(getAllBlogPosts({ includeReview: false })), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
