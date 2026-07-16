import assert from "node:assert/strict";
import { load } from "cheerio";
import { LOCALES } from "../lib/i18n";
import { SITE_URL } from "../lib/site";

async function main() {
const baseUrl = process.env.SEO_BASE_URL;
if (!baseUrl) throw new Error("SEO_BASE_URL이 필요합니다. 예: SEO_BASE_URL=http://127.0.0.1:3100 npm run test:seo:live");

const origin = new URL(baseUrl).origin;
const fetchLocal = (value: string) => {
  const url = new URL(value, SITE_URL);
  return fetch(origin + url.pathname + url.search, { redirect: "manual" });
};

const sitemapResponse = await fetchLocal("/sitemap.xml");
assert.equal(sitemapResponse.status, 200, "sitemap.xml must return 200");
const sitemapXml = await sitemapResponse.text();
const sitemapUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert.ok(sitemapUrls.length >= 120, `expected at least 120 sitemap URLs, got ${sitemapUrls.length}`);

const robotsResponse = await fetchLocal("/robots.txt");
assert.equal(robotsResponse.status, 200, "robots.txt must return 200");
const robots = await robotsResponse.text();
for (const route of ["/sales", "/login", "/auth"]) assert.match(robots, new RegExp(`Disallow: ${route}`));

const seenTitles = new Map<string, string>();
const seenDescriptions = new Map<string, string>();
const hrefs = new Set<string>();

for (const productionUrl of sitemapUrls) {
  const response = await fetchLocal(productionUrl);
  assert.equal(response.status, 200, `${productionUrl} returned ${response.status}`);
  const html = await response.text();
  const $ = load(html);
  const pathname = new URL(productionUrl).pathname;
  const segment = pathname.split("/").filter(Boolean)[0];
  const expectedLang = LOCALES.includes(segment as (typeof LOCALES)[number]) ? segment : "ko";
  assert.equal($("html").attr("lang"), expectedLang, `${pathname} has wrong html lang`);

  const title = $("title").text().trim();
  const description = $('meta[name="description"]').attr("content")?.trim() ?? "";
  assert.ok(title, `${pathname} needs title`);
  assert.ok(description, `${pathname} needs description`);
  assert.equal(seenTitles.has(title), false, `duplicate title: ${title} (${seenTitles.get(title)}, ${pathname})`);
  assert.equal(seenDescriptions.has(description), false, `duplicate description: ${description} (${seenDescriptions.get(description)}, ${pathname})`);
  seenTitles.set(title, pathname);
  seenDescriptions.set(description, pathname);

  const canonical = new URL($('link[rel="canonical"]').attr("href") ?? "", SITE_URL);
  const expectedCanonical = new URL(productionUrl);
  assert.equal(canonical.origin + canonical.pathname.replace(/\/$/, ""), expectedCanonical.origin + expectedCanonical.pathname.replace(/\/$/, ""), `${pathname} canonical mismatch`);
  for (const locale of [...LOCALES, "x-default"]) {
    assert.ok($(`link[rel="alternate"][hreflang="${locale}"]`).attr("href"), `${pathname} missing hreflang ${locale}`);
  }
  $("img").each((_, image) => assert.notEqual($(image).attr("alt"), undefined, `${pathname} has image without alt attribute`));
  $('script[type="application/ld+json"]').each((_, script) => JSON.parse($(script).text()));
  $("a[href]").each((_, link) => {
    const href = $(link).attr("href");
    if (href?.startsWith("/") && !href.startsWith("//")) hrefs.add(href.split("#")[0]);
  });

  if (pathname === "/" || /^\/[a-z]{2}$/.test(pathname)) {
    const types = $('script[type="application/ld+json"]').map((_, node) => $(node).text()).get().join(" ");
    for (const type of ["Organization", "WebSite", "FAQPage"]) assert.match(types, new RegExp(type), `${pathname} missing ${type}`);
  }
  if (pathname.endsWith("/services") || pathname === "/services" || pathname.endsWith("/visa") || pathname === "/visa") {
    assert.match(html, /"@type":"Service"/, `${pathname} missing Service schema`);
  }
  if (pathname.includes("/blog/") || /^\/blog\//.test(pathname)) assert.match(html, /"@type":"BlogPosting"/, `${pathname} missing BlogPosting`);
}

for (const href of hrefs) {
  if (["/sales", "/login", "/auth", "/unauthorized"].some((prefix) => href.startsWith(prefix))) continue;
  const response = await fetchLocal(href);
  assert.notEqual(response.status, 404, `broken internal link: ${href}`);
}

console.log(`SEO live audit passed: ${sitemapUrls.length} URLs, ${hrefs.size} internal links`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
