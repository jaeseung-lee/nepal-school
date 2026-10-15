import { getAllBlogPosts } from "@/lib/blog";
import { buildLlmsFullTxt } from "@/lib/llms";

// /llms.txt와 같은 방식으로 공개 글·비자 데이터에서 생성한다.
export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

export function GET() {
  return new Response(buildLlmsFullTxt(getAllBlogPosts({ includeReview: false })), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
