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
    assert.match(source, /src: "\/lp\/v1\/og\.png", alt: caregiverMetadata\.title, width: 1200, height: 630/);
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
