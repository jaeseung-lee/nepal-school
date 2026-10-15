/**
 * 섹션 위에 다는 짧은 영문 라벨(레퍼런스 OFFMORA의 eyebrow 스타일).
 * 제목·본문은 각 언어 카탈로그를 쓰고, 이 라벨만 모든 언어에서 같은 영문으로 보인다.
 * 화면에서는 항상 lang="en"으로 렌더한다.
 */
export const SECTION_LABELS = {
  // SRI와 LANKA 사이는 줄바꿈 없는 공백이라 좁은 화면에서도 나라 이름이 갈라지지 않는다.
  heroEyebrow: "NEPAL · VIETNAM · MYANMAR · LAOS · SRI LANKA",
  heroLine: "Talent from five Asian countries, prepared for work in Korea and Japan.",
  intro: "WHO WE ARE",
  services: "WHAT WE DO",
  process: "HOW WE WORK",
  network: "OUR NETWORK",
  questions: "QUESTIONS",
  contact: "LET'S TALK",
  scroll: "SCROLL",
  pages: {
    about: "ABOUT US",
    services: "WHAT WE DO",
    visa: "VISA GUIDE",
    partners: "OUR NETWORK",
    why: "OUR STANDARDS",
    contact: "CONTACT",
    gallery: "FIELD PHOTOS",
    privacy: "PRIVACY",
    insights: "INSIGHTS",
  },
} as const;
