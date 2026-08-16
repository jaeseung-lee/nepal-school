export const BRAND_ASSETS = {
  lockup: {
    color: "/brand/logo-color.svg",
    white: "/brand/logo-white.svg",
    black: "/brand/logo-black.svg",
  },
  mark: { color: "/brand/mark-color.svg" },
  social: "/brand/og-image.png",
} as const;

export const BRAND_SOCIAL_IMAGE = {
  url: BRAND_ASSETS.social,
  width: 1200,
  height: 630,
  alt: "정우인재개발원 HRDI 공식 로고",
} as const;
