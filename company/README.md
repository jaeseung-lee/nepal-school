# 정우인재개발원 — 회사 홈페이지

외국인력 채용을 원하는 한국·일본 기업(B2B)을 대상으로 한 정우인재개발원 소개 사이트입니다.
Claude Design로 만든 정적 6페이지 디자인을 **Next.js(App Router) + TypeScript + Tailwind CSS v4**로 이식했습니다.

## 기술 스택

- **Next.js 15** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4** — 설정은 `app/globals.css`의 `@theme` 블록(CSS-in-config, `tailwind.config` 파일 없음)
- 폰트: **Pretendard Variable** 단일 서체(`app/fonts.ts`, `next/font/local`로 자체 호스팅)

## 실행

```bash
npm install
npm run dev      # 개발 서버 (기본 http://localhost:3000)
npm run build    # 프로덕션 빌드
npm run start    # 빌드 결과 실행
npm run typecheck # tsc --noEmit
npm run test:i18n # 번역 키 일관성 검사
npm run test:design # 모노톤 디자인 가드 (삭제된 색 토큰·유채색 클래스 금지)
```

> `npm run lint`(`next lint`)는 ESLint 설정이 없어 동작하지 않습니다. 미사용 코드는 `npx tsc --noEmit --noUnusedLocals`로 확인합니다.

> 이 저장소에는 별도의 `dashboard/`(Next 14) 앱이 있습니다. `company/`는 그와 독립된 앱입니다.
> 로컬 프리뷰용 `.claude/launch.json`에 `company`(포트 3007) 설정이 등록돼 있습니다.

## 다국어(i18n) 및 번역 검사

- 기준 카탈로그는 한국어 `messages/ko.json`과 `messages/visa/ko.json`이며, 지원 로케일은 `ko`, `en`, `ja`, `ne`, `vi`, `lo`입니다.
- 한국어 URL은 접두사 없이 `/about`처럼 유지하고, 다른 언어는 `/{locale}/...` 형식(예: `/en/about`, `/ja/about`)을 사용합니다.
- `company/`에서 `npm run test:i18n`을 실행하면 한국어 기준의 모든 번역 키가 각 로케일 카탈로그에 있는지 검사합니다.
- 저장소 루트에서 `npm install`을 실행하면 Husky가 활성화되며, 커밋 전(pre-commit)에 같은 번역 키 검사가 자동으로 실행됩니다.

## 구조

```
app/
  layout.tsx            # <html lang="ko">, 폰트, 공용 헤더/푸터, 메타데이터
  globals.css           # Tailwind v4 @import + @theme 토큰 + 원본 커스텀 CSS
  page.tsx              # 홈 (/)
  about|services|partners|why|contact/page.tsx   # 내부 5개 페이지
components/
  site-header.tsx       # (client) 투명 오버레이 ↔ 다크 글래스 전환 + 메뉴·언어 패널
  site-footer.tsx       # 공용 다크 푸터
  hero-slideshow.tsx    # 홈 풀블리드 히어로 (사진 전환은 hero-image-carousel.tsx)
  contact-form.tsx      # 문의 준비 안내 패널 (전화·메일, 백엔드 미연동)
  page-banner.tsx       # 서브페이지 풀블리드 다크 히어로 (photo·label props)
  section-head.tsx / status-marker.tsx           # 섹션 머리 · 모양으로 구분하는 상태 표시
  metrics-strip.tsx / process-steps.tsx / cta-banner.tsx / collage.tsx
  service-cards.tsx                              # 홈·사업영역 공용 카드
lib/
  nav.ts                # 메뉴·언어 스위처 단일 출처
```

## 디자인 시스템 (요약)

모노톤 에디토리얼 스타일(레퍼런스: OFFMORA). 브랜드 블루는 로고 아트워크 안에만 남기고, 화면 색은 무채색만 씁니다.
`npm run test:design`(prebuild 포함)이 삭제된 색 토큰·유채색 클래스·유채색 hex를 막습니다.

