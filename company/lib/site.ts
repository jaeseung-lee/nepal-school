export const SITE_URL = "https://www.joongwoohrd.com";

export const SITE = {
  url: SITE_URL,
  legalName: {
    ko: "주식회사 정우인력개발",
    en: "Jungwoo Human Development Co., Ltd.",
  },
  brandName: {
    ko: "정우인재개발원",
    en: "JOONG WOO HRD",
  },
  shortName: "정우인재개발원",
  slogan: "네팔 인재를 현지 교육부터 양성하는 글로벌 인적자원 파트너",
  seoTitle: "네팔 인재 양성·한국·일본 취업 연계",
  description:
    "네팔 인재를 현지 직업훈련부터 양성해 한국과 일본 기업에 합법적이고 안정적으로 연결합니다. 베트남과 라오스 인재는 현지 파트너와 협력해 공급합니다.",
  founder: "오제환",
  foundingDate: "2026-06-10",
  bizRegNo: "684-13-02918",
  streetAddress: "경기도 용인시 기흥구 구갈로28번길 21-6, 금보빌딩 6층 6034호",
  locale: "ko_KR",
  trainingCountries: [{ code: "NP", nameKo: "네팔", nameEn: "Nepal" }],
  sourcingCountries: [
    { code: "NP", nameKo: "네팔", nameEn: "Nepal", model: "direct" },
    { code: "VN", nameKo: "베트남", nameEn: "Vietnam", model: "partner" },
    { code: "LA", nameKo: "라오스", nameEn: "Laos", model: "partner" },
  ],
  destinationMarkets: [
    { code: "KR", nameKo: "한국", nameEn: "South Korea" },
    { code: "JP", nameKo: "일본", nameEn: "Japan" },
  ],
  telephone: "",
  email: "joongwoohrd@gmail.com",
  sameAs: [] as string[],
} as const;

// Compatibility aliases for existing presentational code. New SEO/entity code
// must use legalName, brandName and the explicit country-role collections above.
export const SITE_NAME_KO = SITE.brandName.ko;
export const SITE_NAME_EN = SITE.brandName.en;
