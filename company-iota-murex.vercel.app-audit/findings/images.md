# 이미지 최적화 분석 (Images)

**점수: 70/100** · 분석일: 2026-07-12 · 대상: https://company-iota-murex.vercel.app (배포본 6페이지)

## 요약

배포된 사이트 전체에 `<img>` 태그가 **0개**다. 시각 요소는 CSS 반복 그라디언트(장식용)와 페이지당 SVG 아이콘 1개뿐이다. 이미지가 없으니 alt 누락·용량 초과·CLS 같은 감점 요인도 없지만, 실사진 기반 신뢰 신호와 이미지 검색 유입이 원천적으로 0이다. 로컬 작업본(`company/components/hero-slideshow.tsx`)에는 이미 `/kv/redesign/hero.webp` 히어로 이미지가 `next/image`(priority, sizes="100vw", 한국어 alt 포함)로 추가되어 있어 **배포만 하면 상당 부분 해소**된다.

## 잘 되어 있는 점

- **og:image 자동 생성 정상**: `app/opengraph-image.tsx` 기반, 1200×630 PNG(75KB), `og:image:alt`·width·height 메타 모두 존재. 카카오톡/슬랙 공유 미리보기 문제 없음.
- 이미지 유발 CLS 없음 (이미지 자체가 없음).
- 로컬 작업본의 히어로 이미지는 WebP 포맷 + `next/image` 최적화 + 서술형 한국어 alt로 이미 모범적으로 구현됨.

## 발견 사항

### 1. 파비콘 전무 (Medium)
- `favicon.ico` → 404, HTML에 `<link rel="icon">` 없음.
- Google 모바일 검색결과는 파비콘을 노출하므로 브랜드 인지·CTR에 불리하고, 브라우저 탭에서도 기본 아이콘으로 표시됨.
- **권고**: Next.js app router 규칙대로 `company/app/icon.png`(512×512) 또는 `favicon.ico`를 추가. `apple-touch-icon.png`(180×180)도 함께.

### 2. 배포본에 실사진·시각 콘텐츠 전무 (Medium)
- 6개 페이지 모두 이미지 0개. 교육 현장·시설 사진이 없어 "현지 직업훈련" 주장에 대한 시각적 증거가 부족(E-E-A-T 신뢰 신호 약화). 이미지 검색 유입 기회도 0.
- **권고**: 로컬에 이미 준비된 히어로 이미지(`/kv/redesign/hero.webp`)를 배포. 이후 실제 훈련원/수업 사진을 각 페이지에 1–2장씩 추가하고(서술형 한국어 alt 필수), `loading="lazy"`는 첫 화면 밖 이미지에만 적용.

### 3. 신규 이미지 추가 시 체크리스트 (Info)
- WebP/AVIF 포맷, `next/image` 사용(자동 srcset), 첫 화면 이미지에만 `priority`, 명시적 width/height 또는 `fill`+컨테이너 비율로 CLS 방지 — 현재 로컬 구현이 이미 이 기준을 충족하므로 동일 패턴 유지.
