import { isBlogLocale } from "@/lib/blog-routing";
import type { Locale } from "@/lib/i18n";

export interface NavItem {
  key: "about" | "services" | "visa" | "blog" | "gallery" | "partners" | "why" | "contact";
  href: string;
  blogOnly?: boolean;
}

/** 주요 메뉴의 경로 단일 출처. 표시는 언어별 메시지 카탈로그에서 읽는다. */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: "about", href: "/about" },
  { key: "services", href: "/services" },
  { key: "visa", href: "/visa" },
  { key: "blog", href: "/blog", blogOnly: true },
  { key: "gallery", href: "/gallery" },
  { key: "partners", href: "/partners" },
  { key: "why", href: "/why" },
  { key: "contact", href: "/contact" },
];

export function getNavItems(locale: Locale): readonly NavItem[] {
  return NAV_ITEMS.filter((item) => !item.blogOnly || isBlogLocale(locale));
}
