import { ArrowRight, BookOpen, Clock, Tag } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import { getBlogPosts, type BlogPost } from "@/lib/blog";
import { BLOG_COPY, formatBlogDate } from "@/lib/blog-copy";
import { getBlogIndexPath, getBlogPostPath, type BlogLocale } from "@/lib/blog-routing";
import { localizedHref } from "@/lib/i18n";

function ArticleCard({ post, locale, compact = false }: { post: BlogPost; locale: BlogLocale; compact?: boolean }) {
  const copy = BLOG_COPY[locale];
  const href = getBlogPostPath(locale, post.slug);

  return (
    <article className={`group overflow-hidden rounded-[28px] border border-line bg-surface shadow-sm shadow-ink/5 ${compact ? "" : "lg:grid lg:grid-cols-[1.08fr_0.92fr]"}`}>
      <Link href={href} className={`relative block overflow-hidden bg-paper-soft ${compact ? "aspect-[8/5]" : "aspect-[8/5] lg:aspect-auto lg:min-h-[390px]"}`} tabIndex={-1} aria-hidden="true">
        <Image src={post.heroImage.src} alt="" fill sizes={compact ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 1024px) 100vw, 55vw"} className="object-cover transition duration-500 group-hover:scale-[1.025]" />
      </Link>
      <div className={`flex flex-col ${compact ? "p-6 lg:p-7" : "p-7 lg:justify-center lg:p-12"}`}>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cobalt-soft px-3 py-1.5 text-cobalt"><Tag size={13} weight="bold" aria-hidden="true" /> {post.category}</span>
          <span className="inline-flex items-center gap-1.5 text-muted"><Clock size={14} aria-hidden="true" /> {post.readingMinutes}{copy.minutes}</span>
          {post.status === "review" ? <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-800">{copy.reviewBadge}</span> : null}
        </div>
        <h2 className={`mt-5 font-display font-semibold leading-tight text-ink ${compact ? "text-2xl" : "text-3xl lg:text-4xl"}`}>
          <Link href={href} className="transition hover:text-cobalt">{post.title}</Link>
        </h2>
        <p className="mt-4 text-[15px] leading-7 text-muted">{post.excerpt}</p>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
          <p className="text-xs text-gray-500">{copy.updated} {formatBlogDate(locale, post.modifiedAt)}</p>
          <Link href={href} className="inline-flex items-center gap-2 text-sm font-semibold text-cobalt transition hover:text-cobalt-ink">{copy.readArticle} <ArrowRight size={16} weight="bold" aria-hidden="true" /></Link>
        </div>
      </div>
    </article>
  );
}

export default function BlogIndex({ locale }: { locale: BlogLocale }) {
  const posts = getBlogPosts(locale);
  const copy = BLOG_COPY[locale];
  const [featured, ...rest] = posts;

  return (
    <main>
      <section className="border-b border-line bg-paper-soft">
        <div className="max-w-content mx-auto px-5 py-16 lg:px-8 lg:py-24">
          <p className="flex items-center gap-2 text-sm font-semibold text-cobalt"><BookOpen size={18} weight="duotone" aria-hidden="true" /> {copy.eyebrow}</p>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-semibold tracking-[-0.035em] text-ink text-balance sm:text-5xl lg:text-6xl">{copy.indexTitle}</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-muted lg:text-lg">{copy.indexDescription}</p>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-muted">{copy.policyNotice}</p>
        </div>
      </section>

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-16 lg:px-8 lg:py-24">
          {featured ? (
            <>
              <ArticleCard post={featured} locale={locale} />
              {rest.length ? <div className="mt-7 grid gap-7 lg:grid-cols-2">{rest.map((post) => <ArticleCard key={post.slug} post={post} locale={locale} compact />)}</div> : null}
            </>
          ) : (
            <div className="rounded-[28px] border border-line bg-paper-soft px-6 py-14 text-center lg:px-12">
              <h2 className="font-display text-2xl font-semibold text-ink">{copy.emptyTitle}</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted">{copy.emptyDescription}</p>
              <Link href={localizedHref(locale, "/contact")} className="mt-7 inline-flex items-center gap-2 rounded-full bg-cobalt px-5 py-3 text-sm font-semibold text-white transition hover:bg-cobalt-ink">{copy.contactCta} <ArrowRight size={16} weight="bold" aria-hidden="true" /></Link>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-line bg-paper-soft">
        <div className="max-w-content mx-auto flex flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p className="max-w-2xl text-sm leading-7 text-muted">{copy.contactDescription}</p>
          <Link href={localizedHref(locale, "/services")} className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-cobalt transition hover:text-cobalt-ink">{copy.contactTitle} <ArrowRight size={16} weight="bold" aria-hidden="true" /></Link>
        </div>
      </section>
    </main>
  );
}

export { getBlogIndexPath };
