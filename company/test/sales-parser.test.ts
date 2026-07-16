import assert from "node:assert/strict";
import test from "node:test";
import { mergeDetailFacts, parseYoloListingPage } from "@/lib/sales/yolo-parser";

function jobCard(overrides: Record<string, unknown> = {}, href = "/ja/recruit/job/details/36168") {
  const data = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: "介護スタッフ",
    description: "外国人スタッフ活躍中。特定技能ビザ支援、N3、資格取得支援、寮あり。月給 22万円～26万円",
    identifier: { value: "35066" },
    datePosted: "2026-07-10",
    validThrough: "2026-09-30T23:59:59+09:00",
    employmentType: "FULL_TIME",
    hiringOrganization: { name: "社会福祉法人 テスト会" },
    jobLocation: {
      address: {
        addressRegion: "東京都",
        addressLocality: "新宿区",
        streetAddress: "西新宿1-1",
      },
    },
    ...overrides,
  };
  return `<article class="job-card"><a href="${href}">detail</a><script type="application/ld+json">${JSON.stringify(data)}</script></article>`;
}

test("listing parser discovers pagination and always prefers numeric URL job ID", () => {
  const html = `<html><body><p>393件</p>${jobCard()}<a href="/ja/sitemap/job-category/77/8">8</a></body></html>`;
  const result = parseYoloListingPage(html, "https://www.yolo-japan.com/ja/sitemap/job-category/77/1");
  assert.equal(result.lastPage, 8);
  assert.equal(result.advertisedCount, 393);
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].sourceJobId, "36168");
  assert.equal(result.jobs[0].embeddedIdentifier, "35066");
  assert.ok(result.warnings.includes("job:36168:identifier_mismatch:35066"));
});

test("parser extracts normalized facts and support signals without retaining description", () => {
  const result = parseYoloListingPage(jobCard(), "https://www.yolo-japan.com/ja/sitemap/job-category/77/1");
  const job = result.jobs[0];
  assert.equal(job.normalizedOrganizationName, "テスト会");
  assert.equal(job.japaneseLevel, "N3");
  assert.equal(job.visaSupport, true);
  assert.equal(job.foreignerFriendly, true);
  assert.equal(job.qualificationSupport, true);
  assert.equal(job.housingSupport, true);
  assert.equal(job.salaryMin, 220_000);
  assert.equal(job.salaryMax, 260_000);
  assert.equal("description" in job, false);
  assert.match(job.sourceHash, /^[a-f0-9]{64}$/);
});

test("parser tolerates missing optional fields and reports malformed cards", () => {
  const minimal = jobCard({ description: undefined, jobLocation: undefined, validThrough: undefined });
  const malformed = '<article class="job-card"><a href="/ja/recruit/job/details/9">detail</a><script type="application/ld+json">{bad</script></article>';
  const result = parseYoloListingPage(minimal + malformed, "https://www.yolo-japan.com/ja/sitemap/job-category/77/1");
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].normalizedAddress, "住所未確認");
  assert.equal(result.jobs[0].validThrough, null);
  assert.ok(result.warnings.some((warning) => warning.includes("invalid_jsonld")));
});

test("listing hash remains stable when separately persisted detail facts are enriched", () => {
  const listing = parseYoloListingPage(
    jobCard({ description: "介護スタッフ募集" }),
    "https://www.yolo-japan.com/ja/sitemap/job-category/77/1",
  ).jobs[0];
  const enriched = mergeDetailFacts(listing, { japaneseLevel: "N3", housingSupport: true });
  const nextListing = parseYoloListingPage(
    jobCard({ description: "介護スタッフ募集" }),
    "https://www.yolo-japan.com/ja/sitemap/job-category/77/1",
  ).jobs[0];
  assert.equal(nextListing.sourceHash, listing.sourceHash);
  assert.notEqual(enriched.sourceHash, listing.sourceHash);
});
