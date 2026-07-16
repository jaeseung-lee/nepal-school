import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { blogFrontmatterSchema, imageManifestSchema, type BlogPost, type ImageManifestEntry } from "@/lib/blog-schema";
import { BLOG_LOCALES, getBlogPostPath, type BlogLocale } from "@/lib/blog-routing";
import { SITE, SITE_URL } from "@/lib/site";

const BLOG_CONTENT_ROOT = path.join(process.cwd(), "content", "blog");
const IMAGE_MANIFEST_PATH = path.join(BLOG_CONTENT_ROOT, "image-library.json");

export type { BlogPost, ImageManifestEntry } from "@/lib/blog-schema";

function estimateReadingMinutes(content: string): number {
  const words = content.replace(/[`#>*_|\[\]()]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 260));
}

function readPostFile(locale: BlogLocale, fileName: string): BlogPost {
  const filePath = path.join(BLOG_CONTENT_ROOT, locale, fileName);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const frontmatter = blogFrontmatterSchema.parse(data);

  if (frontmatter.language !== locale) {
    throw new Error(`${filePath}: 폴더 언어와 frontmatter language가 다릅니다.`);
  }

  return {
    ...frontmatter,
    slug: fileName.replace(/\.md$/, ""),
    content: content.trim(),
    readingMinutes: estimateReadingMinutes(content),
    filePath,
  };
}

function shouldIncludeReviewPosts(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.BLOG_INCLUDE_REVIEW === "1"
  );
}

export function getBlogPosts(
  locale: BlogLocale,
  options: { includeReview?: boolean } = {},
): BlogPost[] {
  const localeDirectory = path.join(BLOG_CONTENT_ROOT, locale);
  if (!fs.existsSync(localeDirectory)) return [];

  const includeReview = options.includeReview ?? shouldIncludeReviewPosts();
  return fs
    .readdirSync(localeDirectory)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => readPostFile(locale, fileName))
    .filter((post) => includeReview || post.status === "published")
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt) || a.title.localeCompare(b.title));
}

export function getAllBlogPosts(options: { includeReview?: boolean } = {}): BlogPost[] {
  return BLOG_LOCALES.flatMap((locale) => getBlogPosts(locale, options));
}

export function getBlogPost(
  locale: BlogLocale,
  slug: string,
  options: { includeReview?: boolean } = {},
): BlogPost | undefined {
  return getBlogPosts(locale, options).find((post) => post.slug === slug);
}

export function getBlogPostUrl(locale: BlogLocale, slug: string): string {
  return SITE_URL + getBlogPostPath(locale, slug);
}

export function getImageManifest(): ImageManifestEntry[] {
  return imageManifestSchema.parse(JSON.parse(fs.readFileSync(IMAGE_MANIFEST_PATH, "utf8")));
}

export function getPublishedTranslations(translationKey: string): Partial<Record<BlogLocale, BlogPost>> {
  return Object.fromEntries(
    getAllBlogPosts({ includeReview: false })
      .filter((post) => post.translationKey === translationKey)
      .map((post) => [post.language, post]),
  );
}

export const BLOG_AUTHOR = {
  "@type": "Organization",
  name: SITE.nameKo,
  url: SITE_URL,
} as const;
