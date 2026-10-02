import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import matter from "gray-matter";
import sharp from "sharp";
import { blogFrontmatterSchema } from "../lib/blog-schema";
import { BLOG_LOCALES } from "../lib/blog-routing";
import { isPublicPost, japanDate, publicationSlots, resolvePublication } from "../lib/blog-publication";
import { applyRelease, prepareRelease } from "../scripts/approve-blog-release";

const root = path.join(process.cwd(), "content/blog");
const plan = JSON.parse(fs.readFileSync(path.join(root, "release-plan.json"), "utf8"));
const read = (locale: string, topic: string) => blogFrontmatterSchema.parse(matter(fs.readFileSync(path.join(root, locale, topic + ".md"), "utf8")).data);
const base = { ...read("en", plan.topics[0]), status: "review" as const, publishedAt: null, publication: undefined };
const releaseAt = new Date("2026-10-02T09:00:00+09:00");
const approvalAt = new Date("2026-10-01T10:00:00+09:00");
const scheduled = { ...base, status: "scheduled" as const, publishedAt: null, publication: { approvedAt: approvalAt.toISOString(), scheduledAt: releaseAt.toISOString() } };

test("unapproved drafts stay private; approved schedules open at the exact instant in Japan", () => {
  assert.equal(isPublicPost(base, new Date("2030-01-01")), false);
  assert.equal(isPublicPost(scheduled, new Date(releaseAt.getTime() - 1)), false);
  assert.equal(isPublicPost(scheduled, releaseAt), true);
  assert.equal(isPublicPost(scheduled, new Date("2026-10-03")), true);
  const released = resolvePublication(scheduled, releaseAt);
  assert.equal(released.publishedAt, "2026-10-02");
  assert.equal(released.modifiedAt, "2026-10-02");
  assert.equal(scheduled.status, "scheduled");
  assert.equal(scheduled.publishedAt, null);
  assert.equal(japanDate(new Date("2026-10-01T15:00:00Z")), "2026-10-02");
});

test("schema rejects missing approval, invented scheduled publication dates and inverted approval times", () => {
  assert.equal(blogFrontmatterSchema.safeParse(scheduled).success, true);
  assert.equal(blogFrontmatterSchema.safeParse({ ...scheduled, publication: undefined }).success, false);
  assert.equal(blogFrontmatterSchema.safeParse({ ...scheduled, publishedAt: "2026-09-01" }).success, false);
  assert.equal(blogFrontmatterSchema.safeParse({ ...scheduled, publication: { ...scheduled.publication, approvedAt: "2026-10-03T00:00:00Z" } }).success, false);
  assert.equal(blogFrontmatterSchema.safeParse({ ...base, status: "published", publishedAt: null }).success, false);
});

test("release slots publish three together then one each Mon/Wed/Fri at 09:00 JST across year boundaries", () => {
  const slots = publicationSlots(new Date("2026-12-31T23:30:00+09:00"), 15);
  assert.equal(slots.length, 15);
  assert.deepEqual(slots.slice(0, 3), Array(3).fill("2026-12-31T14:30:00.000Z"));
  assert.equal(slots[3], "2027-01-01T00:00:00.000Z");
  assert.equal(slots[4], "2027-01-04T00:00:00.000Z");
  for (let i = 3; i < slots.length; i++) {
    assert.ok(new Date(slots[i]).getTime() > new Date(slots[i - 1]).getTime());
    assert.ok([1, 3, 5].includes(new Date(slots[i]).getUTCDay()));
    assert.equal(slots[i].slice(11), "00:00:00.000Z");
  }
  assert.throws(() => publicationSlots(new Date("invalid"), 15));
  assert.throws(() => publicationSlots(releaseAt, 1.5));
});

