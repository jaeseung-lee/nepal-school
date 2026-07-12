# 기술 SEO 감사 보고서 — company-iota-murex.vercel.app

대상: 정우인재개발원(Joong Woo HRD) 기업 사이트 — Next.js 15 App Router, SSR/정적 프리렌더링
감사 대상 페이지(전부 HTTP 200): `/`, `/services`, `/about`, `/partners`, `/why`, `/contact` (6개)
`/visa`는 로컬 소스에만 존재하고 아직 배포되지 않아 라이브에서 404 — 내부 링크 없음, 정상.

기술 종합 점수: **76 / 100**
온페이지 종합 점수: **74 / 100**

---

## 1. 크롤가능성 (Crawlability) — 통과 (양호)

| 항목 | 결과 |
|---|---|
| robots.txt | 존재, `User-agent: * / Allow: /` 전체 허용 |
| AI 크롤러 명시 허용 | GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended 모두 `Allow: /` |
| Sitemap 지시자 | `Sitemap: https://company-iota-murex.vercel.app/sitemap.xml`, `Host:` 포함 |
| sitemap.xml | 유효한 XML, 정확히 라이브 6개 URL과 1:1 일치, priority 0.6~1.0 부여 |
| noindex | 6개 페이지 전부 `<meta name="robots">` 없음 → 기본값(index,follow) |
| /visa 404 | 정상 404 상태코드(`x-next-error-status: 404`), soft-404 아님, 사이트맵·내부링크 어디에도 없음 → 현재는 문제 없음 |
| 리다이렉트 체인 | `http→https` 308 1회, `/about/→/about` 308 1회 — 체인 없음, 단일 홉으로 깔끔 |

**주의(정보성)**: 로컬 저장소 `app/sitemap.ts`에는 이미 `/visa` 및 `lib/visas.ts` 기반 비자 상세 라우트가 추가돼 있으나, 라이브 sitemap.xml에는 아직 반영되지 않음(현재는 문제 없으나, `/visa` 배포 시 sitemap도 함께 갱신되는지 확인 필요).

## 2. 색인가능성 (Indexability) — 통과, 경미한 개선 여지

- 6개 페이지 모두 `<link rel="canonical">` 자기 자신을 정확히 참조 (`app/layout.tsx`의 기본 `alternates.canonical: "/"` + 각 `page.tsx`의 `alternates.canonical` 개별 오버라이드 방식, 정상 동작 확인).
- 타이틀·설명 6개 전부 서로 다름(중복 없음).
- hreflang: 없음 — 언어 스위처(KO만 활성, EN/JA/VI/NE는 `disabled` 플레이스홀더)와 일치하는 정상 상태. 다국어 페이지가 실제로 생기기 전까지는 hreflang 미구현이 맞는 선택(상세 검증은 `seo-hreflang` 서브스킬 위임 대상이나, 현재는 대상 페이지 자체가 없음).
- 타이틀 길이: 홈페이지 46자(한글)로 다소 김 — 아래 온페이지 섹션 참고.

## 3. 보안 (Security) — 개선 필요

`curl -sI`로 6개 페이지 전부 확인:

```
strict-transport-security: max-age=63072000; includeSubDomains; preload   ✅ (Vercel 기본 제공, preload 플래그 포함 양호)
access-control-allow-origin: *                                            ℹ️ (Vercel 정적/프리렌더 응답 기본값)
```

