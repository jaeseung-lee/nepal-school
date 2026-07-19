import assert from "node:assert/strict";
import test from "node:test";
import { blogFrontmatterSchema } from "../lib/blog-schema";
import { getBlogLocaleSwitchPath, getBlogPostPath } from "../lib/blog-routing";
import { extractMarkdownImages, validateBlogContent, validateTemporalState } from "../scripts/validate-blog";

test("현재 블로그 콘텐츠가 이미지, 출처, 상태 규칙을 통과한다", () => {
  assert.deepEqual(validateBlogContent("2026-07-19"), []);
});

test("published 상태는 검토자 없이 공식 출처 대조 기록으로 공개할 수 있다", () => {
  const result = blogFrontmatterSchema.safeParse({
    language: "ko",
    jurisdiction: "KR",
    translationKey: "test-post",
    title: "검토자 필드를 확인하기 위한 충분히 긴 테스트 제목",
    seoTitle: "검토자 필드를 확인하기 위한 SEO 테스트 제목",
    summary: "검토자 필드가 없는 게시 글을 차단하는지 확인하기 위한 충분히 긴 테스트 요약입니다.",
    excerpt: "검토자 필드가 없는 게시 글을 차단하는지 확인하기 위한 충분히 긴 테스트 발췌입니다.",
    category: "테스트",
    keywords: ["테스트 키워드", "콘텐츠 검증", "검토자 확인"],
    asOf: "2026-07-16",
    effectiveAt: null,
    effectiveStatus: null,
    publishedAt: "2026-07-16",
    modifiedAt: "2026-07-16",
    generationMethod: "ai-assisted",
    sourceVerification: { method: "official-primary-sources", checkedAt: "2026-07-16" },
    author: { name: "작성자", role: "콘텐츠 작성" },
    reviewer: null,
    status: "published",
    heroImage: { src: "/kv/redesign/partner.webp", alt: "테스트에 사용하는 충분히 구체적인 이미지 설명", width: 1587, height: 991 },
    sources: [
      { label: "공식 출처 하나", url: "https://www.moj.go.kr/", description: "검증에 사용하는 첫 번째 공식 출처입니다.", publishedAt: null, effectiveAt: null, accessedAt: "2026-07-16" },
      { label: "공식 출처 둘", url: "https://www.law.go.kr/", description: "검증에 사용하는 두 번째 공식 출처입니다.", publishedAt: null, effectiveAt: null, accessedAt: "2026-07-16" },
    ],
    relatedPosts: [],
  });
  assert.equal(result.success, true);
});

test("미래 시행일과 시행 상태가 어긋나면 차단한다", () => {
  const base = blogFrontmatterSchema.parse({
    language: "ko",
    jurisdiction: "KR",
    translationKey: "future-rule",
    title: "미래 시행일 검증을 확인하기 위한 충분히 긴 제목",
    seoTitle: "미래 시행일 상태를 확인하는 SEO 제목",
    summary: "미래 시행일과 현재 시행 상태가 어긋난 경우를 차단하는지 확인하는 충분히 긴 요약입니다.",
    excerpt: "미래 시행일과 현재 시행 상태가 어긋난 경우를 차단하는지 확인하는 충분히 긴 발췌입니다.",
    category: "테스트",
    keywords: ["시행일 검증", "미래 제도", "콘텐츠 상태"],
    asOf: "2026-07-16",
    effectiveAt: "2026-08-01",
    effectiveStatus: "in_force",
    publishedAt: "2026-07-16",
    modifiedAt: "2026-07-16",
    generationMethod: "human",
    sourceVerification: { method: "official-primary-sources", checkedAt: "2026-07-16" },
    author: { name: "작성자", role: "콘텐츠 작성" },
    reviewer: null,
    status: "review",
    heroImage: { src: "/kv/redesign/partner.webp", alt: "테스트에 사용하는 충분히 구체적인 이미지 설명", width: 1587, height: 991 },
    sources: [
      { label: "공식 출처 하나", url: "https://www.moj.go.kr/", description: "검증에 사용하는 첫 번째 공식 출처입니다.", publishedAt: null, effectiveAt: null, accessedAt: "2026-07-16" },
      { label: "공식 출처 둘", url: "https://www.law.go.kr/", description: "검증에 사용하는 두 번째 공식 출처입니다.", publishedAt: null, effectiveAt: null, accessedAt: "2026-07-16" },
    ],
    relatedPosts: [],
  });
  assert.ok(validateTemporalState(base, "2026-07-16").some((message) => message.includes("미래 시행일")));
});

test("Markdown 이미지에서 alt, 로컬 경로, 캡션을 추출한다", () => {
  assert.deepEqual(
    extractMarkdownImages('![구체적인 대체 텍스트](/kv/redesign/process.webp "검토 장면")'),
    [{ alt: "구체적인 대체 텍스트", src: "/kv/redesign/process.webp", caption: "검토 장면" }],
  );
});

test("번역 slug가 없어도 언어 전환은 대상 언어 목록으로 이동한다", () => {
  assert.equal(getBlogPostPath("ko", "sample"), "/blog/sample");
  assert.equal(getBlogLocaleSwitchPath("ja"), "/ja/blog");
  assert.equal(getBlogLocaleSwitchPath("ne"), "/ne/blog");
  assert.equal(getBlogLocaleSwitchPath("en"), "/en/blog");
  assert.equal(getBlogLocaleSwitchPath("vi"), "/vi/blog");
  assert.equal(getBlogLocaleSwitchPath("lo"), "/lo/blog");
});
