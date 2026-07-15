import JsonLd from "@/components/json-ld";
import { BLOG_AUTHOR, type BlogPost, getBlogPostUrl } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

export default function BlogPostSchema({ post }: { post: BlogPost }) {
  const postUrl = getBlogPostUrl(post.slug);
  const imageUrl = SITE_URL + post.image;

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
            description: post.description,
            image: [imageUrl],
            datePublished: post.publishedAt,
            dateModified: post.modifiedAt,
            author: BLOG_AUTHOR,
            publisher: { "@id": SITE_URL + "/#organization" },
            inLanguage: "ko-KR",
            articleSection: post.category,
            keywords: post.keywords.join(", "),
            isAccessibleForFree: true,
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "인사이트", item: SITE_URL + "/blog" },
              { "@type": "ListItem", position: 3, name: post.title, item: postUrl },
            ],
          },
        ],
      }}
    />
  );
}
