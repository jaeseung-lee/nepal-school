import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import matter from "gray-matter";
import robots from "../app/robots";
import { BLOG_LOCALES } from "../lib/blog-routing";
import { BUSINESS_AREA_LOCALES, BUSINESS_AREA_SLUGS } from "../lib/business-areas";
import {
  buildBusinessAreaMetadata,
  businessAreaLanguageAlternates,
  businessAreaPath,
} from "../lib/business-area-seo";
import { LOCALES } from "../lib/i18n";
import { analyticsUrl } from "../lib/analytics";
import { buildLlmsFullTxt, buildLlmsTxt, type LlmsPost } from "../lib/llms";
import { languageAlternates } from "../lib/seo";
import { getLocalizedVisa } from "../lib/visa-i18n";
import { VISAS } from "../lib/visas";
import { SITE, SITE_URL } from "../lib/site";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const PUBLIC_BRAND_KO = "정우인재개발원";
const PUBLIC_BRAND = "Jeongwoo Human Resource Development Institute";
const ACTIVE_PUBLIC_SOURCE_ROOTS = ["app", "components", "content", "lib", "messages", "public"];
const ACTIVE_PUBLIC_DOCUMENTS = ["../CLAUDE.md", "README.md"];
const TEXT_SOURCE_EXTENSIONS = new Set([
  ".css", ".html", ".js", ".json", ".jsx", ".md", ".mjs", ".svg", ".ts", ".tsx", ".txt",
]);

function activePublicSources(directory: string): string[] {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return activePublicSources(relativePath);
    return TEXT_SOURCE_EXTENSIONS.has(path.extname(entry.name)) ? [relativePath] : [];
  });
}

test("공개 회사명은 정우인재개발원으로 통일되어 있다", () => {
  assert.equal(SITE.legalName.ko, PUBLIC_BRAND_KO);
  assert.equal(SITE.brandName.ko, PUBLIC_BRAND_KO);
  assert.equal(SITE.legalName.en, PUBLIC_BRAND);
  assert.equal(SITE.brandName.en, PUBLIC_BRAND);
  assert.equal(SITE.brandName.en, SITE.legalName.en);
  assert.deepEqual(SITE.trainingCountries.map((country) => country.code), ["NP"]);
  assert.deepEqual(SITE.sourcingCountries.map((country) => [country.code, country.model]), [["NP", "direct"], ["VN", "partner"], ["MM", "partner"], ["LA", "partner"], ["LK", "partner"]]);
  assert.deepEqual(SITE.destinationMarkets.map((country) => country.code), ["KR", "JP"]);
  assert.deepEqual(SITE.phones.map((phone) => [phone.countryCode, phone.national, phone.href]), [
    ["KR", "010-6363-6086", "tel:+821063636086"],
    ["JP", "080-2933-8838", "tel:+818029338838"],
  ]);
});

test("공개 문의 이메일은 새 정우 주소를 사용한다", () => {
  assert.equal(SITE.email, "lee_js@jeongwoohrd.com");
});

test("활성 런타임·공개 문서에는 잘못된 회사명과 구 브랜드 별칭이 남지 않는다", () => {
  // The include-only roots exclude historical/tmp records, tests, .next output,
  // scripts (including the catalog generator), while the extension allowlist excludes PDFs and other binaries.
  const sourceFiles = [
    ...ACTIVE_PUBLIC_SOURCE_ROOTS.flatMap(activePublicSources),
    ...ACTIVE_PUBLIC_DOCUMENTS,
  ];
  const legacyAliases = /정우인력개발|정우 인재개발원|Jungwoo Human Development Co\., Ltd\.|Joongwoo Human Resources Development Institute|Joong Woo HRD|JOONG WOO\(JW\)|Joong Woo Human Resource Development Co\., Ltd\./i;
  const offenders = sourceFiles.filter((file) => legacyAliases.test(read(file)));

  assert.deepEqual(offenders, []);
  assert.match(read("../CLAUDE.md"), new RegExp(PUBLIC_BRAND));
  assert.match(read("README.md"), new RegExp(PUBLIC_BRAND));
  assert.match(read("components/public-shell.tsx"), /alternateName: SITE\.brandName\.en/);
  assert.equal(SITE.brandName.en, PUBLIC_BRAND);
  assert.equal(SITE.legalName.en, PUBLIC_BRAND);
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
  assert.match(korean, /<html lang="ko"/);
  assert.match(localized, /<html lang=\{locale\}/);
  assert.doesNotMatch(korean + localized, /LocaleDocumentAttributes/);
});