**없는 헤더** (6개 페이지 전부 동일하게 없음):
- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options` (또는 CSP `frame-ancestors`)
- `Referrer-Policy`
- `Permissions-Policy`

`next.config.mjs`를 확인한 결과 `headers()` 함수 자체가 정의돼 있지 않음(`reactStrictMode: true`만 존재) → 위 헤더들은 애초에 설정된 적이 없음.

**[Medium] 권장 조치**: `next.config.mjs`에 `async headers()`를 추가해 전 라우트(`source: "/(.*)"`)에 최소한 `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`(또는 동등한 CSP `frame-ancestors 'none'`), 기본 `Permissions-Policy`를 적용.

## 4. URL 구조 — 우수

- `/`, `/about`, `/services`, `/partners`, `/why`, `/contact` — 소문자, 평평한 구조, 쿼리스트링/세션ID 없음.
- 트레일링 슬래시 정규화(`/about/` → `/about`, 308) 일관됨.
- `http` → `https` 단일 308 리다이렉트.
- **[Low/Info]** 정식 커스텀 도메인이 아닌 `*.vercel.app` 서브도메인 사용 중 — 브랜드 신뢰도·클릭률에 불리할 수 있고, 향후 정식 도메인 이전 시 301 리다이렉트로 색인 자산을 이전해야 하는 추가 작업 필요.

## 5. 모바일 친화성 — 양호

- 전 페이지 `<meta name="viewport" content="width=device-width, initial-scale=1"/>` 정상, `maximum-scale`/`user-scalable=no` 등 확대 제한 없음(접근성 양호).
- `<html lang="ko">` 정상.
- Tailwind `lg:` 반응형 클래스가 헤딩·섹션 전반에 사용됨(반응형 설계 확인).
- **[Low]** 헤더 언어 스위처 버튼(`EN/JA/VI/NE`)이 `px-2.5 py-1 text-xs` — 실제 렌더링 높이가 권장 터치 타겟(44×44px, WCAG 2.5.5)에 미달 추정. 현재는 `disabled` 상태라 실사용 영향은 적으나, 다국어 활성화 시 패딩 확대 필요.

## 6. Core Web Vitals 리스크 (소스 기반 정적 분석)

- **[Medium] 렌더링 차단 외부 폰트 CSS + preconnect 없음**: `app/layout.tsx`의 `<head>`에서 `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@1.3.9/dist/web/static/pretendard.min.css`를 `<link rel="stylesheet">`로 직접 로드. 파일 자체는 `font-display:swap`이 적용돼 있어(직접 확인) 무한 텍스트 숨김(FOIT)은 아니지만, `rel="preconnect"`/`dns-prefetch`가 전혀 없어 DNS+TCP+TLS 왕복 후에야 렌더링 차단 CSS 다운로드가 시작됨. 본문 대부분이 한글(Pretendard)이므로 LCP 텍스트 렌더링이 지연될 수 있음.
  - 권장: `<link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous">` 추가, 더 나아가 `next/font/local`로 Pretendard 서브셋을 자체 호스팅해 외부 요청 자체를 제거.
- **[Info] 실제 이미지 0개**: 6개 페이지 전부에서 `<img>` 태그가 단 하나도 발견되지 않음. 히어로/배너/콜라주 영역은 전부 `.ph`, `.ph-dark` 클래스의 CSS 대각선 그라데이션 플레이스홀더(`data-ph="KV 01 · 네팔 현지 교육"` 등)로 렌더링되고 있음. 이는 CLAUDE.md에 명시된 프로젝트 규칙("확인 안 된 자산은 발명하지 않는다")과 일치하는 의도된 상태로 보임.
  - CWV 관점: 현재는 무거운 이미지가 없어 LCP/CLS 리스크가 오히려 낮음(문제 아님).
  - 다만 로컬 소스(`components/page-banner.tsx` 등)는 이미 `next/image`(`fill`, `sizes`, 고정 비율 컨테이너)를 사용하도록 구현이 끝나 있어, 실제 사진 자산이 준비되면 그대로 배포 가능. 배포 시 히어로 LCP 이미지에는 `priority`/`fetchPriority="high"`를 명시적으로 지정할 것을 권장.
  - **[정보] 라이브 마크업이 로컬 최신 소스와 구조적으로 다름**: 라이브 HTML의 실제 비주얼 구조(플레이스홀더 그라데이션 히어로)는 로컬 `git log` 최신 커밋(`12384f5` 등, `PageBanner`/`Collage`/`next/image` 기반 리디자인)과 다르게 보이는 반면, `<title>`/메타 설명 문구는 최신 로컬 소스 문구와 일치함. 배포가 최신 커밋을 완전히 반영했는지, 혹은 Vercel 엣지 캐시가 페이지별로 서로 다른 시점에 재생성됐는지(홈페이지 `Age` 헤더 802,494초 ≈ 9.3일 vs 나머지 페이지 `Age` 800~812초 ≈ 13분으로 캐시 나이가 페이지마다 크게 다름) 확인 권장.
