import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogArticle from "@/components/blog/blog-article";
import { getBlogPost } from "@/lib/blog";
import { getBlogPostMetadata } from "@/lib/blog-metadata";

type BlogPostPageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost("ko", slug);
  return post ? getBlogPostMetadata(post) : {};
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPost("ko", slug);
  if (!post) notFound();
  return <BlogArticle post={post} locale="ko" />;
}
