import type { Metadata } from "next";
import { GalleryContent } from "@/components/page-content/gallery-content";
import { getMessages } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/seo";

const copy = getMessages("ko").pages.gallery.metadata;

export const metadata: Metadata = buildPageMetadata({
  title: copy.title,
  description: copy.description,
  path: "/gallery",
});

export default function GalleryPage() {
  return <GalleryContent />;
}
