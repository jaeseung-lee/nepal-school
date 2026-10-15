import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import SectionHead from "@/components/section-head";
import { getBlogPosts } from "@/lib/blog";
import { BLOG_COPY, formatBlogDate } from "@/lib/blog-copy";
import { getBlogIndexPath, getBlogPostPath, isBlogLocale } from "@/lib/blog-routing";
import type { Locale } from "@/lib/i18n";

/** 홈의 최신 글 3개. 사진 없이 글자만 쓰는 에디토리얼 목록. */
export default function LatestInsights({ locale }: { locale: Locale }) {
  const blogLocale = isBlogLocale(locale) ? locale : null;
  if (!blogLocale) return null;
  const posts = getBlogPosts(blogLocale).slice(0, 3);
  if (!posts.length) return null;
  const copy = BLOG_COPY[blogLocale];

  return (
    <section aria-labelledby="insights-title" className="border-t border-line bg-surface py-section">
      <div className="page-wrap">
        <SectionHead
          label={copy.eyebrow}
          labelLang={/^[A-Z ]+$/.test(copy.eyebrow) ? "en" : undefined}
          title={copy.latestTitle}
          titleId="insights-title"
          description={copy.latestDescription}
          action={
            <Link href={getBlogIndexPath(blogLocale)} className="pill pill-outline">
              {copy.latestCta} <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
            </Link>
          }
        />

        <ol className="grid border-t border-line md:grid-cols-3">
          {posts.map((post) => (
            <li
              key={post.slug}
              className="group relative border-b border-line py-8 md:border-b-0 md:px-8 md:first:pl-0 md:last:pr-0 md:[&:not(:first-child)]:border-l"
            >
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted">
                <span className="font-semibold text-ink">{post.category}</span>
                <time dateTime={post.modifiedAt}>
                  {copy.updated} {formatBlogDate(blogLocale, post.modifiedAt)}
                </time>
              </p>
              <h3 className="mt-4 text-xl font-bold leading-snug tracking-[-0.03em] text-balance text-ink">
                <Link
                  href={getBlogPostPath(blogLocale, post.slug)}
                  className="decoration-1 underline-offset-4 after:absolute after:inset-0 group-hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-ink"
                >
                  {post.title}
                </Link>
              </h3>
              <p className="mt-3 line-clamp-3 text-description text-muted">{post.excerpt}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