| 역할 | 토큰 | 값 |
|---|---|---|
| 바탕 / 흰 면 | `paper` / `paper-soft`·`surface` | `#FAFAFA` / `#FFFFFF` |
| 글자 / 보조 글자 | `ink` / `muted` | `#232323` / `#6B6B6B` (AA 5.1:1) |
| 헤어라인 / 이미지 자리 | `line` / `image` | `#D7D7D7` / `#E5E5E5` |
| 다크 밴드 / 메뉴 / 푸터 | `night` / `night-soft` / `night-deep` / `night-muted` | `#202020` / `#242424` / `#111111` / `#AAAAAA` |
| 콘텐츠 최대폭 | `max-w-content`, `page-wrap` | `90rem`(1440px) + 좌우 `--spacing-gutter` |
| 섹션 여백 | `py-section` | `clamp(4.5rem, 9vw, 9rem)` |

- 타입: `text-display` · `text-headline` · `text-statement` · `text-subhead` · `text-title` · `text-description` · `text-meta`, 라벨은 `eyebrow`.
- 버튼: `pill` + `pill-light` / `pill-dark` / `pill-outline` / `pill-outline-light`(+ `pill-lg`), 원형 아이콘 버튼은 `round-btn`.
- 어두운 면에는 `surface-dark`를 달아 포커스 링을 흰색으로 바꿉니다.
- 첫 섹션이 어두운 풀블리드 히어로면 `data-hero-overlay`를 달아 헤더를 투명 오버레이로 띄웁니다(`.site-header`, `body:has()` 기준).
- 크게 쓰는 사진은 `lib/key-visuals.ts`가 단일 출처이며 모두 `public/gallery` 실사입니다. 영문 장식 라벨은 `lib/section-labels.ts`.

---

## ⚠️ 공개 전 확정/연동 TODO (콘텐츠)

원본 기획 원칙상 **신생기업(2026.06 설립)이라 실적 수치를 지어내지 않으며**, 미확정 항목은 `입력 예정` 회색 플레이스홀더로 둡니다. 공개 전 아래를 채워야 합니다.

**필수 입력값** (전 페이지 푸터·문의 공통)
- [ ] 사업자등록번호 · 본사 주소(+지도) · 대표 전화 · 이메일
- [ ] 대표이사 오제환 약력(사실만) · 핵심 인력 약력 · 보유 자격/인허가

**이미지·로고** (현재 전부 CSS 플레이스홀더)
- [ ] 히어로 KV 사진 3장(네팔 교육 / 한국 산업현장 / 일본 개호·숙박) — `components/hero-slideshow.tsx`의 각 슬라이드 `style`에 `backgroundImage:url(...)` 지정 후 `hero-ph` 클래스 제거
- [ ] 콜라주·사업영역 카드용 실사진(`.ph` 플레이스홀더 교체)
- [ ] 파트너 로고 3종(Richhood / KTS / 대한주택건설협회) + **서면 사용 허락**
- [ ] 자사 로고(현재 "JW" 텍스트 마크로 대체)

**기능·데이터**
- [ ] 문의 양식 전송 백엔드 연동 — `components/contact-form.tsx`의 `onSubmit`(현재 안내문만 표시). 이메일/메신저 알림 + reCAPTCHA 권장
- [ ] 개인정보처리방침 페이지

**사업영역 상세**
- [x] 한국어·일본어 상세 4페이지: 일본 개호, 일본 호텔·호스피탈리티, 한국 유학, 한국 용접
- [ ] 실제 제휴 대학, 호텔 과정 시수, 용접 훈련사진·자격 근거 등 미확정 자료는 확보 후 보강

**미구현 페이지(기획엔 있으나 현재 없음)**
- [ ] 회사소개 상세(인사말/미션·비전/연혁/오시는 길) · 자료실(News)/FAQ

## 회사 기본 정보(확정)

- 국문: 정우인재개발원 / 영문: Jeongwoo Human Resource Development Institute
- 대표이사: 오제환 · 설립: 2026년 6월 · 직접 교육·공급: 네팔 · 파트너 소싱: 베트남·미얀마·라오스·스리랑카 · 취업 목적국: 한국·일본
- 사업: 해외 직업훈련학교 운영 · 한국 취업비자(E-9/E-7/D-2/D-4) · 일본 특정기능1호(개호·숙박)
