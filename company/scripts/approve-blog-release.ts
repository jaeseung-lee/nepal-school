import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import { z } from "zod";
import { BLOG_LOCALES } from "../lib/blog-routing";
import { blogFrontmatterSchema } from "../lib/blog-schema";
import { japanDate, publicationSlots } from "../lib/blog-publication";
import { validateBlogContent } from "./validate-blog";

const releasePlanSchema = z.object({
  id: z.string(),
  timezone: z.literal("Asia/Tokyo"),
  initialTopicCount: z.literal(3),
  followingWeekdays: z.tuple([z.literal("Monday"), z.literal("Wednesday"), z.literal("Friday")]),
  followingTime: z.literal("09:00"),
  locales: z.array(z.enum(BLOG_LOCALES)),
  topics: z.array(z.string().regex(/^[a-z0-9-]+$/)).length(15),
});

export function prepareRelease(contentRoot: string, start: Date, now = new Date()) {
  if (!Number.isFinite(start.getTime()) || start.getTime() <= now.getTime()) {
    throw new Error("공개 시작 시각은 현재보다 늦어야 합니다. 시간대가 포함된 --start 값을 지정하세요.");
  }
  const plan = releasePlanSchema.parse(JSON.parse(fs.readFileSync(path.join(contentRoot, "release-plan.json"), "utf8")));
  if (new Set(plan.topics).size !== 15 || [...plan.locales].sort().join() !== [...BLOG_LOCALES].sort().join()) {
    throw new Error("예약 계획에는 서로 다른 15개 주제와 여섯 언어가 한 번씩 있어야 합니다.");
  }
  const slots = publicationSlots(start, plan.topics.length);
  const changes: Array<{ file: string; before: string; after: string }> = [];
  const schedule = plan.topics.map((topic, index) => ({ topic, scheduledAt: slots[index] }));
  for (const { topic, scheduledAt } of schedule) {
    for (const locale of plan.locales) {
      const file = path.join(contentRoot, locale, `${topic}.md`);
      const before = fs.readFileSync(file, "utf8");
      const parsed = matter(before);
      const post = blogFrontmatterSchema.parse(parsed.data);
      if (post.translationKey !== topic || post.language !== locale || post.status !== "review" || post.publishedAt !== null) {
        throw new Error(`${locale}/${topic}: 미게시 검토 원고만 예약할 수 있습니다.`);
      }
      const age = (Date.parse(japanDate(now)) - Date.parse(post.sourceVerification.checkedAt)) / 86_400_000;
      if (age < 0 || age > 30) throw new Error(`${locale}/${topic}: 공개 승인 전 공식 출처를 다시 확인하세요(확인일 ${post.sourceVerification.checkedAt}).`);
      const next = {
        ...parsed.data,
        status: "scheduled",
        publishedAt: null,
        modifiedAt: japanDate(now),
        publication: { scheduledAt, approvedAt: now.toISOString() },
      };
      blogFrontmatterSchema.parse(next);
      changes.push({ file, before, after: matter.stringify(parsed.content, next) });
    }
  }
  return { id: plan.id, schedule, changes };
}

// Preflight every translation before touching any file. Restore completed writes on failure.
export function applyRelease(changes: ReturnType<typeof prepareRelease>["changes"]) {
  for (const change of changes) {
    if (fs.readFileSync(change.file, "utf8") !== change.before) throw new Error(`원고가 변경되었습니다: ${change.file}`);
  }
  const written: typeof changes = [];
  try {
    for (const change of changes) {
      written.push(change);
      fs.writeFileSync(change.file, change.after);
    }
  } catch (error) {
    for (const change of written.reverse()) fs.writeFileSync(change.file, change.before);
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    if (args.some((arg) => arg !== "--apply" && !arg.startsWith("--start="))) throw new Error("사용법: npm run blog:release -- --start=2026-10-02T09:00:00+09:00 [--apply]");
    const startValue = args.find((arg) => arg.startsWith("--start="))?.slice(8);
    if (!startValue || !/(Z|[+-]\d{2}:\d{2})$/.test(startValue)) throw new Error("시간대가 포함된 --start=YYYY-MM-DDTHH:mm:ss+09:00 값이 필요합니다.");
    const errors = validateBlogContent();
    if (errors.length) throw new Error(errors.join("\n"));
    const release = prepareRelease(path.join(process.cwd(), "content/blog"), new Date(startValue));
    const format = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", dateStyle: "short", timeStyle: "short" });
    for (const item of release.schedule) console.log(`${format.format(new Date(item.scheduledAt))} JST  ${item.topic} (6개 언어)`);
    if (args.includes("--apply")) {
      applyRelease(release.changes);
      console.log(`승인·예약 기록 저장: ${release.changes.length}개 원고. 배포 후 해당 시각부터 공개됩니다.`);
    } else {
      console.log(`미리보기: ${release.changes.length}개 원고. 파일 변경 없음. 원고 승인 후 --apply로 예약하고 배포하세요.`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
