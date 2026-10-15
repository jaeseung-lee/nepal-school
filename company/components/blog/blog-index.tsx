import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import PageBanner from "@/components/page-banner";
import { getBlogPosts, type BlogPost } from "@/lib/blog";
import { BLOG_COPY, formatBlogDate } from "@/lib/blog-copy";
import { getBlogIndexPath, getBlogPostPath, type BlogLocale } from "@/lib/blog-routing";
import { localizedHref } from "@/lib/i18n";
import { SECTION_LABELS } from "@/lib/section-labels";

/** 제목 링크가 카드 전체를 덮는다. 포커스 링도 카드 영역에 그린다. */
const STRETCHED_LINK =
  "decoration-1 underline-offset-4 after:absolute after:inset-0 group-hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-ink";

function ArticleCard({ post, locale, featured = false }: { post: BlogPost; locale: BlogLocale; featured?: boolean }) {
  const copy = BLOG_COPY[locale];
  const href = getBlogPostPath(locale, post.slug);

  return (
    <article className={`group relative ${featured ? "grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-8" : "border-t border-line pt-6"}`}>
      <div className={`relative aspect-[8/5] overflow-hidden bg-image ${featured ? "lg:col-span-7" : ""}`}>
        <Image
          src={post.heroImage.src}
          alt=""
          fill
          sizes={featured ? "(min-width: 1440px) 770px, (min-width: 1024px) 55vw, 100vw" : "(min-width: 1440px) 660px, (min-width: 1024px) 50vw, 100vw"}
          className="object-cover transition duration-500 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
        />
      </div>
      <div className={featured ? "lg:col-span-5 lg:pl-4" : "mt-6"}>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-meta text-muted">
          <span className="font-semibold text-ink">{post.category}</span>
          <span>{post.readingMinutes}{copy.minutes}</span>
          {post.status !== "published" ? (
            <span className="border border-ink px-2 py-0.5 font-semibold text-ink">{post.status === "scheduled" ? copy.scheduledBadge : copy.reviewBadge}</span>
          ) : null}
        </p>
        <h2
          className={`mt-4 text-balance text-ink ${featured ? "text-[clamp(1.75rem,1.2rem+1.6vw,2.75rem)] font-[750] leading-[1.3] tracking-[-0.045em]" : "text-xl font-bold leading-snug tracking-[-0.03em]"}`}
        >
          <Link href={href} className={STRETCHED_LINK}>{post.title}</Link>
        </h2>
        <p className="mt-4 text-description text-muted">{post.excerpt}</p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4 text-meta text-muted">
          <p>{copy.updated} {formatBlogDate(locale, post.modifiedAt)}</p>
          <span aria-hidden="true" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
            {copy.readArticle} <ArrowUpRight size={14} weight="bold" />
          </span>
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
      <PageBanner
        locale={locale}
        label={SECTION_LABELS.pages.insights}
        title={copy.indexTitle}
        eyebrow={copy.indexName}
        context={copy.policyNotice}
        desc={copy.indexDescription}
        crumb={copy.indexName}
      />

      <section className="bg-paper py-section">
        <div className="page-wrap">
          {featured ? (
            <>
              <ArticleCard post={featured} locale={locale} featured />
              {rest.length ? (
                <div className="mt-20 grid gap-x-8 gap-y-16 md:grid-cols-2 lg:mt-28">
                  {rest.map((post) => <ArticleCard key={post.slug} post={post} locale={locale} />)}
                </div>
              ) : null}
            </>
          ) : (
            <div className="border-t border-ink py-14 text-center">
              <h2 className="text-title text-ink">{copy.emptyTitle}</h2>
              <p className="mx-auto mt-3 max-w-lg text-description text-muted">{copy.emptyDescription}</p>
              <Link href={localizedHref(locale, "/contact")} className="pill pill-dark mt-8">
                {copy.contactCta} <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-line bg-paper-soft">
        <div className="page-wrap flex flex-col gap-6 py-12 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-description text-muted">{copy.contactDescription}</p>
          <Link href={localizedHref(locale, "/services")} className="pill pill-outline shrink-0">
            {copy.contactTitle} <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}

export { getBlogIndexPath };
