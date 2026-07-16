import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogArticle from "@/components/blog/blog-article";
import { getBlogPost, getBlogPosts } from "@/lib/blog";
import { getBlogPostMetadata } from "@/lib/blog-metadata";
import { BLOG_LOCALES, isBlogLocale } from "@/lib/blog-routing";

type LocalizedBlogPostProps = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return BLOG_LOCALES.filter((locale) => locale !== "ko").flatMap((locale) =>
    getBlogPosts(locale).map((post) => ({ locale, slug: post.slug })),
  );
}

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
