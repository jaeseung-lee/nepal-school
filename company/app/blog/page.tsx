import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Tag } from "@phosphor-icons/react/dist/ssr";
import { BLOG_POSTS } from "@/lib/blog";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "인사이트 | 외국인력 채용·비자 가이드",
  description:
    "외국인력 채용, 한국 취업비자, 일본 특정기능 채용에 관한 기업 실무 가이드입니다. 공식 출처와 기준일을 함께 안내합니다.",
  keywords: ["외국인력 채용", "외국인 채용 비자", "E-9", "E-7", "일본 특정기능"],
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    siteName: SITE.nameKo,
    locale: "ko_KR",
    url: "/blog",
    title: "인사이트 | 외국인력 채용·비자 가이드 - " + SITE.nameKo,
    description: "외국인력 채용과 비자 경로를 기업 관점에서 정리한 실무 가이드입니다.",
  },
  twitter: {
    card: "summary_large_image",
    title: "인사이트 | 외국인력 채용·비자 가이드 - " + SITE.nameKo,
    description: "외국인력 채용과 비자 경로를 기업 관점에서 정리한 실무 가이드입니다.",
  },
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default function BlogIndexPage() {
  return (
    <main>
      <section className="border-b border-line bg-paper-soft">
        <div className="max-w-content mx-auto px-5 py-16 lg:px-8 lg:py-24">
          <p className="flex items-center gap-2 text-sm font-semibold text-cobalt">
            <BookOpen size={18} weight="duotone" aria-hidden="true" /> INSIGHTS
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-semibold tracking-[-0.035em] text-ink sm:text-5xl lg:text-6xl">
            외국인력 채용을 위한<br />
            기준 있는 실무 가이드
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-muted lg:text-lg">
            비자 이름만 나열하지 않습니다. 기업이 실제로 결정해야 하는 직무, 계약, 입국, 정착의 순서와 공식 확인 경로를 정리합니다.
          </p>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-muted">
            제도와 기준은 변동될 수 있습니다. 각 글의 게시일·수정일과 공식 출처를 확인한 뒤, 실제 계약과 신청 전에는 관할 기관의 최신 안내를 검토하세요.
          </p>
        </div>
      </section>

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-16 lg:px-8 lg:py-24">
          <div className="grid gap-6 lg:grid-cols-3">
            {BLOG_POSTS.map((post) => (
              <article key={post.slug} className="flex h-full flex-col rounded-[28px] border border-line bg-surface p-6 shadow-sm shadow-ink/5 transition duration-200 hover:-translate-y-1 hover:shadow-md lg:p-7">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cobalt-soft px-3 py-1.5 text-cobalt">
                    <Tag size={13} weight="bold" aria-hidden="true" /> {post.category}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-muted">
                    <Clock size={14} aria-hidden="true" /> {post.readingMinutes}분
                  </span>
                </div>
                <h2 className="mt-6 font-display text-2xl font-semibold leading-tight text-ink">
                  <Link href={"/blog/" + post.slug} className="transition hover:text-cobalt">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-4 text-[15px] leading-7 text-muted">{post.excerpt}</p>
                <div className="mt-auto pt-7">
                  <p className="text-xs text-gray-500">수정일 {dateFormatter.format(new Date(post.modifiedAt + "T00:00:00+09:00"))}</p>
                  <Link href={"/blog/" + post.slug} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cobalt transition hover:text-cobalt-ink">
                    글 읽기 <ArrowRight size={16} weight="bold" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-paper-soft">
        <div className="max-w-content mx-auto px-5 py-12 lg:px-8">
          <p className="text-sm leading-7 text-muted">
            정우인재개발원은 네팔 인재의 현지 교육부터 한국·일본 기업의 채용과 정착 지원까지 연결합니다.{" "}
            <Link href="/services" className="font-semibold text-cobalt underline underline-offset-4">사업영역 보기</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
