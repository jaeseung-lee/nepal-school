"use client";

import { ArrowUpRight } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FocusEvent } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { getNavItems, getPrimaryNavItems } from "@/lib/nav";
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

const BUSINESS_AREA_LANGUAGES = ["ko", "ja"] as const;
const BUSINESS_AREA_PATH = /^\/(?:ja\/)?services\/(?:japan-caregiver|japan-hospitality|korea-study|korea-welding)\/?$/;
/** 이만큼 내려가면 투명 헤더를 다크 글래스로 바꾼다. */
const SCROLL_THRESHOLD = 24;

export default function SiteHeader() {
  const pathname = usePathname() || "/";
  const locale = getLocaleFromPathname(pathname);
  const messages = getMessages(locale);
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const languageButtonRef = useRef<HTMLButtonElement>(null);
  const navItems = getNavItems(locale);
  const primaryNavItems = getPrimaryNavItems(locale);
  const onBlog = isBlogPath(pathname);
  const onBilingualBusinessArea = BUSINESS_AREA_PATH.test(pathname);
  const languageOptions = onBlog
    ? BLOG_LOCALES
    : onBilingualBusinessArea
      ? BUSINESS_AREA_LANGUAGES
      : LOCALES;
  const resolveHref = (href: string) => href === "/blog" && isBlogLocale(locale) ? getBlogIndexPath(locale) : localizedHref(locale, href);
  const isActive = (href: string) => {
    const resolved = resolveHref(href);
    return pathname === resolved || (resolved !== "/" && pathname.startsWith(`${resolved}/`));
  };
  const localeHref = (language: (typeof LOCALES)[number]) =>
    onBlog && isBlogLocale(language) ? getBlogLocaleSwitchPath(language) : changeLocalePathname(pathname, language);
  const closeAll = () => {
    setMenuOpen(false);
    setLanguageOpen(false);
  };

  useEffect(() => {
    setMenuOpen(false);
    setLanguageOpen(false);
  }, [pathname]);

  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);

    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);

  useEffect(() => {
    if (!menuOpen && !languageOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      // 닫은 뒤에는 열었던 버튼으로 포커스를 돌려준다.
      if (menuOpen) menuButtonRef.current?.focus();
      else languageButtonRef.current?.focus();
      setMenuOpen(false);
      setLanguageOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (headerRef.current?.contains(event.target as Node)) return;

      setMenuOpen(false);
      setLanguageOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
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

  // 키보드 포커스가 헤더 밖으로 나가면 펼친 패널을 닫는다. (빈 곳 클릭처럼 대상이 없을 때는 유지)
  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && !event.currentTarget.contains(next)) closeAll();
  };

  return (
    <header
      id="siteHeader"
      ref={headerRef}
      className="site-header surface-dark"
      data-scrolled={scrolled ? "" : undefined}
      data-menu-open={menuOpen ? "" : undefined}
      onBlur={handleBlur}
    >
      <div className="page-wrap grid h-header grid-cols-[minmax(0,1fr)_auto] items-center gap-3 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:gap-8">
        <nav
          aria-label={messages.header.primaryNav}
          className={`${locale === "vi" ? "hidden min-[90rem]:flex" : "hidden xl:flex"} items-center gap-[clamp(1rem,2vw,2.5rem)]`}
        >
          {primaryNavItems.map((item) => (
            <Link
              key={item.href}
              href={resolveHref(item.href)}
              aria-current={isActive(item.href) ? "page" : undefined}
              className="inline-flex min-h-11 items-center whitespace-nowrap text-sm font-semibold underline-offset-[6px] hover:underline aria-[current=page]:underline"
            >
              {messages.nav[item.key]}
            </Link>
          ))}
        </nav>

        <Link
          href={localizedHref(locale, "/")}
          className="flex min-w-0 items-center xl:col-start-2 xl:justify-self-center"
          aria-label={messages.header.homeAria}
        >
          <BrandLogo kind="lockup" tone="white" className="h-8 w-auto lg:h-10" priority />
        </Link>

        <div className="flex items-center gap-2 justify-self-end sm:gap-3 xl:col-start-3">
          <div className="relative">
            <button
              id="languageToggle"
              ref={languageButtonRef}
              type="button"
              onClick={() => {
                setLanguageOpen((open) => !open);
                setMenuOpen(false);
              }}
              className="round-btn text-[11px] font-bold tracking-[0.06em]"
              aria-label={`${messages.header.languageSelector}: ${messages.header.languages[locale]}`}
              aria-expanded={languageOpen}
              aria-controls="languageMenu"
            >
              {locale.toUpperCase()}
            </button>

            <ul
              id="languageMenu"
              hidden={!languageOpen}
              aria-label={messages.header.languageSelector}
              className="absolute right-0 top-[calc(100%+0.75rem)] z-10 w-52 border border-white/15 bg-night-soft py-2"
            >
              {languageOptions.map((language) => (
                <li key={language}>
                  <Link
                    href={localeHref(language)}
                    lang={language}
                    hrefLang={language}
                    data-seo-event="language_changed"
                    data-content-id={language}
                    data-locale={language}
                    onClick={() => setLanguageOpen(false)}
                    aria-current={language === locale ? "true" : undefined}
                    className="flex min-h-11 items-center justify-between gap-4 px-4 text-sm text-white/80 transition hover:bg-white/10 hover:text-white aria-[current=true]:font-semibold aria-[current=true]:text-white"
                  >
                    <span>{messages.header.languages[language]}</span>
                    <span className="text-[11px] tracking-[0.08em] text-white/50" aria-hidden="true">{language.toUpperCase()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href={localizedHref(locale, "/contact")}
            data-seo-event="cta_clicked"
            data-content-id="hiring-preparation"
            data-locale={locale}
            className="pill pill-light hidden sm:inline-flex"
          >
            {messages.nav.contact} <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
          </Link>

          <button
            id="navToggle"
            ref={menuButtonRef}
            type="button"
            onClick={() => {
              setMenuOpen((open) => !open);
              setLanguageOpen(false);
            }}
            className="round-btn"
            aria-label={menuOpen ? messages.header.closeMenu : messages.header.openMenu}
            aria-expanded={menuOpen}
            aria-controls="siteMenu"
          >
            <span aria-hidden="true" className="relative block h-3 w-4">
              <span className={`absolute left-0 top-[3px] h-px w-4 bg-current transition-transform duration-200 ${menuOpen ? "translate-y-[2.5px] rotate-45" : ""}`} />
              <span className={`absolute bottom-[3px] left-0 h-px w-4 bg-current transition-transform duration-200 ${menuOpen ? "-translate-y-[2.5px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </div>

      <div
        id="siteMenu"
        hidden={!menuOpen}
        className="absolute inset-x-0 top-full max-h-[calc(100svh_-_var(--spacing-header))] overflow-y-auto overscroll-contain border-t border-white/15 bg-night-soft"
      >
        <div className="page-wrap grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16 lg:py-12">
          <nav aria-label={messages.common.menu}>
            <ul className="grid lg:grid-cols-2 lg:gap-x-12">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={resolveHref(item.href)}
                    onClick={() => setMenuOpen(false)}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className="flex min-h-14 items-center justify-between gap-4 border-b border-white/15 py-4 text-lg font-medium text-white/85 transition hover:text-white aria-[current=page]:font-bold aria-[current=page]:text-white"
                  >
                    {messages.nav[item.key]}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="text-meta text-night-muted">{messages.header.languageSelector}</p>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={messages.header.languageSelector}>
              {languageOptions.map((language) => (
                <Link
                  key={language}
                  href={localeHref(language)}
                  lang={language}
                  hrefLang={language}
                  data-seo-event="language_changed"
                  data-content-id={language}
                  data-locale={language}
                  onClick={() => setMenuOpen(false)}
                  aria-current={language === locale ? "true" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition ${language === locale ? "border-white bg-white text-ink" : "border-white/25 text-white/80 hover:border-white/60 hover:text-white"}`}
                >
                  {messages.header.languages[language]}
                </Link>
              ))}
            </div>
            {!onBlog && !onBilingualBusinessArea ? (
              <p className="mt-4 text-xs leading-5 text-night-muted">{messages.header.mobileNotice}</p>
            ) : null}

            <Link
              href={localizedHref(locale, "/contact")}
              data-seo-event="cta_clicked"
              data-content-id="hiring-preparation"
              data-locale={locale}
              onClick={() => setMenuOpen(false)}
              className="pill pill-light mt-8"
            >
              {messages.common.contact} <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
