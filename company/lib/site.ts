export const SITE_URL = "https://www.joongwoohrd.com";

export const SITE = {
  url: SITE_URL,
  legalName: {
    ko: "정우인재개발원",
    en: "Jeongwoo Human Resource Development Institute",
  },
  brandName: {
    ko: "정우인재개발원",
    en: "Jeongwoo Human Resource Development Institute",
  },
  shortName: "정우인재개발원",
  slogan: "네팔 인재를 현지 직업교육으로 양성하는 글로벌 인적자원 파트너",
  seoTitle: "네팔 인재 양성·한국·일본 취업 연계",
  description:
    "네팔에서 인재를 직접 교육·공급하고, 베트남·미얀마·라오스·스리랑카에서는 현지 파트너를 통해 인재를 공급합니다. 한국과 일본은 채용·취업 연계 시장입니다.",
  founder: "오제환",
  foundingDate: "2026-06-10",
  bizRegNo: "684-13-02918",
  streetAddress: "경기도 용인시 기흥구 구갈로28번길 21-6, 금보빌딩 6층 6034호",
  locale: "ko_KR",
  trainingCountries: [{ code: "NP", nameKo: "네팔", nameEn: "Nepal" }],
  sourcingCountries: [
    { code: "NP", nameKo: "네팔", nameEn: "Nepal", model: "direct" },
    { code: "VN", nameKo: "베트남", nameEn: "Vietnam", model: "partner" },
    { code: "MM", nameKo: "미얀마", nameEn: "Myanmar", model: "partner" },
    { code: "LA", nameKo: "라오스", nameEn: "Laos", model: "partner" },
    { code: "LK", nameKo: "스리랑카", nameEn: "Sri Lanka", model: "partner" },
  ],
  destinationMarkets: [
    { code: "KR", nameKo: "한국", nameEn: "South Korea" },
    { code: "JP", nameKo: "일본", nameEn: "Japan" },
  ],
  phones: [
    {
      market: "korea",
      countryCode: "KR",
      national: "010-6363-6086",
      international: "+82 10-6363-6086",
      href: "tel:+821063636086",
    },
    {
      market: "japan",
      countryCode: "JP",
      national: "080-2933-8838",
      international: "+81 80-2933-8838",
      href: "tel:+818029338838",
    },
  ],
  email: "joongwoohrd@gmail.com",
  sameAs: [] as string[],
} as const;

// Compatibility aliases for existing presentational code. Public company-name
// fields intentionally share one Korean and English brand identity.
export const SITE_NAME_KO = SITE.brandName.ko;
export const SITE_NAME_EN = SITE.brandName.en;
