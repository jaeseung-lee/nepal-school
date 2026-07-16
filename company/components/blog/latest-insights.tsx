import { ArrowRight, CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import { getBlogPosts, type BlogPost } from "@/lib/blog";
import { BLOG_COPY, formatBlogDate } from "@/lib/blog-copy";
import { getBlogIndexPath, getBlogPostPath, isBlogLocale } from "@/lib/blog-routing";
import type { Locale } from "@/lib/i18n";

function InsightLink({ post, locale }: { post: BlogPost; locale: "ko" | "ja" | "ne" }) {
  const copy = BLOG_COPY[locale];
  return (
    <article className="group grid grid-cols-[112px_1fr] gap-4 border-b border-line pb-5 last:border-b-0 last:pb-0 sm:grid-cols-[150px_1fr]">
      <Link href={getBlogPostPath(locale, post.slug)} className="relative aspect-[8/5] overflow-hidden rounded-2xl bg-paper-soft" tabIndex={-1} aria-hidden="true">
        <Image src={post.heroImage.src} alt="" fill sizes="150px" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
      </Link>
      <div className="min-w-0 py-0.5">
        <p className="text-xs font-semibold text-cobalt">{post.category}</p>
        <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-ink"><Link href={getBlogPostPath(locale, post.slug)} className="transition hover:text-cobalt">{post.title}</Link></h3>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><CalendarBlank size={14} aria-hidden="true" /> {copy.updated} {formatBlogDate(locale, post.modifiedAt)}</p>
      </div>
    </article>
  );
}

export default function LatestInsights({ locale }: { locale: Locale }) {
  if (!isBlogLocale(locale)) return null;
  const posts = getBlogPosts(locale).slice(0, 3);
  if (!posts.length) return null;
  const [featured, ...rest] = posts;
  const copy = BLOG_COPY[locale];

  return (
    <section className="border-y border-line bg-paper-soft">
      <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold tracking-[0.12em] text-cobalt">{copy.eyebrow}</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-ink lg:text-5xl">{copy.latestTitle}</h2>
            <p className="mt-4 text-base leading-7 text-muted">{copy.latestDescription}</p>
          </div>
          <Link href={getBlogIndexPath(locale)} className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-cobalt transition hover:text-cobalt-ink">{copy.latestCta} <ArrowRight size={16} weight="bold" aria-hidden="true" /></Link>
        </div>

        <div className={`mt-10 grid gap-8 ${rest.length ? "lg:grid-cols-[1.12fr_0.88fr]" : ""}`}>
          <article className="group overflow-hidden rounded-[28px] border border-line bg-white shadow-sm shadow-ink/5">
            <Link href={getBlogPostPath(locale, featured.slug)} className="relative block aspect-[16/8.5] overflow-hidden bg-paper" tabIndex={-1} aria-hidden="true">
              <Image src={featured.heroImage.src} alt="" fill sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover transition duration-500 group-hover:scale-[1.025]" />
            </Link>
            <div className="p-6 lg:p-8">
              <p className="text-sm font-semibold text-cobalt">{featured.category}</p>
              <h3 className="mt-3 font-display text-2xl font-semibold leading-tight text-ink lg:text-3xl"><Link href={getBlogPostPath(locale, featured.slug)} className="transition hover:text-cobalt">{featured.title}</Link></h3>
              <p className="mt-3 text-sm leading-7 text-muted">{featured.excerpt}</p>
            </div>
          </article>
          {rest.length ? <div className="flex flex-col justify-center gap-5">{rest.map((post) => <InsightLink key={post.slug} post={post} locale={locale} />)}</div> : null}
        </div>
      </div>
    </section>
  );
}
