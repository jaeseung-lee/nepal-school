import BlogIndex from "@/components/blog/blog-index";
import { getBlogIndexMetadata } from "@/lib/blog-metadata";

export const metadata = getBlogIndexMetadata("ko");

export default function BlogIndexPage() {
  return <BlogIndex locale="ko" />;
}