- **[정상] 스크립트 로딩**: 발견된 `<script>` 태그는 전부 `async` 또는 `noModule` 속성 보유, 동기 렌더링 차단 스크립트 없음. Next.js 표준 코드분할 청크만 존재.
- **[정상] 헤딩 폰트(Outfit)**: `next/font/google`로 `display: "swap"` 지정 및 `woff2` `<link rel="preload">` 확인 — 모범 사례.
- **[정상] CLS**: 실제 이미지가 없어 치수 누락으로 인한 레이아웃 시프트 위험 없음. 히어로 슬라이드 레이어는 절대 위치(absolute)로 겹쳐 있어 전환 시 레이아웃 시프트 유발 가능성 낮음.
- **[정상] INP 리스크**: 감지된 클라이언트 컴포넌트는 헤더(스크롤/모바일 메뉴), 히어로 슬라이드쇼, 문의 폼 정도로 무거운 서드파티 스크립트 없음. 현재 리스크 낮음.

## 7. 구조화 데이터 (탐지만 수행 — 별도 스키마 에이전트가 상세 검증)

- 6개 페이지 전부 동일한 **Organization** JSON-LD 1개 발견 (`components/organization-schema.tsx`, 루트 레이아웃에서 전역 삽입). `name`, `legalName`, `alternateName`, `url`, `logo`, `image`, `description`, `foundingDate`, `founder(Person)`, `knowsLanguage`, `areaServed(Country[])`, `taxID`, `address(PostalAddress)` 포함 — 사업자 정보가 풍부하게 채워져 있음(양호).
- **[Medium] FAQPage 스키마 없음**: 홈페이지에 실제 "자주 묻는 질문" 섹션(`components/faq-section.tsx`)이 존재하지만 대응하는 `FAQPage` JSON-LD가 없음 — 리치 결과 노출 기회 누락.
- **[Low] BreadcrumbList 스키마 없음**: 각 하위 페이지에 시각적 브레드크럼("홈 › 회사소개" 등)이 있으나 대응 JSON-LD가 없음.
- **[Low] WebSite/LocalBusiness 스키마 없음**: 사이트 검색 기능이 없어 `SearchAction`은 불필요하나, 주소가 명확한 사업장이므로 `LocalBusiness`/`ProfessionalService` 서브타입 고려 가능(선택 사항, 우선순위 낮음).

## 8. JavaScript 렌더링 — 우수

- `x-nextjs-prerender: 1`, `mode_used: "raw"`(플러그인 렌더 스크립트), `is_spa: false` — 순수 `curl`/원시 fetch로도 완전한 콘텐츠(제목, 본문, nav, footer, JSON-LD 전부)가 그대로 내려옴.
- 콘텐츠가 클라이언트 사이드 하이드레이션에 의존하지 않음 → 크롤러(구글봇 포함 JS 실행 못 하는 크롤러)가 완전한 콘텐츠를 즉시 수집 가능. SEO 관점에서 이상적인 렌더링 전략.

## 9. IndexNow 프로토콜 — 미구현

- `/indexnow.txt`(또는 임의 키 파일) 요청 시 404, 소스 코드에도 IndexNow API 호출/자동화 로직 없음.
- **[Medium]** Bing, Yandex, Naver(2022년부터 IndexNow 참여) 등에 실시간 색인 신호를 보내지 못해 신규/변경 페이지 반영이 각 검색엔진의 자체 크롤 주기에만 의존함. 이 사이트는 한국 B2B 고객이 대상이라 Naver 노출 속도도 중요.
  - 권장: IndexNow 키 발급 → 루트에 `{key}.txt` 배포 → 배포 파이프라인(Vercel deploy hook 등)에서 변경된 URL을 Bing/Yandex/Naver IndexNow 엔드포인트로 자동 ping.

---

## 온페이지 점검 (페이지별)

