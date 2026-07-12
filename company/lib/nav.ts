export interface NavItem {
  label: string;
  href: string;
}

/** 주요 메뉴 - 헤더(데스크톱·모바일)와 푸터가 공유하는 단일 출처 */
export const NAV_ITEMS: NavItem[] = [
  { label: "회사소개", href: "/about" },
  { label: "사업영역", href: "/services" },
  { label: "비자 정보", href: "/visa" },
  { label: "파트너십", href: "/partners" },
  { label: "신뢰·전문성", href: "/why" },
  { label: "문의", href: "/contact" },
];

/** 언어 스위처 - 현재 KO만 활성, 나머지는 준비 중(비활성) */
export const LANGUAGES: { code: string; active: boolean }[] = [
  { code: "KO", active: true },
  { code: "EN", active: false },
  { code: "JA", active: false },
  { code: "NE", active: false },
];
