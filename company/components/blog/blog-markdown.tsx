import type { ComponentPropsWithoutRef } from "react";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ImageManifestEntry } from "@/lib/blog";

type BlogMarkdownProps = {
  content: string;
  images: ImageManifestEntry[];
};

export default function BlogMarkdown({ content, images }: BlogMarkdownProps) {
  const imagePaths = new Set(images.map((image) => image.path));

  return (
    <div className="blog-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
          h3: ({ children, ...props }) => <h3 {...props}>{children}</h3>,
          p: ({ node, children, ...props }) => {
            const onlyChild = node?.children.length === 1 ? node.children[0] : undefined;
            if (onlyChild?.type === "element" && onlyChild.tagName === "img") return <>{children}</>;
            return <p {...props}>{children}</p>;
          },
          a: ({ href = "", children, ...props }) => {
            const external = href.startsWith("http");
            return external ? (
              <a href={href} target="_blank" rel="noreferrer" {...props}>{children}</a>
            ) : (
              <Link href={href} {...props}>{children}</Link>
            );
          },
          img: ({ src, alt = "", title }) => {
            if (typeof src !== "string" || !imagePaths.has(src)) return null;
            return (
              <figure>
                <div className="relative aspect-[8/5] overflow-hidden rounded-[24px] bg-paper-soft">
                  <Image src={src} alt={alt} fill sizes="(max-width: 900px) 100vw, 800px" className="object-cover" />
                </div>
                {title ? <figcaption>{title}</figcaption> : null}
              </figure>
            );
          },
          table: ({ children, ...props }) => (
            <div className="table-scroll" role="region" aria-label="Data table" tabIndex={0}>
              <table {...props}>{children}</table>
            </div>
          ),
          code: ({ className, children, ...props }: ComponentPropsWithoutRef<"code">) => (
            <code className={className} {...props}>{children}</code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
