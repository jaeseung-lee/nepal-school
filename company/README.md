# 주식회사 정우인력개발 — 회사 홈페이지

외국인력 채용을 원하는 한국·일본 기업(B2B)을 대상으로 한 정우인력개발 소개 사이트입니다.
Claude Design로 만든 정적 6페이지 디자인을 **Next.js(App Router) + TypeScript + Tailwind CSS v4**로 이식했습니다.

## 기술 스택

- **Next.js 15** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4** — 설정은 `app/globals.css`의 `@theme` 블록(CSS-in-config, `tailwind.config` 파일 없음)
- 폰트: **Outfit**(영문 디스플레이, `next/font/google`) + **Pretendard**(국문 본문, jsDelivr CDN)

## 실행

```bash
npm install
npm run dev      # 개발 서버 (기본 http://localhost:3000)
npm run build    # 프로덕션 빌드
npm run start    # 빌드 결과 실행
npm run typecheck # tsc --noEmit
```

> 이 저장소에는 별도의 `dashboard/`(Next 14) 앱이 있습니다. `company/`는 그와 독립된 앱입니다.
> 로컬 프리뷰용 `.claude/launch.json`에 `company`(포트 3007) 설정이 등록돼 있습니다.

## 구조

```
app/
  layout.tsx            # <html lang="ko">, 폰트, 공용 헤더/푸터, 메타데이터
  globals.css           # Tailwind v4 @import + @theme 토큰 + 원본 커스텀 CSS
  page.tsx              # 홈 (/)
  about|services|partners|why|contact/page.tsx   # 내부 5개 페이지
components/
  site-header.tsx       # (client) 스크롤 solid 전환 + 모바일 메뉴 + 활성 메뉴
  site-footer.tsx       # 공용 푸터
  hero-slideshow.tsx    # (client) 홈 히어로 3슬라이드 자동재생
  contact-form.tsx      # (client) 문의 양식 (현재 백엔드 미연동)
  page-banner.tsx       # 내부 페이지 상단 배너 (props)
  metrics-strip.tsx / process-steps.tsx / cta-banner.tsx / collage.tsx
  service-cards.tsx / partner-cards.tsx           # 홈·상세 공용 카드
lib/
  nav.ts                # 메뉴·언어 스위처 단일 출처
```

## 디자인 토큰 (요약)

| 역할 | 토큰 | 값 |
|---|---|---|
| Primary | `primary-main` / `-light` / `-dark` / `-deepest` | `#1B79F2` / `#4A97F7` / `#0B4F9E` / `#062E63` |
| 포인트(코랄) | `gold-light` / `gold-deep` | `#FF8A5B` / `#D9542A` |
| Blue accent | `blue-accent` | `#2700FF` |
| 콘텐츠 최대폭 | `max-w-content` | `1160px` |

Tailwind 유틸(`bg-primary-main`, `text-gold-deep`, `font-display`, `max-w-content` 등)은 원본 standalone 번들과 동일하게 동작합니다.

---

## ⚠️ 공개 전 확정/연동 TODO (콘텐츠)

원본 기획 원칙상 **신생기업(2026.06 설립)이라 실적 수치를 지어내지 않으며**, 미확정 항목은 `입력 예정` 회색 플레이스홀더로 둡니다. 공개 전 아래를 채워야 합니다.

**필수 입력값** (전 페이지 푸터·문의 공통)
- [ ] 사업자등록번호 · 본사 주소(+지도) · 대표 전화 · 이메일
- [ ] 대표이사 오제환 약력(사실만) · 핵심 인력 약력 · 보유 자격/인허가

**이미지·로고** (현재 전부 CSS 플레이스홀더)
- [ ] 히어로 KV 사진 3장(네팔 교육 / 한국 산업현장 / 일본 개호·숙박) — `components/hero-slideshow.tsx`의 각 슬라이드 `style`에 `backgroundImage:url(...)` 지정 후 `hero-ph` 클래스 제거
- [ ] 콜라주·사업영역 카드용 실사진(`.ph` 플레이스홀더 교체)
- [ ] 파트너 로고 4종(Richhood / KTS / Vinako / 대한주택건설협회) + **서면 사용 허락**
- [ ] 자사 로고(현재 "JW" 텍스트 마크로 대체)

**기능·데이터**
- [ ] 문의 양식 전송 백엔드 연동 — `components/contact-form.tsx`의 `onSubmit`(현재 안내문만 표시). 이메일/메신저 알림 + reCAPTCHA 권장
- [ ] 개인정보처리방침 페이지
- [ ] 다국어(EN→JA→VI·NE) 실제 구현 + `hreflang` — 헤더 언어 스위처는 현재 KO만 활성(디자인만)

**미구현 페이지(기획엔 있으나 현재 없음)**
- [ ] 사업영역 하위 상세 3페이지 · 회사소개 상세(인사말/미션·비전/연혁/오시는 길) · 자료실(News)/FAQ

## 회사 기본 정보(확정)

- 국문: 주식회사 정우인력개발 / 영문: Joong Woo Human Resource Development Co., Ltd. / 브랜드: JOONG WOO(JW)
- 대표이사: 오제환 · 설립: 2026년 6월 · 해외 거점: 네팔·베트남 · 협력국: 네팔·베트남·한국·일본
- 사업: 해외 직업훈련학교 운영 · 한국 취업비자(E-9/E-7/D-2/D-4/E-8) · 일본 특정기능1호(개호·숙박)
