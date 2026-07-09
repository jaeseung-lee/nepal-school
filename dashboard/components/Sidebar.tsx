"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SearchEntry } from "@/lib/content";

interface SidebarProps {
  index: SearchEntry[];
}

interface SearchResult extends SearchEntry {
  snip: string | null;
}

function snippet(text: string, query: string): string | null {
  if (!query) return null;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - 24);
  const end = Math.min(text.length, idx + query.length + 36);
  return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
}

export default function Sidebar({ index }: SidebarProps) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return index.map((d) => ({ ...d, snip: null }));
    return index
      .filter((d) => d.title.toLowerCase().includes(q) || d.text.toLowerCase().includes(q))
      .map((d) => ({ ...d, snip: snippet(d.text, q) }));
  }, [query, index]);

  return (
    <aside className="sidebar">
      <Link href="/" className="brand" style={{ display: "block", color: "inherit" }}>
        <div className="flag">🇳🇵 → 🇯🇵</div>
        <h1>네팔→일본 특정기능 사업 위키</h1>
        <p>개호·숙박 실현가능성 대시보드</p>
      </Link>

      <input
        className="search-box"
        type="text"
        placeholder="문서·본문 검색…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="nav-section-label">대시보드</div>
      <Link href="/" className={"nav-item" + (pathname === "/" ? " active" : "")}>
        <span className="nav-icon">🏠</span>
        <span><span className="nav-title">홈 · 핵심 지표</span></span>
      </Link>

      <div className="nav-section-label" style={{ marginTop: 16 }}>
        문서 {query && `· ${results.length}건`}
      </div>

      {results.length === 0 && <div className="no-results">검색 결과가 없습니다.</div>}

      {results.map((d) => {
        const href = `/docs/${d.slug}`;
        const active = pathname === href;
        return (
          <Link key={d.slug} href={href} className={"nav-item" + (active ? " active" : "")}>
            <span className="nav-icon">{d.icon}</span>
            <span>
              <span className="nav-title">
                <span className="nav-num">{d.num}</span>
                {d.title}
              </span>
              {d.snip && <span className="nav-snippet">{d.snip}</span>}
            </span>
          </Link>
        );
      })}

      <div className="sidebar-foot">
        1차 출처 기반 · 최종 업데이트 2026-06-17
        <br />
        수치는 분기별 재확인 권장
      </div>
    </aside>
  );
}
