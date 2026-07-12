# SEO 실행 계획 — 정우인재개발원 (company-iota-murex.vercel.app)

우선순위: **Critical**(색인·신뢰 차단, 즉시) → **High**(1주 내) → **Medium**(1개월 내) → **Low**(백로그)
감사일: 2026-07-12 · 종합 점수 63/100

---

## Phase 1 — Critical Fixes: 배포 동기화 (Week 1)

가장 중요한 사실: **아래 항목 대부분은 새 작업이 아니라 이미 완성된 로컬 코드의 배포다.**

- [ ] **로컬 미배포 변경사항 전체 커밋 + Vercel 배포** — 한 번의 배포로 해결되는 것:
  - `/visa` 허브 + 비자 상세 8페이지 (`app/visa/`, `components/visa/`, `lib/visas.ts`) — FAQPage·BreadcrumbList 스키마 포함
  - 히어로 실사 이미지 (`hero-slideshow.tsx` → `/kv/redesign/hero.webp`) — "KV 01" 내부 라벨 노출 해소
  - 파트너 정부기관 검증 근거 (`app/partners/page.tsx` — OCR/OTIT 등록번호)
  - 베트남 제거 → 3개국 체제 정합 (`lib/site.ts`, title/description/JSON-LD 동기화)
  - `/contact` 본문·푸터 사업자정보 자기모순 해소
  - 사이트맵 6→15 URL 자동 확장 (`app/sitemap.ts`에 이미 구현됨)
  - ⚠️ 배포 전 `/visa` 콘텐츠의 법령·수치 사실관계 최종 검증 권장
- [ ] **임시 대표 이메일 확정 → `lib/site.ts`의 `email` 필드 기입** — 푸터·contact·JSON-LD contactPoint에 자동 전파. 현재 사이트로 연락할 방법이 전혀 없음.
- [ ] **파비콘 추가** — `company/app/icon.png` (512×512) + `apple-touch-icon.png`. 현재 favicon.ico 404.
- [ ] **배포 후 검증 (필수)**:
  - `/contact` 본문 = 푸터 값 일치 확인
  - `/visa` 포함 15개 URL 전부 200 응답 + 사이트맵 반영 확인
  - 히어로 이미지 배포 직후 CWV 재측정 (현재 LCP 성적은 이미지 0개 상태의 수치 — 회귀 확인 필요)

## Phase 2 — High-Impact Improvements (Weeks 2–3)

- [ ] **페이지별 OG/Twitter 메타** — about/services/partners/why/contact 각 `page.tsx`의 metadata export에 `openGraph: {url, title, description}` + `twitter` 추가. 현재 공유 카드가 전부 홈으로 표시됨.
- [ ] **홈 FAQ에 FAQPage JSON-LD** — `components/faq-section.tsx`의 문항을 `visa-schema.tsx` 패턴으로 스키마화 (표시용 JSX와 스키마용 순수 텍스트 분리 필요).
- [ ] **BreadcrumbList + WebSite 스키마** — 공용 BreadcrumbSchema 컴포넌트로 5개 하위 페이지 적용, `app/layout.tsx`에 WebSite 스키마 + Organization `@id` 상호참조.
- [ ] **Pretendard 로딩 개선** — 최선: `next/font/local` 셀프호스팅. 차선: `<link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous">`.
- [ ] **보안 헤더** — `next.config.mjs`에 `headers()`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, CSP `frame-ancestors`, 최소 Permissions-Policy.
- [ ] **H1 한국어화** — 영문 태그라인(H1) → 한국어 핵심 주제어 중심 재구성, 영문은 보조 문구로. `/partners`·`/why`에 섹션 h2 추가 (현재 h1→h3 건너뜀).
- [ ] **llms.txt 배치** — `company/public/llms.txt` ([findings/geo.md](findings/geo.md) 10장에 한국어 초안 완성돼 있음).
- [ ] 홈 title 46자 → 25~30자 단축, `/partners` description 80자 내외 축약.

## Phase 3 — Content & Authority (Month 2)

- [ ] **/services 콘텐츠 확장** — 사업영역별 절차·기간·필요서류 등 구매 의사결정 정보 (현재 영역당 문장 1개).
- [ ] **대표·팀 약력** — 검증 가능한 사실만 확인 후 `/why` 기재 (수치 조작 금지 원칙과 충돌하지 않는 항목).
- [ ] **파트너 검증 근거 강화** — `mou/README.md`의 ✅ 공식 확인 항목만 "기관명 + 등록번호 + 등록기관 + 확인일" 인용형 문장으로 /partners에 반영. ⚠️ 미확인·상충 항목은 게시 금지.
- [ ] **실사진 확보 → placeholder 순차 교체** — 훈련원·수업 사진 (서술형 한국어 alt 필수, fold 밖만 lazy).
- [ ] **외부 채널 개설** — 유튜브 또는 LinkedIn 회사 페이지 1~2개 → `lib/site.ts` `sameAs` 연결 (현재 브랜드 개체 신호 0).
- [ ] **커스텀 도메인** — 확보 후 Vercel 연결, 301 이전 계획 수립 (vercel.app 서브도메인은 신뢰·CTR 불리).
- [ ] **/why 차별화 프레이밍** — "왜 기존 대행사가 아닌 정우인재개발원인가"에 답하는 비교 구조 추가.
- [ ] 저대비 텍스트(rgb(158,158,158), 대비 2.68:1) WCAG AA(4.5:1) 이상으로 조정, 폼 인풋·체크박스 터치 타겟 44px 확보.

## Phase 4 — Monitoring & Iteration (Ongoing)

- [ ] **서치콘솔 3종 등록** — Google Search Console, 네이버 서치어드바이저, Bing Webmaster Tools.
- [ ] **IndexNow 구현** — 키 발급 → 루트 `{key}.txt` → 배포 파이프라인에서 변경 URL ping (Bing·Naver 실시간 색인).
- [ ] **RUM 도입** — web-vitals 라이브러리로 INP 등 실측, 트래픽 확보 후 CrUX 재검증.
- [ ] **드리프트 베이스라인** — `/seo drift` 베이스라인 생성 → 배포마다 SEO 회귀 자동 감지.
- [ ] **순위 추적** — 단기 목표는 브랜드 키워드("정우인재개발원") + /visa 롱테일. 헤드 키워드("송출업체" 등)는 정부·권위 도메인 장악으로 3~6개월 내 진입 비현실적.
- [ ] (선택) 학습 전용 크롤러(CCBot 등) 차단 여부 정책 결정 — AI 검색 노출과는 별개 사안.

---

### 예상 효과 요약

| 조치 | 개선 카테고리 | 예상 폭 |
|---|---|---|
| Phase 1 배포 동기화 | Content 45→60+, Schema 48→70+, GEO 44→60+, SXO 27→45+ | 종합 63 → **72~75** |
| Phase 2 스키마·OG·헤더 | Technical 76→85+, Schema 70→85+ | 종합 → **78~82** |
| Phase 3 콘텐츠·권위 | Content, GEO, SXO 추가 상승 | 종합 → **85+** |
