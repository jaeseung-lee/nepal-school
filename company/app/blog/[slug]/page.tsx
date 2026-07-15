import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarBlank, Clock, LinkSimple } from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";
import BlogPostSchema from "@/components/blog-post-schema";
import { BLOG_POSTS, getBlogPost, getBlogPostUrl } from "@/lib/blog";
import { SITE, SITE_URL } from "@/lib/site";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) return {};

  const url = getBlogPostUrl(post.slug);
  const imageUrl = SITE_URL + post.image;
  const fullTitle = post.seoTitle + " - " + SITE.nameKo;

  return {
    title: post.seoTitle,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: "/blog/" + post.slug },
    openGraph: {
      type: "article",
      siteName: SITE.nameKo,
      locale: "ko_KR",
      url,
      title: fullTitle,
      description: post.description,
      publishedTime: post.publishedAt,
      modifiedTime: post.modifiedAt,
      authors: [SITE.nameKo],
      images: [{ url: imageUrl, alt: post.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: post.description,
      images: [imageUrl],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) notFound();

  const modifiedAt = dateFormatter.format(new Date(post.modifiedAt + "T00:00:00+09:00"));
  const publishedAt = dateFormatter.format(new Date(post.publishedAt + "T00:00:00+09:00"));

  return (
    <main>
      <BlogPostSchema post={post} />

      <article>
        <header className="border-b border-line bg-paper-soft">
          <div className="max-w-[860px] mx-auto px-5 py-14 lg:px-8 lg:py-20">
            <nav aria-label="현재 위치" className="text-sm text-muted">
              <ol className="flex flex-wrap items-center gap-2">
                <li><Link href="/" className="transition hover:text-cobalt">홈</Link></li>
                <li aria-hidden="true">/</li>
                <li><Link href="/blog" className="transition hover:text-cobalt">인사이트</Link></li>
                <li aria-hidden="true">/</li>
                <li className="text-ink" aria-current="page">{post.category}</li>
              </ol>
            </nav>
            <p className="mt-9 text-sm font-semibold text-cobalt">{post.category}</p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.14] tracking-[-0.035em] text-ink sm:text-5xl lg:text-6xl">
              {post.title}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted">{post.description}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
              <span className="inline-flex items-center gap-2"><CalendarBlank size={17} aria-hidden="true" /> 게시 {publishedAt}</span>
              <span className="inline-flex items-center gap-2"><CalendarBlank size={17} aria-hidden="true" /> 수정 {modifiedAt}</span>
              <span className="inline-flex items-center gap-2"><Clock size={17} aria-hidden="true" /> 약 {post.readingMinutes}분</span>
            </div>
          </div>
        </header>

        <div className="max-w-[860px] mx-auto px-5 py-14 lg:px-8 lg:py-20">
          <div className="rounded-[24px] border border-cobalt/15 bg-cobalt-soft/45 p-5 text-[15px] leading-7 text-ink sm:p-6">
            <p className="font-semibold text-cobalt">이 글의 목적</p>
            <p className="mt-2">기업의 초기 검토를 돕는 정보입니다. 개별 비자·노무·송출 판단은 사실관계와 최신 공고에 따라 달라질 수 있으므로, 계약이나 신청 전에 공식 기관 또는 자격 있는 전문가에게 확인하세요.</p>
          </div>

          <div className="mt-12 space-y-14">
            {post.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">{section.heading}</h2>
                {section.lead ? <p className="mt-5 text-lg font-medium leading-8 text-ink">{section.lead}</p> : null}
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-[16px] leading-8 text-muted">{paragraph}</p>
                ))}
                {section.bullets ? (
                  <ul className="mt-6 space-y-3 rounded-[20px] border border-line bg-surface p-5 text-[15px] leading-7 text-ink sm:p-6">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cobalt" aria-hidden="true" />{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {section.table ? (
                  <div className="mt-7 overflow-x-auto rounded-[22px] border border-line bg-surface">
                    <table className="w-full min-w-[680px] text-left text-sm">
                      <caption className="px-5 pt-5 text-left font-display text-lg font-semibold text-ink">{section.table.caption}</caption>
                      <thead>
                        <tr className="border-b border-line bg-paper-soft">
                          {section.table.headers.map((header) => <th key={header} scope="col" className="px-5 py-4 font-semibold text-ink">{header}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {section.table.rows.map((row) => (
                          <tr key={row[0]}>
                            {row.map((cell, index) => index === 0
                              ? <th key={cell + index} scope="row" className="px-5 py-4 align-top font-semibold text-cobalt">{cell}</th>
                              : <td key={cell + index} className="px-5 py-4 align-top leading-6 text-muted">{cell}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </section>
            ))}
          </div>

          <section className="mt-16 border-t border-line pt-12" aria-labelledby="sources-heading">
            <h2 id="sources-heading" className="font-display text-2xl font-semibold text-ink">공식 근거 및 추가 확인</h2>
            <p className="mt-3 text-[15px] leading-7 text-muted">제도는 변경될 수 있습니다. 아래 원문에서 게시일과 최신 공지까지 확인하세요.</p>
            <ol className="mt-7 space-y-4">
              {post.sources.map((source) => (
                <li key={source.href} className="rounded-[18px] border border-line bg-surface p-5">
                  <a href={source.href} target="_blank" rel="noreferrer" className="inline-flex items-start gap-2 font-semibold leading-6 text-cobalt underline underline-offset-4 transition hover:text-cobalt-ink">
                    <LinkSimple size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> {source.label}
                  </a>
                  <p className="mt-2 text-sm leading-6 text-muted">{source.description}</p>
                </li>
              ))}
            </ol>
          </section>

          <aside className="mt-12 rounded-[26px] border border-line bg-paper-soft p-6 sm:p-8" aria-labelledby="related-heading">
            <h2 id="related-heading" className="font-display text-2xl font-semibold text-ink">이어서 살펴볼 내용</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {post.relatedLinks.map((link) => (
                <Link key={link.href} href={link.href} className="group rounded-[18px] border border-line bg-surface p-5 transition hover:border-cobalt/30 hover:shadow-sm">
                  <span className="flex items-center justify-between gap-3 font-semibold text-ink group-hover:text-cobalt">{link.label}<ArrowRight size={17} className="shrink-0" aria-hidden="true" /></span>
                  <span className="mt-2 block text-sm leading-6 text-muted">{link.description}</span>
                </Link>
              ))}
            </div>
          </aside>

          <div className="mt-10">
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-cobalt transition hover:text-cobalt-ink">
              <ArrowLeft size={17} weight="bold" aria-hidden="true" /> 모든 인사이트 보기
            </Link>
          </div>
        </div>
      </article>

      <section className="border-t border-line bg-paper-soft">
        <div className="max-w-[860px] mx-auto flex flex-col gap-5 px-5 py-12 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <p className="font-display text-xl font-semibold text-ink">기업의 채용 요건을 함께 정리해 보세요.</p>
            <p className="mt-1 text-sm leading-6 text-muted">교육, 매칭, 비자, 정착까지 필요한 단계와 역할을 안내합니다.</p>
          </div>
          <Link href="/contact" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-cobalt px-5 py-3 text-sm font-semibold text-white transition hover:bg-cobalt-ink">
            채용 상담 문의 <ArrowRight size={16} weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
