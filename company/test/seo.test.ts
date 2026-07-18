import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import matter from "gray-matter";
import robots from "../app/robots";
import { BLOG_LOCALES } from "../lib/blog-routing";
import { LOCALES } from "../lib/i18n";
import { languageAlternates } from "../lib/seo";
import { SITE, SITE_URL } from "../lib/site";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("법인·브랜드·국가 역할이 분리되어 있다", () => {
  assert.equal(SITE.legalName.ko, "주식회사 정우인력개발");
  assert.equal(SITE.legalName.en, "Jungwoo Human Development Co., Ltd.");
  assert.equal(SITE.brandName.en, "JOONG WOO HRD");
  assert.deepEqual(SITE.trainingCountries.map((country) => country.code), ["NP"]);
  assert.deepEqual(SITE.sourcingCountries.map((country) => [country.code, country.model]), [["NP", "direct"], ["VN", "partner"], ["LA", "partner"]]);
  assert.deepEqual(SITE.destinationMarkets.map((country) => country.code), ["KR", "JP"]);
});

test("공통 대체 링크가 6개 언어와 x-default를 제공한다", () => {
  const alternates = languageAlternates("/about");
  assert.equal(Object.keys(alternates).length, 7);
  for (const locale of LOCALES) {
    assert.equal(alternates[locale], `${SITE_URL}${locale === "ko" ? "" : `/${locale}`}/about`);
  }
  assert.equal(alternates["x-default"], `${SITE_URL}/about`);
});

test("공개 문서는 서버 루트 레이아웃에서 정확한 lang을 렌더한다", () => {
  const korean = read("app/(public-ko)/layout.tsx");
  const localized = read("app/[locale]/layout.tsx");
  const internal = read("app/(internal)/layout.tsx");
  assert.match(korean, /<html lang="ko"/);
  assert.match(localized, /<html lang=\{locale\}/);
  assert.match(internal, /<html lang="ko"/);
  assert.doesNotMatch(korean + localized, /LocaleDocumentAttributes/);
});

test("Pretendard는 로컬 WOFF2와 라이선스를 사용한다", () => {
  assert.ok(fs.statSync(path.join(root, "app/fonts/PretendardVariable.woff2")).size > 100_000);
  assert.match(read("app/fonts/Pretendard-LICENSE.txt"), /SIL OPEN FONT LICENSE/i);
  assert.doesNotMatch(read("app/(public-ko)/layout.tsx"), /cdn\.jsdelivr|next\/font\/google/);
});

test("36개 글이 6개 번역 묶음으로 완성되어 있다", () => {
  const groups = new Map<string, Set<string>>();
  let count = 0;
  for (const locale of BLOG_LOCALES) {
    const directory = path.join(root, "content/blog", locale);
    const files = fs.readdirSync(directory).filter((file) => file.endsWith(".md"));
    assert.equal(files.length, 6);
    for (const file of files) {
      const { data } = matter(fs.readFileSync(path.join(directory, file), "utf8"));
      const locales = groups.get(data.translationKey) ?? new Set<string>();
      locales.add(locale);
      groups.set(data.translationKey, locales);
      assert.equal(data.sources.length >= 2, true);
      assert.equal(data.sourceVerification.method, "official-primary-sources");
      count += 1;
    }
  }
  assert.equal(count, 36);
  assert.equal(groups.size, 6);
  for (const locales of groups.values()) assert.deepEqual([...locales].sort(), [...BLOG_LOCALES].sort());
});

