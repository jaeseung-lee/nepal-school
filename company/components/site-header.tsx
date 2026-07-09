"use client";

import { ArrowRight, List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LANGUAGES, NAV_ITEMS } from "@/lib/nav";

export default function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (href: string) => pathname === href;

  return (
    <header id="siteHeader" className="sticky top-0 z-50 border-b border-line/80 bg-paper-soft/92 backdrop-blur-xl">
      <div className="max-w-content mx-auto px-5 lg:px-8">
        <div className="flex h-[72px] items-center justify-between gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="정우인재개발원 홈">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cobalt text-[12px] font-bold text-white shadow-sm" aria-hidden="true">
              JW
            </span>
            <span className="leading-tight">
              <span className="block text-[16px] font-bold text-ink">정우인재개발원</span>
              <span className="block text-[10px] font-display font-medium text-muted">Joong Woo HRD</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-9 text-[15px] font-medium lg:flex" aria-label="주요 메뉴">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link text-ink transition hover:text-cobalt ${isActive(item.href) ? "nav-active" : ""}`}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center overflow-hidden rounded-full border border-line bg-white/65 md:flex" role="group" aria-label="언어 선택">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  disabled={!lang.active}
                  aria-current={lang.active ? "true" : undefined}
                  aria-disabled={!lang.active || undefined}
                  title={lang.active ? undefined : "준비 중"}
                  className={`px-2.5 py-1 text-xs font-display ${lang.active ? "bg-cobalt font-semibold text-white" : "cursor-not-allowed font-medium text-muted/65"}`}
                >
                  {lang.code}
                </button>
              ))}
            </div>

            <Link href="/contact" className="hidden items-center gap-2 rounded-full bg-cobalt px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cobalt-ink active:translate-y-px sm:inline-flex">
              문의하기 <ArrowRight size={15} weight="bold" aria-hidden="true" />
            </Link>

            <button
              id="navToggle"
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="rounded-full p-2 text-ink transition hover:bg-gray-100 lg:hidden"
              aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={mobileOpen}
              aria-controls="mobileNav"
            >
              {mobileOpen ? <X size={24} aria-hidden="true" /> : <List size={24} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      <nav id="mobileNav" className={`border-t border-line bg-paper-soft lg:hidden ${mobileOpen ? "" : "hidden"}`} aria-label="모바일 메뉴">
        <div className="max-w-content mx-auto flex flex-col px-5 py-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`border-b border-line/70 py-3 text-[15px] ${isActive(item.href) ? "font-bold text-cobalt" : "font-medium text-ink"}`}
            >
              {item.label}
            </Link>
          ))}
          <div className="flex items-center justify-between pb-1 pt-4">
            <span className="text-xs text-muted">KO 운영, 다국어는 준비 중</span>
            <Link href="/contact" onClick={() => setMobileOpen(false)} className="inline-flex items-center gap-1 rounded-full bg-cobalt px-4 py-2 text-sm font-semibold text-white">
              문의하기 <ArrowRight size={14} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
