import type { BlogFrontmatter } from "./blog-schema";

export function japanDate(now: Date): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** A scheduled article becomes public without a new build; review never does. */
export function resolvePublication<T extends BlogFrontmatter>(post: T, now: Date): T {
  if (post.status !== "scheduled" || !post.publication) return post;
  if (Date.parse(post.publication.approvedAt) > now.getTime()) return post;
  if (Date.parse(post.publication.scheduledAt) > now.getTime()) return post;
  const publishedAt = japanDate(new Date(post.publication.scheduledAt));
  return { ...post, status: "published", publishedAt, modifiedAt: post.modifiedAt > publishedAt ? post.modifiedAt : publishedAt };
}

export function isPublicPost(post: BlogFrontmatter, now: Date): boolean {
  const resolved = resolvePublication(post, now);
  return resolved.status === "published" && resolved.publishedAt !== null && resolved.publishedAt <= japanDate(now);
}

/** First three together, then one topic each Monday/Wednesday/Friday at 09:00 JST. */
export function publicationSlots(start: Date, count: number): string[] {
  if (!Number.isFinite(start.getTime()) || !Number.isInteger(count) || count < 1) throw new Error("Invalid release start or count");
  const slots = Array.from({ length: Math.min(3, count) }, () => start.toISOString());
  const day = new Date(`${japanDate(start)}T09:00:00+09:00`);
  while (slots.length < count) {
    day.setUTCDate(day.getUTCDate() + 1);
    if ([1, 3, 5].includes(day.getUTCDay())) slots.push(day.toISOString());
  }
  return slots;
}