test("robots는 공개·AI 크롤러를 허용하고 내부 화면을 차단한다", () => {
  const policy = robots();
  assert.equal(policy.sitemap, `${SITE_URL}/sitemap.xml`);
  const text = JSON.stringify(policy);
  for (const route of ["/sales", "/login", "/auth"]) assert.match(text, new RegExp(route));
  for (const bot of ["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) assert.match(text, new RegExp(bot));
});

test("사이트맵은 명시적 수정일과 언어 대체 링크를 사용한다", () => {
  const source = read("app/sitemap.ts");
  assert.match(source, /CONTENT_LAST_MODIFIED/);
  assert.match(source, /languageAlternates/);
  assert.doesNotMatch(source, /lastModified\s*=\s*new Date/);
  assert.match(source, /\/privacy/);
});

test("KTS 랜딩은 사이트맵에 대체 언어 URL 없이 정확히 한 번만 포함된다", () => {
  const source = read("app/sitemap.ts");
  const landingBlock = source.match(/const landingPages:[\s\S]*?\n\];/)?.[0] ?? "";
  assert.equal((source.match(/`\$\{SITE_URL\}\/lp\/v1`/g) ?? []).length, 1);
  assert.match(source, /\.\.\.landingPages/);
  assert.doesNotMatch(landingBlock, /alternates/);
  assert.doesNotMatch(source, /\/ja\/lp\/v1/);
});

test("KTS 랜딩 메타데이터는 단일 canonical과 전용 OG 이미지를 사용한다", () => {
  const page = read("app/(landing)/lp/v1/page.tsx");
  assert.match(page, /alternates: \{ canonical: PAGE_PATH \}/);
  assert.doesNotMatch(page, /languageAlternates|languages:/);
  assert.match(page, /\/lp\/v1\/og\.png/);
  for (const schemaType of ["WebSite", "WebPage"]) {
    assert.match(page, new RegExp(`"@type": "${schemaType}"`));
  }
  assert.match(page, /<OrganizationSchema \/>/);
  assert.match(page, /inLanguage: \["ko", "ja"\]/);
});

test("PDF 다운로드는 미들웨어를 건너뛰고 검색 제외 헤더를 받는다", async () => {
  assert.match(read("middleware.ts"), /webp\|pdf/);
  const config = (await import("../next.config.mjs")).default;
  const headers = await config.headers!();
  const downloads = headers.find((rule) => rule.source === "/downloads/:path*");
  assert.ok(downloads);
  assert.deepEqual(
    downloads.headers.find((header) => header.key === "X-Robots-Tag"),
    { key: "X-Robots-Tag", value: "noindex, noarchive, nosnippet" },
  );
  assert.match(
    downloads.headers.find((header) => header.key === "Cache-Control")?.value ?? "",
    /s-maxage=31536000/,
  );
});

test("구 Vercel 호스트와 apex는 정식 www 동일 경로로 영구 이동한다", async () => {
  const config = (await import("../next.config.mjs")).default;
  const redirects = await config.redirects!();
  assert.deepEqual(redirects[0], {
    source: "/:path*",
    has: [{ type: "host", value: "company-iota-murex.vercel.app" }],
    destination: "https://www.joongwoohrd.com/:path*",
    permanent: true,
  });
  assert.deepEqual(redirects[1], {
    source: "/:path*",
    has: [{ type: "host", value: "joongwoohrd.com" }],
    destination: "https://www.joongwoohrd.com/:path*",
    permanent: true,
  });
});

test("GA4와 PostHog는 선택 환경변수와 동의 상태 뒤에만 렌더된다", () => {
  const consent = read("components/analytics-consent.tsx");
  assert.match(consent, /NEXT_PUBLIC_GA_MEASUREMENT_ID/);
  assert.match(consent, /NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN/);
  assert.match(consent, /choice === "accepted"/);
  assert.match(consent, /localStorage/);
  assert.match(consent, /autocapture: false/);
  assert.match(consent, /disable_session_recording: false/);
  assert.match(consent, /maskAllInputs: true/);
  assert.match(consent, /maskTextSelector: "\*"/);
  assert.match(consent, /recordHeaders: false/);
  assert.match(consent, /recordBody: false/);
  assert.match(consent, /capture_heatmaps: false/);
  assert.match(read("lib/analytics.ts"), /trackSeoEvent/);
  assert.match(read("lib/analytics.ts"), /setPostHogClient/);
  assert.match(read("lib/analytics.ts"), /trackPageView/);
  assert.match(read("components/web-vitals.tsx"), /LCP.*INP.*CLS/);
  assert.match(read(".env.example"), /NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN/);
  assert.match(read("lib/privacy-copy.ts"), /PostHog/);
});
