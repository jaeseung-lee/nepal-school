"use client";

import { ArrowRight, CaretDown, Globe, List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getNavItems } from "@/lib/nav";
import {
  BLOG_LOCALES,
  getBlogIndexPath,
  getBlogLocaleSwitchPath,
  isBlogLocale,
  isBlogPath,
} from "@/lib/blog-routing";
import {
  changeLocalePathname,
  getLocaleFromPathname,
  getMessages,
  LOCALES,
  localizedHref,
} from "@/lib/i18n";
import { isInternalPath } from "@/lib/internal-routes";

export default function SiteHeader() {
  const pathname = usePathname() || "/";
  const locale = getLocaleFromPathname(pathname);
  const messages = getMessages(locale);
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const navItems = getNavItems(locale);
  const onBlog = isBlogPath(pathname);
  const languageOptions = onBlog ? BLOG_LOCALES : LOCALES;
  const resolveHref = (href: string) => href === "/blog" && isBlogLocale(locale) ? getBlogIndexPath(locale) : localizedHref(locale, href);
  const isActive = (href: string) => {
    const resolved = resolveHref(href);
    return pathname === resolved || (resolved !== "/" && pathname.startsWith(`${resolved}/`));
  };
  const localeHref = (language: (typeof LOCALES)[number]) =>
    onBlog && isBlogLocale(language) ? getBlogLocaleSwitchPath(language) : changeLocalePathname(pathname, language);

  useEffect(() => {
    setMenuOpen(false);
    setLanguageOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen && !languageOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      setMenuOpen(false);
      setLanguageOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [languageOpen, menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  if (isInternalPath(pathname)) return null;

  return (
    <header id="siteHeader" className="sticky top-0 z-50 border-b border-line/80 bg-paper-soft/92 backdrop-blur-xl">
      <div className="max-w-content mx-auto px-5 lg:px-8">
        <div className="flex h-[72px] items-center justify-between gap-3">
          <Link href={localizedHref(locale, "/")} className="flex min-w-0 shrink items-center gap-2.5" aria-label={messages.header.homeAria}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cobalt text-[12px] font-bold text-white shadow-sm" aria-hidden="true">
              JW
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[16px] font-bold text-ink">{messages.site.name}</span>
              <span className="block truncate text-[10px] font-display font-medium text-muted">{messages.site.alternateName}</span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="relative hidden sm:block">
                <button
                  id="languageToggle"
                  type="button"
                  onClick={() => setLanguageOpen((open) => !open)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-white/65 px-3 text-xs font-semibold text-ink transition hover:border-cobalt hover:text-cobalt"
                  aria-label={`${messages.header.languageSelector}: ${messages.header.languages[locale]}`}
                  aria-expanded={languageOpen}
                  aria-controls="languageMenu"
                  aria-haspopup="menu"
                >
                  <Globe size={15} weight="bold" aria-hidden="true" />
                  <span className="font-display">{locale.toUpperCase()}</span>
                  <CaretDown size={12} weight="bold" aria-hidden="true" />
                </button>

                {languageOpen ? (
                  <div id="languageMenu" role="menu" aria-label={messages.header.languageSelector} className="absolute right-0 top-[calc(100%+0.5rem)] z-10 w-40 rounded-2xl border border-line bg-paper-soft p-1.5 shadow-xl shadow-ink/10">
                    {languageOptions.map((language) => (
                      <Link
                        key={language}
                        href={localeHref(language)}
                        data-seo-event="language_changed"
                        data-content-id={language}
                        data-locale={language}
                        onClick={() => setLanguageOpen(false)}
                        role="menuitem"
                        aria-current={language === locale ? "true" : undefined}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${language === locale ? "bg-cobalt text-white" : "text-ink hover:bg-cobalt-soft hover:text-cobalt"}`}
                      >
                        <span>{messages.header.languages[language]}</span>
                        <span className={`text-[10px] font-display ${language === locale ? "text-white/80" : "text-muted"}`}>{language.toUpperCase()}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>

            {isBlogLocale(locale) ? (
              <Link
                href={getBlogIndexPath(locale)}
                aria-current={onBlog ? "page" : undefined}
                className={`hidden rounded-full px-3 py-2 text-sm font-semibold transition lg:inline-flex ${onBlog ? "bg-cobalt-soft text-cobalt" : "text-ink hover:bg-white hover:text-cobalt"}`}
              >
                {messages.nav.blog}
              </Link>
            ) : null}

            <Link href={localizedHref(locale, "/contact")} data-seo-event="cta_clicked" data-content-id="hiring-preparation" data-locale={locale} className="hidden items-center gap-2 rounded-full bg-cobalt px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cobalt-ink active:translate-y-px sm:inline-flex">
              {messages.common.contact} <ArrowRight size={15} weight="bold" aria-hidden="true" />
            </Link>

            <button
              id="navToggle"
              type="button"
              onClick={() => {
                setMenuOpen((open) => !open);
                setLanguageOpen(false);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white/65 px-3 text-ink transition hover:border-cobalt hover:text-cobalt"
              aria-label={menuOpen ? messages.header.closeMenu : messages.header.openMenu}
              aria-expanded={menuOpen}
              aria-controls="siteMenu"
            >
              {menuOpen ? <X size={20} aria-hidden="true" /> : <List size={20} aria-hidden="true" />}
              <span className="hidden text-sm font-semibold lg:inline">{messages.common.menu}</span>
            </button>
          </div>
        </div>
      </div>

      {menuOpen ? (
        <div className="absolute inset-x-0 top-0 z-[60] flex h-[100dvh] justify-end">
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 cursor-default bg-ink/30 backdrop-blur-[2px]"
            aria-label={messages.header.closeMenu}
          />
          <aside id="siteMenu" role="dialog" aria-modal="true" aria-label={messages.header.primaryNav} className="relative flex h-[100dvh] w-full max-w-md flex-col overflow-y-auto bg-paper-soft shadow-2xl shadow-ink/25">
            <div className="flex items-center justify-between border-b border-line px-6 py-5 sm:px-8">
              <p className="text-sm font-semibold text-ink">{messages.common.menu}</p>
              <button type="button" onClick={() => setMenuOpen(false)} className="rounded-full p-2 text-ink transition hover:bg-gray-100" aria-label={messages.header.closeMenu}>
                <X size={24} aria-hidden="true" />
              </button>
            </div>

            <nav className="px-6 py-4 sm:px-8" aria-label={messages.header.primaryNav}>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={resolveHref(item.href)}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between border-b border-line/70 py-4 text-lg transition ${isActive(item.href) ? "font-bold text-cobalt" : "font-medium text-ink hover:text-cobalt"}`}
                  aria-current={isActive(item.href) ? "page" : undefined}
                >
                  {messages.nav[item.key]}
                  <ArrowRight size={17} weight="bold" aria-hidden="true" />
                </Link>
              ))}
            </nav>

            <div className="mt-auto border-t border-line px-6 py-6 sm:px-8">
              <>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{messages.header.languageSelector}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label={messages.header.languageSelector}>
                    {languageOptions.map((language) => (
                      <Link
                        key={language}
                        href={localeHref(language)}
                        data-seo-event="language_changed"
                        data-content-id={language}
                        data-locale={language}
                        onClick={() => setMenuOpen(false)}
                        aria-current={language === locale ? "true" : undefined}
                        className={`rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition ${language === locale ? "border-cobalt bg-cobalt text-white" : "border-line bg-white text-muted hover:border-cobalt hover:text-cobalt"}`}
                      >
                        {messages.header.languages[language]}
                      </Link>
                    ))}
                  </div>
                  {!onBlog ? <p className="mt-3 text-xs leading-5 text-muted">{messages.header.mobileNotice}</p> : null}
                </>

              <Link href={localizedHref(locale, "/contact")} data-seo-event="cta_clicked" data-content-id="hiring-preparation" data-locale={locale} onClick={() => setMenuOpen(false)} className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-cobalt px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cobalt-ink">
                {messages.common.contact} <ArrowRight size={14} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </aside>
        </div>
      ) : null}
    </header>
  );
}
