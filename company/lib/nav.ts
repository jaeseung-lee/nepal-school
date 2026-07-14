export interface NavItem {
  key: "about" | "services" | "visa" | "partners" | "why" | "contact";
  href: string;
}

/** 주요 메뉴의 경로 단일 출처. 표시는 언어별 메시지 카탈로그에서 읽는다. */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: "about", href: "/about" },
  { key: "services", href: "/services" },
  { key: "visa", href: "/visa" },
  { key: "partners", href: "/partners" },
  { key: "why", href: "/why" },
  { key: "contact", href: "/contact" },
];
