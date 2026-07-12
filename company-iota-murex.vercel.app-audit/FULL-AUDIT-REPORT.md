# 정우인재개발원 사이트 전체 SEO 감사 리포트

- **대상**: https://company-iota-murex.vercel.app (6페이지 전수)
- **감사일**: 2026-07-12
- **방법**: claude-seo v2.2.0 — 전문 에이전트 8종 병렬 감사 + 인라인 이미지 분석
- **비즈니스 유형**: B2B 서비스 (네팔 인재 현지 양성 → 한국·일본 취업 연계, 2026-06 설립)

---

## 종합 SEO 건강 점수: **63 / 100**

| 카테고리 | 가중치 | 점수 | 상세 |
|---|---|---|---|
| Technical SEO | 22% | **76** | [findings/technical.md](findings/technical.md) |
| Content Quality | 23% | **45** | [findings/content.md](findings/content.md) |
| On-Page SEO | 20% | **74** | [findings/technical.md](findings/technical.md) |
| Schema / Structured Data | 10% | **48** | [findings/schema.md](findings/schema.md) |
| Performance (CWV, 랩) | 10% | **88** | [findings/performance.md](findings/performance.md) |
| AI Search Readiness (GEO) | 10% | **44** | [findings/geo.md](findings/geo.md) |
| Images | 5% | **70** | [findings/images.md](findings/images.md) |

**보조 지표** (가중치 미포함): 사이트맵 92 ([sitemap.md](findings/sitemap.md)) · 비주얼 70 ([visual.md](findings/visual.md), 스크린샷 36장) · SXO 27 ([sxo.md](findings/sxo.md))

---

## 한 줄 결론

> **이 감사에서 발견된 Critical/High 이슈 대부분의 해결책이 이미 로컬 저장소에 코드로 완성되어 있다. 신규 개발이 아니라 "커밋 + 배포"가 가장 ROI 높은 단일 조치다.**

현재 라이브 배포본(2026-07-02 빌드)은 로컬 작업본보다 크게 뒤처져 있다. 로컬에는 `/visa` 비자 정보 허브(8개 상세 페이지, FAQPage·BreadcrumbList 스키마, 출처·기준일 병기), 히어로 실사 이미지(`hero.webp`), 파트너 정부기관 검증 근거(OCR·OTIT 등록번호), 베트남 제거(3개국 체제) 등이 모두 완성된 채 미배포 상태다.

---

## Critical 이슈 (즉시 조치)

1. **/contact 페이지 자기모순** — 본문 카드는 "주소 입력 예정 · 사업자번호 입력 예정"인데 같은 페이지 푸터는 실제 값(684-13-02918, 용인시 주소)을 노출. 구버전 배포가 원인이며 신뢰도(Trust)에 직접 타격. → 최신 커밋 재배포로 해결.
2. **작동하는 연락 수단 전무** — 전화·이메일 모두 "입력 예정", 문의 폼은 백엔드 미연동(안내문만 표시). 모든 페이지 CTA가 /contact로 수렴하는데 최종 목적지가 막혀 있음. → 임시 대표 이메일 1개라도 `lib/site.ts`에 기입(자동 전파).
3. **/visa 섹션 미배포** — SERP 역분석 결과 타깃 키워드("특정기능 비자", "네팔 인력 채용" 등) 상위는 정보성 가이드가 장악. 이에 대응하는 콘텐츠가 로컬에 완성돼 있으나 라이브는 404. 배포 시 사이트맵도 6→15 URL 자동 확장.
4. **라이브 이미지 0개** — 실사진·로고 전부 placeholder 박스, 홈 히어로에 내부 제작 라벨("KV 01 · 네팔 현지 교육")까지 노출.

## High 이슈

- **OG/Twitter 태그 전 하위 페이지 홈 고정** — og:title·og:url이 전부 홈페이지 값. 카카오톡/링크드인 공유 시 항상 홈 카드로 표시. 각 `page.tsx`의 metadata에 openGraph/twitter 명시 필요.
- **구조화 데이터가 Organization 하나뿐** — 라이브 노출 중인 홈 FAQ(5~7문항)에 FAQPage 스키마 없음, 시각적 브레드크럼 5곳에 BreadcrumbList 없음, WebSite 스키마 없음. 동일 패턴이 `components/visa/visa-schema.tsx`에 이미 구현돼 있어 이식 비용 낮음.
- **내부 페이지 본문이 매우 얇음** — 고유 본문 85~112어절. 특히 /services는 사업영역당 문장 1개.

## 주목할 만한 강점

- **완전한 SSR** — JS 없이 전체 콘텐츠 크롤 가능, AI 크롤러(GPTBot·ClaudeBot·PerplexityBot 등) robots.txt 명시 허용. AI 접근성 83점.
- **성능 우수(랩)** — LCP 0.22~0.79s, CLS 0.0, 페이지 169~195KB. 단, 이미지 0개 상태의 성적이므로 히어로 배포 후 재측정 필요.
- **정직한 E-E-A-T 태도** — "검증할 수 없는 수치는 표기하지 않는다" 원칙, AI 상투어 없는 카피, 사업자정보 투명 공개. 신생 기업으로서 올바른 기반.
- **사이트맵-실사이트 100% 일치**, canonical·title·H1 규율 준수.

## 페르소나 스코어링 (SXO, 25점×4축)

| 페르소나 | 점수 | 판정 |
|---|---|---|
| 네팔 파트너 기관 담당자 | 64/100 | Good |
| 한국 SME 인사담당자 | 55/100 | Needs Work |
| 리스크 회피형 의사결정자 | 50/100 | Needs Work |
| 대행사 비교검토 담당자 | 48/100 | Needs Work |
| 일본 개호·숙박 채용담당자 | 33/100 | Critical Mismatch |

공통 감점 요인: 연락 수단 부재(Action), 실사진·검증 근거 부재(Trust). 일본 채용담당자 대응 콘텐츠는 /visa 배포로 크게 개선 예상.

## 제외된 감사 항목

| 에이전트 | 제외 사유 |
|---|---|
| seo-google | Google API 자격증명 없음 (CrUX/GSC/GA4 연동 시 필드 데이터 확보 가능) |
| seo-backlinks | Moz/Bing 키 없음 + 설립 1개월 vercel.app 서브도메인 (백링크 사실상 0) |
| seo-local / seo-maps | B2B 서비스 — 맵팩 대상 아님 |
| seo-ecommerce / seo-cluster / seo-drift / seo-dataforseo | 해당 시그널·연동 없음 |

## 산출물

- 실행 계획: [ACTION-PLAN.md](ACTION-PLAN.md)
- 카테고리별 상세: `findings/*.md` (9개 파일)
- 스크린샷: `screenshots/` (데스크톱+모바일 36장)
- 구조화 데이터: [audit-data.json](audit-data.json)
- 크롤 원본: `crawl/`
