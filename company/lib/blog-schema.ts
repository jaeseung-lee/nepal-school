import { z } from "zod";
import { BLOG_LOCALES } from "@/lib/blog-routing";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다.");
const localWebpPath = z.string().regex(/^\/[a-zA-Z0-9/_-]+\.webp$/, "로컬 WebP 경로만 사용할 수 있습니다.");

export const blogImageSchema = z.object({
  src: localWebpPath,
  alt: z.string().trim().min(8, "이미지 alt는 구체적으로 작성해야 합니다."),
  caption: z.string().trim().min(4).optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const blogSourceSchema = z.object({
  label: z.string().trim().min(3),
  url: z.string().url().refine((url) => url.startsWith("https://"), "공식 출처는 HTTPS URL이어야 합니다."),
  description: z.string().trim().min(10),
  publishedAt: isoDate.nullable(),
  effectiveAt: isoDate.nullable(),
  accessedAt: isoDate,
});

export const blogFrontmatterSchema = z
  .object({
    language: z.enum(BLOG_LOCALES),
    jurisdiction: z.enum(["KR", "JP", "NP"]),
    translationKey: z.string().trim().min(3),
    title: z.string().trim().min(10),
    seoTitle: z.string().trim().min(10).max(70),
    summary: z.string().trim().min(30).max(220),
    excerpt: z.string().trim().min(30).max(220),
    category: z.string().trim().min(2),
    keywords: z.array(z.string().trim().min(2)).min(3).max(12),
    asOf: isoDate,
    effectiveAt: isoDate.nullable(),
    effectiveStatus: z.enum(["in_force", "scheduled"]).nullable(),
    publishedAt: isoDate,
    modifiedAt: isoDate,
    generationMethod: z.enum(["human", "ai-assisted"]),
    sourceVerification: z.object({
      method: z.literal("official-primary-sources"),
      checkedAt: isoDate,
    }),
    author: z.object({
      name: z.string().trim().min(2),
      role: z.string().trim().min(2),
    }),
    reviewer: z
      .object({
        name: z.string().trim().min(2),
        credentials: z.string().trim().min(4),
        reviewedAt: isoDate,
      })
      .nullable()
      .optional(),
    status: z.enum(["review", "published"]),
    heroImage: blogImageSchema,
    sources: z.array(blogSourceSchema).min(2),
    relatedPosts: z
      .array(
        z.object({
          label: z.string().trim().min(2),
          href: z.string().regex(/^\//, "관련 글은 사이트 내부 경로여야 합니다."),
          description: z.string().trim().min(8),
        }),
      )
      .max(5),
  })
  .superRefine((post, context) => {
    if (post.reviewer && post.reviewer.reviewedAt > post.modifiedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reviewer", "reviewedAt"],
        message: "검토일은 수정일보다 늦을 수 없습니다.",
      });
    }

    if (post.sourceVerification.checkedAt > post.modifiedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceVerification", "checkedAt"],
        message: "공식 출처 대조일은 수정일보다 늦을 수 없습니다.",
      });
    }

    if (post.effectiveAt === null && post.effectiveStatus !== null) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["effectiveStatus"], message: "시행일이 없으면 시행 상태도 null이어야 합니다." });
    }

    if (post.effectiveAt !== null && post.effectiveStatus === null) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["effectiveStatus"], message: "시행일이 있으면 시행 상태가 필요합니다." });
    }
  });

export type BlogFrontmatter = z.infer<typeof blogFrontmatterSchema>;

export type BlogPost = BlogFrontmatter & {
  slug: string;
  content: string;
  readingMinutes: number;
  filePath: string;
};

export const imageManifestSchema = z.array(
  z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    path: localWebpPath,
    topics: z.array(z.string().min(2)).min(1),
    provenance: z.enum(["existing-site-asset", "commissioned", "licensed", "generated-and-approved"]),
    rights: z.string().min(8),
    allowedUses: z.array(z.enum(["hero", "inline"])).min(1),
    defaultAlt: z.object({
      ko: z.string().min(8),
      en: z.string().min(8),
      ja: z.string().min(8),
      ne: z.string().min(8),
      vi: z.string().min(8),
      lo: z.string().min(8),
    }),
  }),
);

export type ImageManifestEntry = z.infer<typeof imageManifestSchema>[number];
