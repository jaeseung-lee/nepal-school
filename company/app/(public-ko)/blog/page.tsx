import BlogIndex from "@/components/blog/blog-index";
import { getBlogIndexMetadata } from "@/lib/blog-metadata";

export function generateMetadata() { return getBlogIndexMetadata("ko"); }

export default function BlogIndexPage() {
  return <BlogIndex locale="ko" />;
}
