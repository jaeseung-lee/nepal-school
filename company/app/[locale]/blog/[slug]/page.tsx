import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogArticle from "@/components/blog/blog-article";
import { getBlogPost } from "@/lib/blog";
import { getBlogPostMetadata } from "@/lib/blog-metadata";
import { isBlogLocale } from "@/lib/blog-routing";

type LocalizedBlogPostProps = { params: Promise<{ locale: string; slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocalizedBlogPostProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isBlogLocale(locale) || locale === "ko") return {};
  const post = getBlogPost(locale, slug);
  return post ? getBlogPostMetadata(post) : {};
}

export default async function LocalizedBlogPost({ params }: LocalizedBlogPostProps) {
  const { locale, slug } = await params;
  if (!isBlogLocale(locale) || locale === "ko") notFound();
  const post = getBlogPost(locale, slug);
  if (!post) notFound();
  return <BlogArticle post={post} locale={locale} />;
}
