import { isBlogLocale } from "@/lib/blog-routing";
import type { Locale } from "@/lib/i18n";

export interface NavItem {
  key: "about" | "services" | "visa" | "blog" | "gallery" | "partners" | "why" | "contact";
  href: string;
  blogOnly?: boolean;
  /** 데스크톱 헤더에 바로 노출하는 주요 메뉴. 나머지는 메뉴 패널과 푸터에서만 보인다. */
  primary?: boolean;
}

/** 주요 메뉴의 경로 단일 출처. 표시는 언어별 메시지 카탈로그에서 읽는다. */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: "about", href: "/about", primary: true },
  { key: "services", href: "/services", primary: true },
  { key: "visa", href: "/visa", primary: true },
  { key: "blog", href: "/blog", blogOnly: true, primary: true },
  { key: "gallery", href: "/gallery" },
  { key: "partners", href: "/partners" },
  { key: "why", href: "/why" },
  { key: "contact", href: "/contact" },
];

export function getNavItems(locale: Locale): readonly NavItem[] {
  return NAV_ITEMS.filter((item) => !item.blogOnly || isBlogLocale(locale));
}

export function getPrimaryNavItems(locale: Locale): readonly NavItem[] {
  return getNavItems(locale).filter((item) => item.primary);
}