| 페이지 | Title (길이) | Meta Description (길이) | Canonical | H1 개수 | 헤딩 계층 |
|---|---|---|---|---|---|
| `/` | 정우인재개발원 — 네팔·베트남 인재를... (46자) ⚠️ 다소 김 | 83자 ✅ | `.../` ✅ | 1 ✅ | h1→h2→h3 정상, footer h3(Menu/Company/Contact) 앞에 h2 없음(공통 컴포넌트, 경미) |
| `/about` | 회사소개 — 정우인재개발원 (14자) ✅ | 73자 ✅ | `.../about` ✅ | 1 ✅ | h1 다음 바로 h2("Let's Build Your Workforce")로 CTA만 존재, 본문 섹션 제목에 h2 부재 — 경미 |
| `/services` | 사업영역 — 정우인재개발원 (14자) ✅ | 80자 ✅ | `.../services` ✅ | 1 ✅ | h1→h2→h3 정상 |
| `/partners` | 파트너십 — 정우인재개발원 (14자) ✅ | **108자** ⚠️ 김(잘림 위험) | `.../partners` ✅ | 1 ✅ | h1 다음 바로 h3(MOU 카드 6개) — **h2 누락** |
| `/why` | 신뢰·전문성 — 정우인재개발원 (16자) ✅ | 86자 ✅ | `.../why` ✅ | 1 ✅ | h1 다음 바로 h3(원칙 카드 4개) — **h2 누락** |
| `/contact` | 문의 — 정우인재개발원 (12자) ✅ | 47자 ✅ | `.../contact` ✅ | 1 ✅ | h1→h2→h3 정상 |

**공통 사항 (6개 페이지 전부)**:
- **[High] og:title / og:description / og:url이 전 페이지에서 홈페이지 값으로 고정**: `layout.tsx`의 기본 `openGraph`/`twitter` 메타데이터를 각 `page.tsx`(`about`, `contact`, `partners`, `services`, `why`)가 `title`/`description`/`alternates.canonical`만 개별 오버라이드하고 `openGraph`/`twitter` 객체는 오버라이드하지 않음 → Next.js 메타데이터는 중첩 객체(openGraph/twitter)를 자동 병합하지 않으므로, 실제 라이브 HTML에서 `/about`, `/services`, `/partners`, `/why`, `/contact` 전부 `og:title`="정우인재개발원 — 네팔·베트남 인재를... 파트너"(홈 문구), `og:url`="https://company-iota-murex.vercel.app"(홈 URL)로 동일하게 출력됨을 확인. `<title>`/`canonical`은 페이지별로 정확한데 소셜 공유 카드(카카오톡, 페이스북, 슬랙, X 등)만 항상 홈페이지로 보임 — 개별 페이지 공유 시 CTR·정보 정확성 저하.
  - 권장: 각 `page.tsx`의 `metadata`에 `openGraph: { url: "/about", title: "...", description: "..." }`, `twitter: { title: "...", description: "..." }`를 명시적으로 추가.
- 내부 링크: 페이지당 실질 내부 링크는 헤더 5개 + 로고(홈) + 푸터 반복 링크가 전부이며, 본문 컨텍스트 링크는 `about`/`why` 일부에 한정(6개 페이지 규모에서는 큰 문제는 아니나, 페이지 수 확장 시 본문 교차링크 확대 필요). 로컬 소스에는 `why → /visa` 링크가 이미 추가돼 있으나 미배포 상태.
- `lang="ko"` 전 페이지 일관.
- Twitter Card `summary_large_image` 정상 설정(단, 위 og:url 이슈와 동일하게 페이지별 값 미반영).

---

## 종합 평가

**잘 되어 있는 점**
- robots.txt: 전체 허용 + AI 크롤러(GPTBot/ClaudeBot/PerplexityBot 등) 명시적 허용 + sitemap/host 지시자
- sitemap.xml이 라이브 6페이지와 정확히 1:1 일치
- 완전한 서버사이드 프리렌더링(`is_spa:false`, raw fetch로 전체 콘텐츠 확보) — JS 실행 없이도 크롤러가 완전한 콘텐츠 수집 가능
- HTTPS 강제 + 강력한 HSTS(`includeSubDomains; preload`)
- 깔끔한 평면 URL 구조, 단일 홉 리다이렉트(http→https, 트레일링 슬래시 정규화), 정상 404
- 전 페이지 canonical 자기참조 정확
- 전 페이지 title/description 유일, H1 정확히 1개
- Organization JSON-LD가 사업자등록번호·주소·설립일 등 풍부한 정보로 전 페이지에 삽입
- 모바일 뷰포트 정상 설정, 확대 제한 없음
- noindex/robots meta로 실수로 색인 차단된 페이지 없음
- 스크립트 전부 async/noModule — 렌더링 차단 스크립트 없음

**우선순위별 이슈 요약**은 아래 JSON `findings` 참고.
