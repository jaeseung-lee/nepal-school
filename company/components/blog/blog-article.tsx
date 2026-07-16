import { ArrowLeft, ArrowRight, CalendarBlank, CheckCircle, Clock, LinkSimple } from "@phosphor-icons/react/dist/ssr";
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

export default function BlogArticle({ post, locale }: { post: BlogPost; locale: BlogLocale }) {
  const copy = BLOG_COPY[locale];
  const indexPath = getBlogIndexPath(locale);
  const headings = getHeadings(post.content);

  return (
    <main>
      {post.status === "published" ? <BlogPostSchema post={post} /> : null}
      <article>
        <header className="border-b border-line bg-paper-soft">
          <div className="max-w-[920px] mx-auto px-5 py-14 lg:px-8 lg:py-20">
            <nav aria-label="Breadcrumb" className="text-sm text-muted">
              <ol className="flex flex-wrap items-center gap-2">
                <li><Link href={localizedHref(locale, "/")} className="transition hover:text-cobalt">{copy.home}</Link></li>
                <li aria-hidden="true">/</li>
                <li><Link href={indexPath} className="transition hover:text-cobalt">{copy.indexName}</Link></li>
                <li aria-hidden="true">/</li>
                <li className="text-ink" aria-current="page">{post.category}</li>
              </ol>
            </nav>
            <div className="mt-9 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-cobalt">{post.category}</span>
              {post.status === "review" ? <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{copy.reviewBadge}</span> : null}
            </div>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.14] tracking-[-0.035em] text-ink text-balance sm:text-5xl lg:text-6xl">{post.title}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted">{post.summary}</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
              <span className="inline-flex items-center gap-2"><CalendarBlank size={17} aria-hidden="true" /> {copy.published} {formatBlogDate(locale, post.publishedAt)}</span>
              <span className="inline-flex items-center gap-2"><Clock size={17} aria-hidden="true" /> {post.readingMinutes}{copy.minutes}</span>
              <span>{copy.updated} {formatBlogDate(locale, post.modifiedAt)}</span>
            </div>
          </div>
        </header>

        <div className="max-w-[1040px] mx-auto px-5 pt-10 lg:px-8 lg:pt-14">
          <figure>
            <div className="relative aspect-[8/5] overflow-hidden rounded-[28px] bg-paper-soft">
              <Image src={post.heroImage.src} alt={post.heroImage.alt} fill priority sizes="(max-width: 1080px) 100vw, 1040px" className="object-cover" />
            </div>
            {post.heroImage.caption ? <figcaption className="mt-3 text-center text-sm leading-6 text-muted">{post.heroImage.caption}</figcaption> : null}
          </figure>
        </div>

        <div className="max-w-[860px] mx-auto px-5 pb-16 pt-12 lg:px-8 lg:pb-24 lg:pt-16">
          <dl className="grid overflow-hidden rounded-[22px] border border-line bg-paper-soft sm:grid-cols-2 lg:grid-cols-4">
            {[
              [copy.asOf, formatBlogDate(locale, post.asOf)],
              [copy.jurisdiction, JURISDICTIONS[post.jurisdiction]],
              [copy.author, post.author.name],
              [copy.reviewer, post.reviewer?.name ?? copy.reviewBadge],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-line px-5 py-4 last:border-b-0 sm:border-r sm:even:border-r-0 lg:border-b-0 lg:even:border-r lg:last:border-r-0">
                <dt className="text-xs font-semibold text-muted">{label}</dt>
                <dd className="mt-1.5 text-sm font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          {headings.length > 1 ? (
            <nav aria-label={copy.processLabel} className="mt-10 rounded-[24px] border border-line bg-white p-6">
              <p className="text-sm font-semibold text-ink">{copy.processLabel}</p>
              <ol className="mt-4 grid gap-3 sm:grid-cols-2">
                {headings.map((heading, index) => (
                  <li key={heading} className="flex items-start gap-3 text-sm leading-6 text-muted">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cobalt-soft text-xs font-bold text-cobalt">{index + 1}</span>
                    <span>{heading}</span>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <div className="mt-12">
            <BlogMarkdown content={post.content} images={getImageManifest()} />
          </div>

          <section className="mt-14 rounded-[24px] border border-line bg-paper-soft p-6 lg:p-8" aria-labelledby="disclosure-title">
            <div className="flex items-center gap-2 text-cobalt"><CheckCircle size={20} weight="duotone" aria-hidden="true" /><h2 id="disclosure-title" className="font-display text-xl font-semibold text-ink">{copy.disclosureTitle}</h2></div>
            <p className="mt-4 text-sm leading-7 text-muted">{post.generationMethod === "ai-assisted" ? copy.aiDisclosure : copy.humanDisclosure}</p>
            <p className="mt-2 text-sm leading-7 text-muted">{copy.legalNotice}</p>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="font-semibold text-ink">{copy.author}</dt><dd className="mt-1 text-muted">{post.author.name} · {post.author.role}</dd></div>
              <div><dt className="font-semibold text-ink">{copy.reviewer}</dt><dd className="mt-1 text-muted">{post.reviewer ? `${post.reviewer.name} · ${post.reviewer.credentials} · ${copy.reviewedAt} ${formatBlogDate(locale, post.reviewer.reviewedAt)}` : copy.reviewBadge}</dd></div>
              <div className="sm:col-span-2"><dt className="font-semibold text-ink">{copy.revisions}</dt><dd className="mt-1 text-muted">{copy.published} {formatBlogDate(locale, post.publishedAt)} · {copy.updated} {formatBlogDate(locale, post.modifiedAt)}</dd></div>
            </dl>
          </section>

          <section className="mt-12 border-t border-line pt-10" aria-labelledby="sources-title">
            <h2 id="sources-title" className="font-display text-2xl font-semibold text-ink">{copy.sourcesTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{copy.sourcesDescription}</p>
            <ol className="mt-5 space-y-4">
              {post.sources.map((source) => (
                <li key={source.url} className="rounded-2xl border border-line bg-white p-5">
                  <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-2 font-semibold text-cobalt underline underline-offset-4 transition hover:text-cobalt-ink"><LinkSimple size={17} className="mt-1 shrink-0" aria-hidden="true" /> {source.label}</a>
                  <p className="mt-2 text-sm leading-6 text-muted">{source.description}</p>
                  <p className="mt-2 text-xs text-gray-500">{copy.accessedAt} {formatBlogDate(locale, source.accessedAt)}{source.effectiveAt ? ` · ${copy.effectiveAt} ${formatBlogDate(locale, source.effectiveAt)}` : ""}</p>
                </li>
              ))}
            </ol>
          </section>

          {post.relatedPosts.length ? (
            <aside className="mt-12 border-t border-line pt-10" aria-labelledby="related-title">
              <h2 id="related-title" className="font-display text-2xl font-semibold text-ink">{copy.relatedTitle}</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {post.relatedPosts.map((related) => (
                  <Link key={related.href} href={localizedHref(locale, related.href)} className="group rounded-2xl border border-line bg-paper-soft p-5 transition hover:border-cobalt/30 hover:shadow-sm">
                    <span className="flex items-center justify-between gap-3 font-semibold text-ink group-hover:text-cobalt">{related.label}<ArrowRight size={17} className="shrink-0" aria-hidden="true" /></span>
                    <span className="mt-2 block text-sm leading-6 text-muted">{related.description}</span>
                  </Link>
                ))}
              </div>
            </aside>
          ) : null}

          <div className="mt-10"><Link href={indexPath} className="inline-flex items-center gap-2 text-sm font-semibold text-cobalt transition hover:text-cobalt-ink"><ArrowLeft size={17} weight="bold" aria-hidden="true" /> {copy.backToIndex}</Link></div>
        </div>
      </article>

      <section className="border-t border-line bg-paper-soft">
        <div className="max-w-[860px] mx-auto flex flex-col gap-5 px-5 py-12 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div><p className="font-display text-xl font-semibold text-ink">{copy.contactTitle}</p><p className="mt-1 text-sm leading-6 text-muted">{copy.contactDescription}</p></div>
          <Link href={localizedHref(locale, "/contact")} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-cobalt px-5 py-3 text-sm font-semibold text-white transition hover:bg-cobalt-ink">{copy.contactCta} <ArrowRight size={16} weight="bold" aria-hidden="true" /></Link>
        </div>
      </section>
    </main>
  );
}
