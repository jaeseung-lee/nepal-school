import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import { blogFrontmatterSchema, imageManifestSchema, type BlogFrontmatter } from "../lib/blog-schema";
import { BLOG_LOCALES, type BlogLocale } from "../lib/blog-routing";

const root = process.cwd();
const contentRoot = path.join(root, "content", "blog");
const publicRoot = path.join(root, "public");

const OFFICIAL_SOURCE_HOSTS: Record<BlogFrontmatter["jurisdiction"], string[]> = {
  KR: ["moj.go.kr", "mojhome.moj.go.kr", "hikorea.go.kr", "law.go.kr", "eps.hrdkorea.or.kr", "moel.go.kr"],
  JP: ["moj.go.jp", "mofa.go.jp", "mhlw.go.jp"],
  NP: ["dofe.gov.np", "nepal.gov.np", "mofa.gov.np", "kr.nepalembassy.gov.np", "jp.nepalembassy.gov.np"],
};

export type MarkdownImage = { alt: string; src: string; caption?: string };

export function extractMarkdownImages(content: string): MarkdownImage[] {
  const images: MarkdownImage[] = [];
  const expression = /!\[([^\]]*)\]\((\S+?)(?:\s+["']([^"']+)["'])?\)/g;
  for (const match of content.matchAll(expression)) {
    images.push({ alt: match[1].trim(), src: match[2].trim(), caption: match[3]?.trim() });
  }
  return images;
}

export function validateTemporalState(post: BlogFrontmatter, today: string): string[] {
  const errors: string[] = [];
  if (post.asOf > today) errors.push("기준일은 미래일 수 없습니다.");
  if (post.publishedAt > today) errors.push("게시일은 미래일 수 없습니다.");
  if (post.modifiedAt > today) errors.push("수정일은 미래일 수 없습니다.");
  if (post.publishedAt > post.modifiedAt) errors.push("수정일은 게시일보다 빠를 수 없습니다.");

  if (post.effectiveAt && post.effectiveStatus === "scheduled" && post.effectiveAt <= today) {
    errors.push("시행일이 지났으므로 scheduled 상태를 사용할 수 없습니다.");
  }
  if (post.effectiveAt && post.effectiveStatus === "in_force" && post.effectiveAt > today) {
    errors.push("미래 시행일에는 in_force 상태를 사용할 수 없습니다.");
  }
  return errors;
}

function hostIsAllowed(url: string, jurisdiction: BlogFrontmatter["jurisdiction"]): boolean {
  const host = new URL(url).hostname.toLowerCase();
  return OFFICIAL_SOURCE_HOSTS[jurisdiction].some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

function fail(errors: string[]): never {
  console.error(`블로그 콘텐츠 검증 실패 (${errors.length}건)`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

export function validateBlogContent(today = new Date().toISOString().slice(0, 10)): string[] {
  const errors: string[] = [];
  const manifestPath = path.join(contentRoot, "image-library.json");
  const manifestResult = imageManifestSchema.safeParse(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
  if (!manifestResult.success) {
    return manifestResult.error.issues.map((issue) => `image-library.json: ${issue.path.join(".")} ${issue.message}`);
  }

  const manifest = new Map(manifestResult.data.map((image) => [image.path, image]));
  const identifiers = new Set<string>();
  const translationIdentifiers = new Set<string>();

  for (const image of manifestResult.data) {
    if (!fs.existsSync(path.join(publicRoot, image.path.slice(1)))) {
      errors.push(`image-library.json: 파일이 없습니다: ${image.path}`);
    }
  }

  for (const locale of BLOG_LOCALES) {
    const localeRoot = path.join(contentRoot, locale);
    const fileNames = fs.readdirSync(localeRoot).filter((name) => name.endsWith(".md"));
    for (const fileName of fileNames) {
      const filePath = path.join(localeRoot, fileName);
      const relativePath = path.relative(root, filePath);
      let parsed: ReturnType<typeof matter>;
      try {
        parsed = matter(fs.readFileSync(filePath, "utf8"));
      } catch (error) {
        errors.push(`${relativePath}: Markdown을 읽을 수 없습니다: ${String(error)}`);
        continue;
      }

      const schemaResult = blogFrontmatterSchema.safeParse(parsed.data);
      if (!schemaResult.success) {
        for (const issue of schemaResult.error.issues) {
          errors.push(`${relativePath}: ${issue.path.join(".")} ${issue.message}`);
        }
        continue;
      }

      const post = schemaResult.data;
      const slug = fileName.replace(/\.md$/, "");
      const identifier = `${locale}/${slug}`;
      const translationIdentifier = `${locale}/${post.translationKey}`;
      if (identifiers.has(identifier)) errors.push(`${relativePath}: 중복 slug입니다.`);
      if (translationIdentifiers.has(translationIdentifier)) errors.push(`${relativePath}: 같은 언어의 translationKey가 중복됩니다.`);
      identifiers.add(identifier);
      translationIdentifiers.add(translationIdentifier);

      if (post.language !== locale) errors.push(`${relativePath}: 폴더 언어와 language가 다릅니다.`);
      if (parsed.content.trim().length < 500) errors.push(`${relativePath}: 본문이 너무 짧습니다.`);
      for (const temporalError of validateTemporalState(post, today)) {
        errors.push(`${relativePath}: ${temporalError}`);
      }

      const hero = manifest.get(post.heroImage.src);
      if (!hero) errors.push(`${relativePath}: 대표 이미지가 이미지 라이브러리에 없습니다: ${post.heroImage.src}`);
      else if (!hero.allowedUses.includes("hero")) errors.push(`${relativePath}: 대표 이미지로 허용되지 않은 이미지입니다.`);

      for (const source of post.sources) {
        if (!hostIsAllowed(source.url, post.jurisdiction)) {
          errors.push(`${relativePath}: 관할 국가의 공식 출처 허용 목록에 없는 URL입니다: ${source.url}`);
        }
        if (source.accessedAt > today) errors.push(`${relativePath}: 출처 확인일은 미래일 수 없습니다.`);
      }

      const inlineImages = extractMarkdownImages(parsed.content);
      if (inlineImages.length > 2) errors.push(`${relativePath}: 본문 이미지는 최대 2개까지 사용할 수 있습니다.`);
      for (const image of inlineImages) {
        if (!image.alt) errors.push(`${relativePath}: 본문 이미지 alt가 비어 있습니다.`);
        if (!image.src.startsWith("/") || !image.src.endsWith(".webp")) {
          errors.push(`${relativePath}: 본문 이미지는 로컬 WebP만 사용할 수 있습니다: ${image.src}`);
          continue;
        }
        const entry = manifest.get(image.src);
        if (!entry) errors.push(`${relativePath}: 본문 이미지가 이미지 라이브러리에 없습니다: ${image.src}`);
        else if (!entry.allowedUses.includes("inline")) errors.push(`${relativePath}: 본문 사용이 허용되지 않은 이미지입니다: ${image.src}`);
      }
    }
  }

  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = validateBlogContent();
  if (errors.length) fail(errors);
  console.log(`블로그 콘텐츠 검증 통과: ${BLOG_LOCALES.join(", ")} · 이미지·출처·상태 규칙 확인 완료`);
}
