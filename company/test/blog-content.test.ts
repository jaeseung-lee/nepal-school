import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import matter from "gray-matter";
import { blogFrontmatterSchema } from "../lib/blog-schema";
import { BLOG_LOCALES, getBlogLocaleSwitchPath, getBlogPostPath } from "../lib/blog-routing";
import { extractMarkdownImages, validateBlogContent, validateTemporalState } from "../scripts/validate-blog";

const PUBLIC_BRAND = "Jeongwoo Human Resource Development Institute";
const EXPECTED_PROVENANCE_MANIFEST_SHA256 = "78398cb95d327b5d4ce2ae3e7e851bdef22d4166114cef8982fca604169a7f1a";

test("36개 글은 30개 영문 브랜드·6개 한국어 브랜드와 출처 이력을 보존한다", () => {
  const counts = { nonKorean: 0, korean: 0, total: 0 };
  const provenanceEntries: Array<[string, unknown]> = [];

  for (const locale of BLOG_LOCALES) {
    const directory = path.join(process.cwd(), "content/blog", locale);
    const files = fs.readdirSync(directory).filter((file) => file.endsWith(".md")).sort();
    assert.equal(files.length, 6);

    for (const file of files) {
      const { data } = matter(fs.readFileSync(path.join(directory, file), "utf8"));
      assert.equal(data.author.name, locale === "ko" ? "정우인재개발원" : PUBLIC_BRAND);
      assert.equal(typeof data.author.role, "string");
      assert.ok(data.author.role.trim());
      assert.equal(data.generationMethod, "ai-assisted");
      assert.deepEqual(Object.keys(data.sourceVerification).sort(), ["checkedAt", "method"]);
      assert.equal(data.sourceVerification.method, "official-primary-sources");
      assert.match(data.sourceVerification.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(data.reviewer, null);
      for (const field of ["asOf", "publishedAt", "modifiedAt"] as const) {
        assert.match(data[field], /^\d{4}-\d{2}-\d{2}$/);
      }
      assert.ok(Array.isArray(data.sources));
      assert.ok(data.sources.length >= 2);
      for (const source of data.sources) {
        assert.deepEqual(
          Object.keys(source).sort(),
          ["accessedAt", "description", "effectiveAt", "label", "publishedAt", "url"],
        );
        assert.match(source.accessedAt, /^\d{4}-\d{2}-\d{2}$/);
      }

      const sources = data.sources
        .map((source: Record<string, unknown>) => ({
          url: source.url,
          accessedAt: source.accessedAt,
          publishedAt: source.publishedAt ?? null,
          effectiveAt: source.effectiveAt ?? null,
        }))
        .sort((left: { url: unknown }, right: { url: unknown }) => {
          const leftCanonical = JSON.stringify(left);
          const rightCanonical = JSON.stringify(right);
          return leftCanonical < rightCanonical ? -1 : leftCanonical > rightCanonical ? 1 : 0;
        });
      provenanceEntries.push([
        `${locale}:${data.translationKey}`,
        {
          post: {
            asOf: data.asOf,
            effectiveAt: data.effectiveAt ?? null,
            effectiveStatus: data.effectiveStatus ?? null,
            publishedAt: data.publishedAt,
            modifiedAt: data.modifiedAt,
            generationMethod: data.generationMethod,
            sourceVerification: {
              method: data.sourceVerification.method,
              checkedAt: data.sourceVerification.checkedAt,
            },
            reviewer: data.reviewer ?? null,
          },
          sources,
        },
      ]);

      counts[locale === "ko" ? "korean" : "nonKorean"] += 1;
      counts.total += 1;
    }
  }

  assert.deepEqual(counts, { nonKorean: 30, korean: 6, total: 36 });
  const provenanceManifest = Object.fromEntries(
    provenanceEntries.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0),
  );
  assert.equal(Object.keys(provenanceManifest).length, 36);
  const provenanceHash = createHash("sha256")
    .update(JSON.stringify(provenanceManifest))
    .digest("hex");
  assert.equal(provenanceHash, EXPECTED_PROVENANCE_MANIFEST_SHA256);
});

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
