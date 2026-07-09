"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LANGUAGES, NAV_ITEMS } from "@/lib/nav";

export default function SiteHeader() {
  const pathname = usePathname();
  const [solid, setSolid] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // 스크롤 40px 이후 헤더 솔리드(흰 배경) 전환
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => pathname === href;

  return (
    <header id="siteHeader" className={`fixed top-0 inset-x-0 z-50 ${solid ? "is-solid" : ""}`}>
      <div className="max-w-content mx-auto px-5 lg:px-8">
        <div className="flex items-center justify-between h-[76px] gap-4">
          {/* 로고 자리 (실제 로고 이미지로 교체 예정) */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="정우인재개발원 홈">
            <span className="w-9 h-9 rounded-md bg-gold-deep flex items-center justify-center text-white text-[12px] font-bold font-display tracking-tight" aria-hidden="true">JW</span>
            <span className="leading-tight">
              <span className="logo-main block text-[16px] font-bold">정우인재개발원</span>
              <span className="logo-sub block text-[10px] font-display font-medium tracking-[0.18em]">JOONG WOO HRD</span>
            </span>
          </Link>
          <nav className="hidden lg:flex items-center gap-9 text-[15px] font-medium" aria-label="주요 메뉴">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link transition ${isActive(item.href) ? "nav-active" : ""}`}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {/* 언어 스위처 (디자인만, 현재 비활성) */}
            <div className="lang-group hidden md:flex items-center rounded-full border overflow-hidden" role="group" aria-label="언어 선택 (준비 중)">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  disabled={!lang.active}
                  aria-current={lang.active ? "true" : undefined}
                  aria-disabled={!lang.active || undefined}
                  title={lang.active ? undefined : "준비 중"}
                  className={`lang-btn px-2.5 py-1 text-xs font-display ${lang.active ? "font-semibold" : "font-medium opacity-60 cursor-not-allowed"}`}
                >
                  {lang.code}
                </button>
              ))}
            </div>
            <Link href="/contact" className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-gold-deep hover:bg-gold-light transition text-white text-sm font-semibold px-5 py-2.5 shadow-sm">
              제휴 문의 <span aria-hidden="true">→</span>
            </Link>
            <button
              id="navToggle"
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="lg:hidden p-2 -mr-1 menu-icon text-white"
              aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={mobileOpen}
              aria-controls="mobileNav"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
      <nav id="mobileNav" className={`lg:hidden ${mobileOpen ? "" : "hidden"} bg-white border-t border-gray-200`} aria-label="모바일 메뉴">
        <div className="max-w-content mx-auto px-5 py-3 flex flex-col">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`py-3 border-b border-gray-100 text-[15px] ${isActive(item.href) ? "font-bold text-primary-main" : "font-medium text-gray-800"}`}
            >
              {item.label}
            </Link>
          ))}
          <div className="flex items-center justify-between pt-4 pb-1">
            <span className="text-xs text-gray-400">언어 (준비 중): KO · EN · JA · VI · NE</span>
            <Link href="/contact" onClick={() => setMobileOpen(false)} className="inline-flex rounded-full bg-gold-deep text-white text-sm font-semibold px-4 py-2">
              제휴 문의
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
