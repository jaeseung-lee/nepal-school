// 사이트 전역 상수
// SEO 메타데이터·구조화 데이터(JSON-LD)·robots·sitemap·푸터에서 공용으로 참조한다.
// 실제 운영 도메인이 확정되면 SITE_URL 한 곳만 바꾸면 전체에 반영된다.

export const SITE_URL = "https://company-iota-murex.vercel.app";

export const SITE = {
  url: SITE_URL,
  // 사업자등록증 상호(개인사업자). 법인 아님 — "주식회사"·"Co., Ltd." 표기 금지.
  nameKo: "정우인재개발원",
  nameEn: "Joong Woo Human Resource Development Institute",
  shortName: "정우인재개발원",
  alternateName: "JOONG WOO HRD",
  slogan: "네팔·베트남 인재를 현지 교육부터 양성하는 글로벌 인적자원 파트너",
  description:
    "네팔·베트남 인재를 현지 직업훈련부터 양성해 한국·일본 기업에 합법적이고 안정적으로 연결합니다. 교육 → 시험 → 매칭 → 비자 → 정착까지 원스톱.",
  founder: "오제환",
  foundingDate: "2026-06-10",
  bizRegNo: "684-13-02918",
  streetAddress: "경기도 용인시 기흥구 구갈로28번길 21-6, 금보빌딩 6층 6034호",
  locale: "ko_KR",
  areaServed: ["네팔", "베트남", "한국", "일본"],

  // 아래 항목은 확정되면 채운다. 값이 있으면 구조화 데이터·푸터에 자동 포함된다.
  telephone: "", // 예: "+82-31-000-0000"
  email: "", // 예: "contact@joongwoo-hrd.com"
  // 외부 프로필(잡코리아·링크드인 등)이 생기면 추가 — AI 검색 엔티티 신뢰 신호
  sameAs: [] as string[],
} as const;