test("90 new articles keep source evidence, distinct topic heroes and no fabricated publication date", () => {
  const audit = JSON.parse(fs.readFileSync(path.join(process.cwd(), "docs/blog/2026-10-source-audit.json"), "utf8"));
  const heroes = new Set<string>();
  assert.equal(plan.topics.length, 15);
  for (const topic of plan.topics) {
    const hero = read("ko", topic).heroImage.src;
    heroes.add(hero);
    for (const locale of BLOG_LOCALES) {
      const post = read(locale, topic);
      assert.ok(["review", "scheduled"].includes(post.status));
      assert.equal(post.publishedAt, null);
      assert.equal(Boolean(post.publication), post.status === "scheduled");
      assert.equal(post.sourceVerification.checkedAt, audit.checkedAt);
      assert.equal(post.heroImage.src, hero);
      const expected = audit.topics[topic].sourceIds.map((id: string) => audit.sources[id].url);
      assert.deepEqual(post.sources.map((source) => source.url), expected);
    }
  }
  assert.equal(heroes.size, 15);
});

function copyReviewFixtures(directory: string) {
  fs.cpSync(root, directory, { recursive: true });
  for (const topic of plan.topics) for (const locale of BLOG_LOCALES) {
    const file = path.join(directory, locale, topic + ".md");
    const parsed = matter(fs.readFileSync(file, "utf8"));
    delete parsed.data.publication;
    parsed.data.status = "review";
    parsed.data.publishedAt = null;
    fs.writeFileSync(file, matter.stringify(parsed.content, parsed.data));
  }
}

test("manifest dimensions match actual WebP files", async () => {
  const images = JSON.parse(fs.readFileSync(path.join(root, "image-library.json"), "utf8"));
  for (const image of images) {
    const actual = await sharp(path.join(process.cwd(), "public", image.path)).metadata();
    assert.equal(image.width, actual.width, image.path);
    assert.equal(image.height, actual.height, image.path);
  }
});

test("release preparation is read-only, all six translations share a slot, and apply preserves dates and content", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "blog-release-test-"));
  try {
    copyReviewFixtures(directory);
    const release = prepareRelease(directory, releaseAt, approvalAt);
    assert.equal(release.changes.length, 90);
    for (const change of release.changes) assert.equal(fs.readFileSync(change.file, "utf8"), change.before);
    applyRelease(release.changes);
    for (const { topic, scheduledAt } of release.schedule) {
      for (const locale of BLOG_LOCALES) {
        const parsed = matter(fs.readFileSync(path.join(directory, locale, topic + ".md"), "utf8"));
        const post = blogFrontmatterSchema.parse(parsed.data);
        assert.equal(post.publication?.scheduledAt, scheduledAt);
        assert.equal(post.publication?.approvedAt, approvalAt.toISOString());
        assert.equal(post.publishedAt, null);
        assert.equal(isPublicPost(post, new Date(Date.parse(scheduledAt) - 1)), false);
        assert.equal(isPublicPost(post, new Date(scheduledAt)), true);
        const original = matter(fs.readFileSync(path.join(root, locale, topic + ".md"), "utf8"));
        assert.equal(parsed.content, original.content);
        assert.deepEqual(post.sources, original.data.sources);
      }
    }
    assert.throws(() => prepareRelease(directory, releaseAt, approvalAt), /未|미게시/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test("release refuses missing translations, changed drafts, past starts and stale verification", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "blog-release-test-"));
  try {
    copyReviewFixtures(directory);
    assert.throws(() => prepareRelease(directory, approvalAt, releaseAt), /현재보다 늦어야/);
    assert.throws(() => prepareRelease(directory, new Date("2026-12-01"), new Date("2026-11-15")), /다시 확인/);
    const release = prepareRelease(directory, releaseAt, approvalAt);
    const last = release.changes.at(-1)!;
    fs.writeFileSync(last.file, last.before + "\nEdited");
    assert.throws(() => applyRelease(release.changes), /원고가 변경/);
    assert.equal(fs.readFileSync(release.changes[0].file, "utf8"), release.changes[0].before);
    fs.unlinkSync(last.file);
    assert.throws(() => prepareRelease(directory, releaseAt, approvalAt), /ENOENT/);
    assert.equal(fs.readFileSync(release.changes[0].file, "utf8"), release.changes[0].before);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