test("Pretendard는 로컬 WOFF2와 라이선스를 사용한다", () => {
  assert.ok(fs.statSync(path.join(root, "app/fonts/PretendardVariable.woff2")).size > 100_000);
  assert.match(read("app/fonts/Pretendard-LICENSE.txt"), /SIL OPEN FONT LICENSE/i);
  assert.doesNotMatch(read("app/(public-ko)/layout.tsx"), /cdn\.jsdelivr|next\/font\/google/);
});

test("144개 글이 24개 번역 묶음으로 완성되어 있다", () => {
  const groups = new Map<string, Set<string>>();
  let count = 0;
  for (const locale of BLOG_LOCALES) {
    const directory = path.join(root, "content/blog", locale);
    const files = fs.readdirSync(directory).filter((file) => file.endsWith(".md"));
    assert.equal(files.length, 24);
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
  assert.equal(count, 144);
  assert.equal(groups.size, 24);
  for (const locales of groups.values()) assert.deepEqual([...locales].sort(), [...BLOG_LOCALES].sort());
});

test("robots는 공개·AI 크롤러를 허용하고, 관리자 화면이 없으므로 차단 경로를 두지 않는다", () => {
  const policy = robots();
  assert.equal(policy.sitemap, `${SITE_URL}/sitemap.xml`);
  const text = JSON.stringify(policy);
  assert.doesNotMatch(text, /disallow|\/sales|\/login|\/auth/i);
  for (const bot of ["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) assert.match(text, new RegExp(bot));
});

test("사이트맵은 명시적 수정일과 언어 대체 링크를 사용한다", () => {
  const source = read("app/sitemap.ts");
  assert.match(source, /CONTENT_LAST_MODIFIED/);
  assert.match(source, /languageAlternates/);
  assert.doesNotMatch(source, /lastModified\s*=\s*new Date/);
  assert.match(source, /\/privacy/);
});

test("블로그 글의 x-default는 사이트맵과 같은 한국어 원문을 가리킨다", () => {
  assert.match(read("lib/blog-metadata.ts"), /"x-default": languages\.ko \?\?/);
  assert.match(read("app/sitemap.ts"), /"x-default": languages\.ko \}/);
});

test("메타데이터는 모든 요청에서 <head>에 렌더하고 x-powered-by를 숨긴다", async () => {
  const config = (await import("../next.config.mjs")).default;
  assert.equal(config.poweredByHeader, false);
  for (const userAgent of [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36",
  ]) assert.ok(config.htmlLimitedBots?.test(userAgent), userAgent);
});

test("사업영역 상세 8개 URL은 한국어·일본어 hreflang만 제공한다", () => {
  const source = read("app/sitemap.ts");
  const detailUrls = new Set(
    BUSINESS_AREA_SLUGS.flatMap((slug) =>
      BUSINESS_AREA_LOCALES.map((locale) => `${SITE_URL}${businessAreaPath(locale, slug)}`),
    ),
  );

  assert.equal(detailUrls.size, BUSINESS_AREA_SLUGS.length * BUSINESS_AREA_LOCALES.length);
  assert.equal(detailUrls.size, 8);
  for (const slug of BUSINESS_AREA_SLUGS) {
    const koreanUrl = `${SITE_URL}${businessAreaPath("ko", slug)}`;
    assert.deepEqual(businessAreaLanguageAlternates(slug), {
      ko: koreanUrl,
      ja: `${SITE_URL}${businessAreaPath("ja", slug)}`,
      "x-default": koreanUrl,
    });
  }
  assert.match(source, /BUSINESS_AREA_SLUGS\.flatMap/);
  assert.match(source, /businessAreaLanguageAlternates\(slug\)/);
  assert.match(source, /\.\.\.businessAreaPages/);
  assert.doesNotMatch(source, /\/lp\/v1/);
});

test("사업영역 상세 메타데이터는 로케일별 canonical과 제한된 hreflang을 사용한다", () => {
  const slug = BUSINESS_AREA_SLUGS[0];
  const korean = buildBusinessAreaMetadata({
    locale: "ko",
    slug,
    title: "한국어 제목",
    description: "한국어 설명",
    image: { src: "/gallery/training-room-interior.webp", alt: "현장 이미지", width: 1650, height: 2200 },
  });
  const japanese = buildBusinessAreaMetadata({
    locale: "ja",
    slug,
    title: "日本語タイトル",
    description: "日本語の説明",
  });

  assert.equal(korean.alternates?.canonical, businessAreaPath("ko", slug));
  assert.equal(japanese.alternates?.canonical, businessAreaPath("ja", slug));
  assert.deepEqual(korean.alternates?.languages, businessAreaLanguageAlternates(slug));
  assert.deepEqual(japanese.alternates?.languages, businessAreaLanguageAlternates(slug));
  const openGraphImages = korean.openGraph?.images;
  assert.ok(Array.isArray(openGraphImages));
  const firstOpenGraphImage = openGraphImages[0];
  assert.equal(
    typeof firstOpenGraphImage === "string" || firstOpenGraphImage instanceof URL
      ? firstOpenGraphImage.toString()
      : firstOpenGraphImage?.url.toString(),
    `${SITE_URL}/gallery/training-room-interior.webp`,
  );
});

test("사업영역 상세 경로는 정적 slug만 허용하고 일본어 외 접두 언어를 만들지 않는다", () => {
  const koreanRoute = read("app/(public-ko)/services/[slug]/page.tsx");
  const localizedRoute = read("app/[locale]/[[...slug]]/page.tsx");

  assert.match(koreanRoute, /export const dynamicParams = false/);
  assert.match(koreanRoute, /BUSINESS_AREA_SLUGS\.map/);
  assert.match(koreanRoute, /if \(!isBusinessAreaSlug\(slug\)\) notFound\(\)/);
  assert.match(localizedRoute, /locale: "ja", slug: \["services", slug\]/);
  assert.match(localizedRoute, /value === "ja" \? getJapaneseBusinessArea/);
  assert.doesNotMatch(localizedRoute, /locale: "(?:en|ne|vi|lo)", slug: \["services", slug\]/);
});

test("개호 상세만 원본 lp/v1 본문을 사용하고 나머지 사업영역은 공통 상세를 유지한다", () => {
  const koreanRoute = read("app/(public-ko)/services/[slug]/page.tsx");
  const localizedRoute = read("app/[locale]/[[...slug]]/page.tsx");

  assert.match(koreanRoute, /if \(slug === "japan-caregiver"\)/);
  assert.match(koreanRoute, /<KtsCaregiverLanding locale="ko" \/>/);
  assert.match(koreanRoute, /<BusinessAreaDetail area=\{area\} locale="ko" \/>/);

  assert.match(localizedRoute, /businessArea\?\.slug === "japan-caregiver"/);
  assert.match(localizedRoute, /<KtsCaregiverLanding locale="ja" \/>/);
  assert.match(localizedRoute, /<BusinessAreaDetail area=\{businessArea\} locale="ja" \/>/);
});

test("개호 상세 메타데이터는 원본 lp/v1 값과 전용 OG 이미지를 사용한다", () => {
  const routes = [
    { locale: "ko", source: read("app/(public-ko)/services/[slug]/page.tsx") },
    { locale: "ja", source: read("app/[locale]/[[...slug]]/page.tsx") },
  ] as const;

  for (const { locale, source } of routes) {
    assert.match(source, new RegExp(`LP_V1_META\\.${locale}`));
    assert.match(source, /src: "\/lp\/v1\/og\.webp", alt: caregiverMetadata\.title, width: 1200, height: 630/);
    assert.match(source, /title: \{ absolute: caregiverMetadata\.title \}/);
  }
});

test("구 KTS 랜딩은 돌봄 상세로 영구 이동하고 #ja를 일본어 정식 경로에 연결한다", () => {
  const page = read("app/(landing)/lp/v1/page.tsx");
  const koreanRoute = read("app/(public-ko)/services/[slug]/page.tsx");
  const bridge = read("components/business-area/legacy-lp-locale-bridge.tsx");

  assert.match(page, /permanentRedirect\("\/services\/japan-caregiver"\)/);
  assert.doesNotMatch(page, /export const metadata|components\/lp\/kts-caregiver-landing/);
  assert.match(koreanRoute, /slug === "japan-caregiver"[\s\S]*<LegacyLpLocaleBridge/);
  assert.match(bridge, /window\.location\.hash\.toLowerCase\(\) !== "#ja"/);
  assert.match(bridge, /window\.location\.replace\(`\/ja\/services\/japan-caregiver/);
});

test("PDF 다운로드는 검색 제외 헤더를 받는다(미들웨어 없음)", async () => {
  assert.equal(fs.existsSync(path.join(root, "middleware.ts")), false);
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

test("구 호스트들과 새 apex는 새 정식 www의 동일 경로로 영구 이동한다", async () => {
  const config = (await import("../next.config.mjs")).default;
  const redirects = await config.redirects!();
  assert.deepEqual(redirects[0], {
    source: "/:path*",
    has: [{ type: "host", value: "company-iota-murex.vercel.app" }],
    destination: "https://www.jeongwoohrd.com/:path*",
    permanent: true,
  });
  assert.deepEqual(redirects[1], {
    source: "/:path*",
    has: [{ type: "host", value: "joongwoohrd.com" }],
    destination: "https://www.jeongwoohrd.com/:path*",
    permanent: true,
  });
  assert.deepEqual(redirects[2], {
    source: "/:path*",
    has: [{ type: "host", value: "www.joongwoohrd.com" }],
    destination: "https://www.jeongwoohrd.com/:path*",
    permanent: true,
  });
  assert.deepEqual(redirects[3], {
    source: "/:path*",
    has: [{ type: "host", value: "jeongwoohrd.com" }],
    destination: "https://www.jeongwoohrd.com/:path*",
    permanent: true,
  });
  assert.deepEqual(redirects[4], {
    source: "/:path*",
    has: [{ type: "host", value: "nepal-school.vercel.app" }],
    destination: "https://www.jeongwoohrd.com/:path*",
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

test("분석 도구로 보내는 페이지 주소는 UTM 태그만 남기고 다른 쿼리와 해시는 지운다", () => {
  assert.equal(
    analyticsUrl("https://www.jeongwoohrd.com/en?fbclid=abc&utm_source=facebook&email=a%40b.com&utm_medium=social&utm_campaign=fb_page&utm_content=pinned_post#top"),
    "https://www.jeongwoohrd.com/en?utm_source=facebook&utm_medium=social&utm_campaign=fb_page&utm_content=pinned_post",
  );
  assert.equal(analyticsUrl("https://www.jeongwoohrd.com/ja/blog?page=2#list"), "https://www.jeongwoohrd.com/ja/blog");
  assert.equal(analyticsUrl("https://www.jeongwoohrd.com/?utm_source="), "https://www.jeongwoohrd.com/");
  assert.equal(analyticsUrl("not a url?utm_source=facebook"), "not a url");

  const consent = read("components/analytics-consent.tsx");
  assert.match(consent, /POSTHOG_PAGE_URL_PROPERTIES[\s\S]*analyticsUrl/);
  assert.match(consent, /POSTHOG_REFERRER_PROPERTIES[\s\S]*removeSearchAndHash/);
  assert.match(read("components/seo-tracker.tsx"), /page_location: analyticsUrl\(/);
});

test("llms.txt·llms-full.txt는 공개 글·비자 데이터에서 생성되고 정적 사본을 두지 않는다", () => {
  assert.equal(fs.existsSync(path.join(root, "public/llms.txt")), false);
  assert.equal(fs.existsSync(path.join(root, "public/llms-full.txt")), false);
  assert.match(read("app/llms.txt/route.ts"), /getAllBlogPosts\(\{ includeReview: false \}\)/);
  assert.match(read("app/llms-full.txt/route.ts"), /getAllBlogPosts\(\{ includeReview: false \}\)/);

  const posts: LlmsPost[] = [
    { language: "ko", slug: "a-ko", title: "가 주제 한국어 제목", translationKey: "topic-a" },
    { language: "en", slug: "a-en", title: "Topic A English title", translationKey: "topic-a" },
    { language: "ja", slug: "b-ja", title: "トピックBの日本語タイトル", translationKey: "topic-b" },
  ];
  const summary = buildLlmsTxt(posts);
  const full = buildLlmsFullTxt(posts);
  assert.match(summary, /It currently has 3 published articles on 2 topics:/);
  assert.match(summary, /Topic A English title \(available in Korean, English\)/);
  assert.doesNotMatch(summary, /36 published articles/);
  for (const visa of VISAS) {
    assert.ok(summary.includes(`${SITE_URL}/visa/${visa.slug})`), `llms.txt에 /visa/${visa.slug} 누락`);
    assert.ok(full.includes(`${SITE_URL}/visa/${visa.slug})`), `llms-full.txt에 /visa/${visa.slug} 누락`);
  }
  for (const post of posts) assert.ok(full.includes(post.slug), `llms-full.txt에 ${post.slug} 누락`);
  assert.match(full, new RegExp(`Founded: ${SITE.foundingDate}`));
});

test("요청마다 렌더되는 공개 라우트는 서울 리전(icn1)에서 실행한다", () => {
  for (const file of ["app/(public-ko)/layout.tsx", "app/[locale]/layout.tsx", "app/llms.txt/route.ts", "app/llms-full.txt/route.ts"]) {
    assert.match(read(file), /export const preferredRegion = "icn1";/, file);
  }
});

test("사이트맵 lastmod는 비자별 수정일을 쓰고, 수정일은 미래가 아닌 유효한 날짜다", () => {
  assert.match(read("app/sitemap.ts"), /lastModified: visa\.updatedAt/);
  const today = new Date().toISOString().slice(0, 10);
  for (const visa of VISAS) {
    assert.match(visa.updatedAt, /^\d{4}-\d{2}-\d{2}$/, visa.slug);
    assert.ok(visa.updatedAt <= today, `${visa.slug} updatedAt이 미래 날짜`);
  }
});

test("공식 기준 자료가 있는 비자는 모든 언어에 라벨이 있다", () => {
  for (const locale of LOCALES) {
    for (const visa of VISAS.filter((item) => item.sources?.length)) {
      const localized = getLocalizedVisa(locale, visa.slug);
      assert.equal(localized.sources?.length, visa.sources?.length, `${locale} ${visa.slug}`);
      for (const source of localized.sources ?? []) assert.ok(source.label?.trim(), `${locale} ${visa.slug} ${source.key}`);
    }
  }
});

test("Organization 구조화 데이터는 설립일·대표자와 나눈 주소를 쓰고, 나눈 주소는 표시 주소와 같다", () => {
  const { region, locality, street } = SITE.address;
  assert.equal(`${region} ${locality} ${street}`, SITE.streetAddress);
  const schema = read("components/organization-schema.tsx");
  assert.match(schema, /foundingDate: SITE\.foundingDate/);
  assert.match(schema, /founder: \{ "@type": "Person", name: SITE\.founder \}/);
  assert.match(schema, /addressLocality: SITE\.address\.locality/);
  assert.match(schema, /addressRegion: SITE\.address\.region/);
});

test("관리자·영업 화면과 인증 코드가 공개 사이트에 남아 있지 않다", () => {
  for (const removed of ["app/(internal)", "app/auth", "middleware.ts", "lib/sales", "lib/supabase", "components/sales", "lib/internal-routes.ts"]) {
    assert.equal(fs.existsSync(path.join(root, removed)), false, `${removed}가 남아 있음`);
  }
  const pkg = JSON.parse(read("package.json"));
  for (const dependency of ["@supabase/ssr", "@supabase/supabase-js"]) assert.equal(dependency in pkg.dependencies, false, dependency);
  assert.equal(Object.keys(pkg.scripts).some((name) => name.startsWith("sales:") || name === "test:sales"), false);
});
