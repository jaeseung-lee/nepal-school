import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DOCS, getDocBySlug } from "@/lib/content";
import MermaidRenderer from "@/components/MermaidRenderer";

interface DocPageProps {
  params: { slug: string };
}

export function generateStaticParams(): { slug: string }[] {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export function generateMetadata({ params }: DocPageProps): Metadata {
  const doc = DOCS.find((d) => d.slug === params.slug);
  return { title: doc ? `${doc.title} · 네팔→일본 위키` : "문서" };
}

export default function DocPage({ params }: DocPageProps) {
  const doc = getDocBySlug(params.slug);
  if (!doc) notFound();

  const idx = DOCS.findIndex((d) => d.slug === params.slug);
  const prev = idx > 0 ? DOCS[idx - 1] : null;
  const next = idx < DOCS.length - 1 ? DOCS[idx + 1] : null;

  return (
    <div>
      <div className="doc-toolbar">
        <Link href="/" className="back-link">← 홈 · 핵심 지표</Link>
        <span className="back-link">{doc.num} / 05</span>
      </div>

      <article className="prose" dangerouslySetInnerHTML={{ __html: doc.html }} />
      <MermaidRenderer contentKey={doc.slug} />

      <div className="doc-pager">
        {prev ? (
          <Link href={`/docs/${prev.slug}`} className="pager-link">
            <div className="pl-dir">← 이전</div>
            <div className="pl-title">{prev.icon} {prev.title}</div>
          </Link>
        ) : <span style={{ flex: 1 }} />}
        {next ? (
          <Link href={`/docs/${next.slug}`} className="pager-link next">
            <div className="pl-dir">다음 →</div>
            <div className="pl-title">{next.icon} {next.title}</div>
          </Link>
        ) : <span style={{ flex: 1 }} />}
      </div>
    </div>
  );
}
