import { ArrowLeft, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import BlogPostSchema from "@/components/blog-post-schema";
import BlogMarkdown from "@/components/blog/blog-markdown";
import { getImageManifest, type BlogPost } from "@/lib/blog";
import { BLOG_COPY, formatBlogDate } from "@/lib/blog-copy";
import { getBlogIndexPath, type BlogLocale } from "@/lib/blog-routing";
import { localizedHref } from "@/lib/i18n";

const JURISDICTIONS = { KR: "Korea", JP: "Japan", NP: "Nepal" } as const;

function getHeadings(content: string): string[] {
  return [...content.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1]).slice(0, 7);
}

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

export default function BlogArticle({ post, locale }: { post: BlogPost; locale: BlogLocale }) {
  const copy = BLOG_COPY[locale];
  const indexPath = getBlogIndexPath(locale);
  const headings = getHeadings(post.content);

  return (
    <main>
      {post.status === "published" ? <BlogPostSchema post={post} /> : null}
      <article>
        <header data-hero-overlay className="surface-dark bg-night pb-12 pt-32 text-white sm:pt-40 lg:pb-16">
          <div className="page-wrap">
            <nav aria-label="Breadcrumb" className="text-meta text-white/80">
              <ol className="flex flex-wrap items-center gap-2">
                <li><Link href={localizedHref(locale, "/")} className="underline-offset-4 transition hover:text-white hover:underline">{copy.home}</Link></li>
                <li aria-hidden="true">/</li>
                <li><Link href={indexPath} className="underline-offset-4 transition hover:text-white hover:underline">{copy.indexName}</Link></li>
                <li aria-hidden="true">/</li>
                <li className="text-white" aria-current="page">{post.category}</li>
              </ol>
            </nav>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold text-white">{post.category}</span>
              {post.status !== "published" ? (
                <span className="border border-white/60 px-2 py-0.5 text-meta font-semibold text-white">{post.status === "scheduled" ? copy.scheduledBadge : copy.reviewBadge}</span>
              ) : null}
            </div>
            <h1 className="mt-5 max-w-[22em] text-[clamp(2rem,1.3rem+2.2vw,3.25rem)] font-[750] leading-[1.25] tracking-[-0.05em] text-balance">{post.title}</h1>
            <div className="mt-10 grid gap-5 border-t border-white/30 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,32.5rem)] lg:gap-16">
              <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-meta tabular-nums text-white/80">
                {post.publishedAt ? <span>{copy.published} {formatBlogDate(locale, post.publishedAt)}</span> : null}
                <span>{post.readingMinutes}{copy.minutes}</span>
                <span>{copy.updated} {formatBlogDate(locale, post.modifiedAt)}</span>
              </p>
              <p className="text-description text-white/90">{post.summary}</p>
            </div>
          </div>
        </header>

        <div className="page-wrap pt-12 lg:pt-16">
          <figure className="mx-auto max-w-[65rem]">
            <div className="relative aspect-[8/5] overflow-hidden bg-image">
              <Image src={post.heroImage.src} alt={post.heroImage.alt} fill priority sizes="(min-width: 1120px) 1040px, 100vw" className="object-cover" />
            </div>
            {post.heroImage.caption ? <figcaption className="mt-3 text-[13px] leading-6 text-muted">{post.heroImage.caption}</figcaption> : null}
          </figure>
        </div>

        <div className="mx-auto w-[min(100%_-_2*var(--spacing-gutter),52rem)] pb-16 pt-12 lg:pb-24 lg:pt-16">
          <dl className="grid border-t border-ink sm:grid-cols-2 lg:grid-cols-4">
            {[
              [copy.asOf, formatBlogDate(locale, post.asOf)],
              [copy.jurisdiction, JURISDICTIONS[post.jurisdiction]],
              [copy.author, post.author.name],
              [copy.sourcesTitle, formatBlogDate(locale, post.sourceVerification.checkedAt)],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-line py-4 sm:pr-5">
                <dt className="text-meta text-muted">{label}</dt>
                <dd className="mt-1.5 text-sm font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          {headings.length > 1 ? (
            <nav aria-label={copy.processLabel} className="mt-12">
              <p className="text-sm font-bold text-ink">{copy.processLabel}</p>
              <ol className="mt-4 grid border-t border-line sm:grid-cols-2 sm:gap-x-8">
                {headings.map((heading, index) => (
                  <li key={heading} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2 border-b border-line py-3 text-sm leading-6 text-ink">
                    <span className="pt-px text-meta tabular-nums text-muted" aria-hidden="true">{twoDigits(index + 1)}</span>
                    <span>{heading}</span>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <div className="mt-12">
            <BlogMarkdown content={post.content} images={getImageManifest()} />
          </div>

          <section className="mt-16 border-t border-ink pt-10" aria-labelledby="sources-title">
            <h2 id="sources-title" className="text-title text-ink">{copy.sourcesTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{copy.sourcesDescription}</p>
            <ol className="mt-6 border-t border-line">
              {post.sources.map((source, index) => (
                <li key={source.url} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2 border-b border-line py-5">
                  <span className="pt-1 text-meta tabular-nums text-muted" aria-hidden="true">{twoDigits(index + 1)}</span>
                  <div>
                    <a href={source.url} target="_blank" rel="noreferrer" data-seo-event="official_source_clicked" data-content-id={post.translationKey} data-jurisdiction={post.jurisdiction} data-locale={locale} className="inline-flex items-start gap-1.5 font-semibold text-ink underline decoration-ink/35 underline-offset-4 transition hover:decoration-ink">
                      {source.label} <ArrowUpRight size={14} weight="bold" className="mt-1.5 shrink-0" aria-hidden="true" />
                    </a>
                    <p className="mt-2 text-sm leading-6 text-muted">{source.description}</p>
                    <p className="mt-2 text-meta text-muted">{copy.accessedAt} {formatBlogDate(locale, source.accessedAt)}{source.effectiveAt ? ` · ${copy.effectiveAt} ${formatBlogDate(locale, source.effectiveAt)}` : ""}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {post.relatedPosts.length ? (
            <aside className="mt-16 border-t border-ink pt-10" aria-labelledby="related-title">
              <h2 id="related-title" className="text-title text-ink">{copy.relatedTitle}</h2>
              <div className="mt-6 grid gap-x-8 sm:grid-cols-2">
                {post.relatedPosts.map((related) => (
                  <Link key={related.href} href={localizedHref(locale, related.href)} className="group border-t border-line py-5">
                    <span className="flex items-start justify-between gap-3 font-semibold text-ink underline-offset-4 group-hover:underline">
                      {related.label}
                      <ArrowUpRight size={16} weight="bold" className="mt-1 shrink-0" aria-hidden="true" />
                    </span>
                    <span className="mt-2 block text-sm leading-6 text-muted">{related.description}</span>
                  </Link>
                ))}
              </div>
            </aside>
          ) : null}

          <div className="mt-12">
            <Link href={indexPath} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink underline decoration-ink/35 underline-offset-4 hover:decoration-ink">
              <ArrowLeft size={16} weight="bold" aria-hidden="true" /> {copy.backToIndex}
            </Link>
          </div>
        </div>
      </article>

      <section className="border-t border-line bg-paper-soft">
        <div className="mx-auto flex w-[min(100%_-_2*var(--spacing-gutter),52rem)] flex-col gap-6 py-12 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-title text-ink">{copy.contactTitle}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{copy.contactDescription}</p>
          </div>
          <Link href={localizedHref(locale, "/contact")} data-seo-event="cta_clicked" data-content-id="hiring-preparation" data-locale={locale} className="pill pill-dark shrink-0">
            {copy.contactCta} <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
