import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogIndex from "@/components/blog/blog-index";
import { getBlogIndexMetadata } from "@/lib/blog-metadata";
import { BLOG_LOCALES, isBlogLocale } from "@/lib/blog-routing";

type LocalizedBlogPageProps = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return BLOG_LOCALES.filter((locale) => locale !== "ko").map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocalizedBlogPageProps): Promise<Metadata> {
  const { locale } = await params;
  return isBlogLocale(locale) && locale !== "ko" ? getBlogIndexMetadata(locale) : {};
}

export default async function LocalizedBlogPage({ params }: LocalizedBlogPageProps) {
  const { locale } = await params;
  if (!isBlogLocale(locale) || locale === "ko") notFound();
  return <BlogIndex locale={locale} />;
}
