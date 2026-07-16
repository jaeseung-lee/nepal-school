import JsonLd from "@/components/json-ld";
import { getBlogPostUrl, type BlogPost } from "@/lib/blog";
import { BLOG_COPY } from "@/lib/blog-copy";
import { getBlogIndexPath } from "@/lib/blog-routing";
import { SITE_URL } from "@/lib/site";

const LANGUAGE_TAGS = { ko: "ko-KR", en: "en", ja: "ja-JP", ne: "ne-NP", vi: "vi-VN", lo: "lo-LA" } as const;

export default function BlogPostSchema({ post }: { post: BlogPost }) {
  const postUrl = getBlogPostUrl(post.language, post.slug);
  const imageUrl = SITE_URL + post.heroImage.src;
  const copy = BLOG_COPY[post.language];

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "BlogPosting",
            "@id": postUrl + "#article",
            mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
            headline: post.title,
            description: post.summary,
            image: [imageUrl],
            datePublished: post.publishedAt,
            dateModified: post.modifiedAt,
            author: { "@type": "Organization", name: post.author.name, url: SITE_URL },
            reviewedBy: post.reviewer ? { "@type": "Person", name: post.reviewer.name, jobTitle: post.reviewer.credentials } : undefined,
            publisher: { "@id": SITE_URL + "/#organization" },
            inLanguage: LANGUAGE_TAGS[post.language],
            articleSection: post.category,
            keywords: post.keywords.join(", "),
            citation: post.sources.map((source) => source.url),
            sdPublisher: { "@id": SITE_URL + "/#organization" },
            sdDatePublished: post.sourceVerification.checkedAt,
            usageInfo: "Official primary sources cross-checked; general information only, not legal advice.",
            isAccessibleForFree: true,
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: copy.home, item: SITE_URL + (post.language === "ko" ? "" : `/${post.language}`) },
              { "@type": "ListItem", position: 2, name: copy.indexName, item: SITE_URL + getBlogIndexPath(post.language) },
              { "@type": "ListItem", position: 3, name: post.title, item: postUrl },
            ],
          },
        ],
      }}
    />
  );
}
