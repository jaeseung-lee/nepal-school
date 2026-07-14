"use client";

import { ArrowRight, List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_ITEMS } from "@/lib/nav";
import {
  changeLocalePathname,
  getLocaleFromPathname,
  getMessages,
  LOCALES,
  localizedHref,
} from "@/lib/i18n";

export default function SiteHeader() {
  const pathname = usePathname() || "/";
  const locale = getLocaleFromPathname(pathname);
  const messages = getMessages(locale);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (href: string) => pathname === localizedHref(locale, href);

  return (
    <header id="siteHeader" className="sticky top-0 z-50 border-b border-line/80 bg-paper-soft/92 backdrop-blur-xl">
      <div className="max-w-content mx-auto px-5 lg:px-8">
        <div className="flex h-[72px] items-center justify-between gap-4">
          <Link href={localizedHref(locale, "/")} className="flex shrink-0 items-center gap-2.5" aria-label={messages.header.homeAria}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cobalt text-[12px] font-bold text-white shadow-sm" aria-hidden="true">
              JW
            </span>
            <span className="leading-tight">
              <span className="block text-[16px] font-bold text-ink">{messages.site.name}</span>
              <span className="block text-[10px] font-display font-medium text-muted">{messages.site.alternateName}</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-9 text-[15px] font-medium lg:flex" aria-label={messages.header.primaryNav}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={localizedHref(locale, item.href)}
                className={`nav-link text-ink transition hover:text-cobalt ${isActive(item.href) ? "nav-active" : ""}`}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {messages.nav[item.key]}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center overflow-hidden rounded-full border border-line bg-white/65 md:flex" role="group" aria-label={messages.header.languageSelector}>
              {LOCALES.map((language) => (
                <Link
                  key={language}
                  href={changeLocalePathname(pathname, language)}
                  aria-current={language === locale ? "true" : undefined}
                  title={messages.header.languages[language]}
                  className={`px-2.5 py-1 text-xs font-display ${language === locale ? "bg-cobalt font-semibold text-white" : "font-medium text-muted transition hover:bg-cobalt-soft hover:text-cobalt"}`}
                >
                  {language.toUpperCase()}
                </Link>
              ))}
            </div>

            <Link href={localizedHref(locale, "/contact")} className="hidden items-center gap-2 rounded-full bg-cobalt px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cobalt-ink active:translate-y-px sm:inline-flex">
              {messages.common.contact} <ArrowRight size={15} weight="bold" aria-hidden="true" />
            </Link>

            <button
              id="navToggle"
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="rounded-full p-2 text-ink transition hover:bg-gray-100 lg:hidden"
              aria-label={mobileOpen ? messages.header.closeMenu : messages.header.openMenu}
              aria-expanded={mobileOpen}
              aria-controls="mobileNav"
            >
              {mobileOpen ? <X size={24} aria-hidden="true" /> : <List size={24} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      <nav id="mobileNav" className={`border-t border-line bg-paper-soft lg:hidden ${mobileOpen ? "" : "hidden"}`} aria-label={messages.header.mobileNav}>
        <div className="max-w-content mx-auto flex flex-col px-5 py-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={localizedHref(locale, item.href)}
              onClick={() => setMobileOpen(false)}
              className={`border-b border-line/70 py-3 text-[15px] ${isActive(item.href) ? "font-bold text-cobalt" : "font-medium text-ink"}`}
            >
              {messages.nav[item.key]}
            </Link>
          ))}
          <div className="flex flex-col gap-3 pb-1 pt-4">
            <span className="text-xs text-muted">{messages.header.mobileNotice}</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label={messages.header.languageSelector}>
              {LOCALES.map((language) => (
                <Link
                  key={language}
                  href={changeLocalePathname(pathname, language)}
                  onClick={() => setMobileOpen(false)}
                  aria-current={language === locale ? "true" : undefined}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${language === locale ? "border-cobalt bg-cobalt text-white" : "border-line bg-white text-muted"}`}
                >
                  {messages.header.languages[language]}
                </Link>
              ))}
            </div>
            <Link href={localizedHref(locale, "/contact")} onClick={() => setMobileOpen(false)} className="inline-flex w-fit items-center gap-1 rounded-full bg-cobalt px-4 py-2 text-sm font-semibold text-white">
              {messages.common.contact} <ArrowRight size={14} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
