# 성능 / Core Web Vitals 분석 (Performance)

**점수: 88/100** · 분석일: 2026-07-12 · 대상: https://company-iota-murex.vercel.app (배포본)

## 측정 방법 (중요 — 반드시 읽을 것)

**이 보고서의 모든 수치는 랩(Lab) 데이터이며, 필드(Field/CrUX) 데이터가 아니다.**

- Google API 자격증명이 구성되어 있지 않아 CrUX API / PageSpeed Insights API를 사용할 수 없었다. 신생 도메인(2026-06 설립)이라 어차피 CrUX는 트래픽 부족으로 대부분 404를 반환할 가능성이 높다.
- 대신 Playwright + Chromium(CDP)로 자체 측정 스크립트를 작성해 실행했다. Lighthouse의 단일 실행(single run)과 동등한 성격의 랩 측정이며, 페이지당 1회 측정(중앙값 반복 측정 아님)이므로 ±변동 가능성이 있다.
- **Desktop 프로파일**: RTT 40ms, 대역폭 10Mbps, CPU 스로틀링 없음(1x) — Lighthouse desktop 프리셋과 동일.
- **Mobile 프로파일**: RTT 150ms, 다운로드 1.6Mbps / 업로드 750Kbps(Slow 4G), CPU 4x 슬로다운 — Lighthouse mobile 프리셋과 동일.
- 측정 대상: `/`(홈), `/services`, `/contact` × Desktop/Mobile 6개 조합.
- **TTFB 측정 방법에 대한 주의사항**: 브라우저의 `Navigation Timing`(`responseStart - requestStart`)으로 TTFB를 계산하면 DevTools 네트워크 스로틀링 지연이 반영되지 않아 실제보다 훨씬 짧게(예: 12ms) 나오는 것을 검증 과정에서 확인했다(2000ms 인위적 지연으로 통제 실험 후 발견). 따라서 이 보고서는 CDP의 `Network.requestWillBeSent` → `Network.responseReceived` 실제 이벤트 타임스탬프 차이를 TTFB로 사용했다(통제 실험에서 2000ms 지연을 정확히 2043ms로 재현 확인). 이 방식이 실측에 더 가깝다.
- 실사용자 상호작용(클릭·타이핑)을 시뮬레이션하지 않았으므로 **INP는 랩에서 측정 불가**(INP는 정의상 실사용자 상호작용이 필요). 대신 참고 지표로 Long Task(50ms 이상 JS 실행 블록) 개수·총 시간을 수집했다.

## Core Web Vitals 요약 (랩 측정, 75th-percentile 필드 기준과 별개)

| 페이지 | 뷰포트 | TTFB | FCP | LCP | LCP 요소 | CLS |
|---|---|---|---|---|---|---|
| `/` | Desktop | 75ms | 268ms | 268ms | `H1` (텍스트) | 0.000 |
| `/` | Mobile (Slow 4G+4xCPU) | 172ms | 788ms | 788ms | `H1` (텍스트) | 0.000 |
| `/services` | Desktop | 57ms | 240ms | 240ms | `H1` (텍스트) | 0.000 |
| `/services` | Mobile | 173ms | 736ms | 736ms | `P` (텍스트) | 0.000 |
| `/contact` | Desktop | 60ms | 220ms | 220ms | `P` (텍스트) | 0.000 |
| `/contact` | Mobile | 171ms | 704ms | 704ms | `P` (텍스트) | 0.000 |

**판정 (2026 기준 임계값 대비, 랩 데이터 기준)**

- **LCP**: 6개 조합 전부 "Good"(≤2.5s)이며, 가장 느린 Mobile `/` 도 0.79s로 여유가 크다. → **PASS (랩 기준)**
- **CLS**: 6개 조합 전부 0.0000(레이아웃 시프트 없음). → **PASS**
- **TTFB**: Desktop 57–75ms, Mobile 171–173ms(스로틀링 지연 150ms 포함) — 통상 기준 "Good"(≤0.8s)에 여유 있게 부합. Vercel Edge에서 `x-vercel-cache: HIT`로 서빙되고 있음을 curl로 별도 확인(엣지 캐시 적중, 오리진 왕복 없음). → **PASS**
- **FCP**: 전부 1.8s 미만. → **PASS**
- **INP**: 랩 측정 불가(상호작용 미시뮬레이션). 참고용 Long Task만 아래 별도 기재.

**주의**: 이 표는 CrUX 75th-percentile 필드 데이터가 아니라 페이지당 1회 랩 실행 결과다. Google Search Console의 실제 CWV 통과/실패 판정은 이 수치가 아니라 실사용자 28일 집계(CrUX)로 결정된다. 신생 사이트라 CrUX 데이터가 아직 없을 가능성이 높으므로, 트래픽이 쌓이는 대로 CrUX(또는 `web-vitals` JS 라이브러리를 이용한 RUM)로 반드시 재검증해야 한다.

## 페이지 무게 / 요청 수 (랩 측정)

| 페이지 | 뷰포트 | 요청 수 | 총 전송량 | DOM 요소 수 |
|---|---|---|---|---|
| `/` | Desktop | 21 | 195.0 KB | 395 |
| `/` | Mobile | 15 | 177.3 KB | 395 |
| `/services` | Desktop | 18 | 192.5 KB | 248 |
| `/services` | Mobile | 13 | 169.5 KB | 248 |
| `/contact` | Desktop | 21 | 193.6 KB | 215 |
| `/contact` | Mobile | 13 | 169.4 KB | 215 |

리소스 타입별 구성(홈페이지 Desktop 기준, 총 195KB): Script 113.6KB(약 58%), Font 31.7KB(Outfit woff2, self-host), Document(HTML) 13.6KB, Stylesheet 8.9KB, Fetch/RSC payload 27.6KB. **이미지 전송량은 0KB**(아래 참고).

DOM 요소 수는 215~395개로 INP 위험 임계선(1,500개)에 크게 못 미쳐 문제 없음.

## 상세 발견 사항

### 1. (Medium) 배포본에 실사진이 전혀 없어 향후 LCP 리스크 미검증 상태
- 6개 페이지 전체에서 `<img>` 태그가 **0개** 발견되었다(`document.images.length === 0`). 로컬 저장소(`company/components/hero-slideshow.tsx` 등, 커밋되지 않은 작업본)에는 `next/image`(`priority`, `sizes="100vw"`, 한국어 alt) 기반 히어로 이미지가 이미 구현돼 있으나 **현재 배포본에는 반영되어 있지 않다**(이미지 파일 자체도 확인 결과 404). 이 내용은 `findings/images.md`에서 더 자세히 다룬다.
- 성능 관점에서의 함의: 현재는 이미지가 없어 LCP 요소가 전부 텍스트(`H1`/`P`)이고 그 덕에 LCP가 매우 빠르지만(0.2~0.8s), 이는 "콘텐츠가 없어서 빠른" 상태이지 최적화된 상태가 아니다. 실사진이 배포되는 순간이 이 사이트의 **진짜 LCP 최적화 시험대**가 된다.
- **권고**: 히어로 이미지 배포 시 반드시 (a) WebP/AVIF, (b) `next/image` + `priority`(현재 로컬 구현대로), (c) `fetchpriority="high"` 자동 부여 확인, (d) 배포 직후 이 스크립트로 재측정하여 LCP가 2.5s 임계값 내에 있는지 검증할 것. 지금 로컬 구현 패턴을 그대로 유지하면 리스크는 낮다.

### 2. (Medium) Pretendard 본문 폰트가 서드파티 CDN(jsDelivr)에서 렌더 차단 방식으로 로드되며 preconnect 힌트가 전혀 없음
- `app/layout.tsx`에서 `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@1.3.9/dist/web/static/pretendard.min.css">`를 `<head>`에 직접 삽입하고 있다. 6개 페이지 전부에서 `<link rel="preconnect">` 또는 `<link rel="dns-prefetch">`가 **단 한 건도** 발견되지 않았다.
- 영향: 브라우저는 HTML을 파싱해 이 `<link>`를 발견한 시점에야 `cdn.jsdelivr.net`에 대한 DNS 조회 → TCP 연결 → TLS 핸드셰이크를 새로 시작한다. 자사 도메인(Vercel Edge)에 이미 연결된 상태에서 완전히 새로운 origin에 대한 왕복이 추가되는 구조라, 특히 DNS 응답이 느린 지역/네트워크(모바일 3G/LTE, 해외망 등)에서는 렌더 차단 스타일시트 하나 때문에 수백 ms가 추가될 수 있다. 이번 랩 측정(같은 리전, 빠른 네트워크)에서는 이 비용이 표면화되지 않았지만 실사용자 환경에서는 재현될 가능성이 높다.
- 추가로 해당 `<link>`에 `crossorigin` 속성이 없어 이 스타일시트는 "no-cors" 모드로 로드된다(jsDelivr 응답 자체는 `Access-Control-Allow-Origin: *`를 보내고 있음을 curl로 확인했으나, `crossorigin` 속성 부재로 브라우저가 CORS 모드로 요청하지 않음). 기능상 문제는 없지만 이 스타일시트 안의 `@font-face` 규칙은 JS(CSSOM)로 읽을 수 없어 자동 진단 도구가 폰트 상태를 놓치기 쉽다(본 조사에서도 Pretendard `font-display` 값은 JS가 아니라 curl로 원본 CSS를 가져와 직접 확인해야 했다 — 값은 `swap`으로 정상).
- **권고 (우선순위 순)**:
  1. 최선: Outfit과 동일하게 `next/font/local`로 Pretendard를 셀프 호스팅한다. 그러면 자동 서브셋팅·자동 preload·서드파티 origin 제거·`size-adjust` 기반 CLS 방지까지 한 번에 해결된다.
  2. 차선(즉시 적용 가능한 저비용 수정): `<head>`에 `<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>` 한 줄만 추가해도 DNS/TCP/TLS 왕복을 렌더링 파이프라인 밖으로 미리 빼낼 수 있다.

### 3. (Low/Info) 폰트 프리로드·표시 전략 자체는 우수함
- Outfit(제목용): `next/font/google`을 통해 self-host, `display: "swap"`, `<head>`에 `<link rel="preload" as="font" crossorigin>` 자동 삽입 확인, `size-adjust` 기반 `"Outfit Fallback"`(로컬 Arial 메트릭 매칭) 폴백까지 Next.js가 자동 생성 — 이것이 CLS 0.0000의 핵심 근거 중 하나다.
- Pretendard(본문용): jsDelivr에서 제공하는 CSS 자체는 8개 폰트 웨이트 전부 `font-display: swap`으로 선언되어 있어(curl로 원본 CSS 확인) FOIT(보이지 않는 텍스트) 위험은 없다. 다만 위 2번 항목의 preconnect 부재 문제는 별개로 남아있다.

### 4. (Info) 렌더 차단 리소스는 사실상 최소 수준 — 오탐 주의
- `<script src=".../polyfills-....js" noModule>`가 발견되지만 `noModule` 속성이 있어 ES 모듈을 지원하는 현대 브라우저(99%+)는 이 파일을 아예 다운로드·실행하지 않는다. 단순 정적 분석(async/defer 유무만 확인)에서는 "렌더 차단 스크립트"로 오탐될 수 있으나 실질적 영향은 없다.
- 실제 렌더 차단 리소스는 (a) Next.js 자체 CSS 번들(8.6~8.9KB, 자사 오리진, 불가피) (b) 위 2번 항목의 Pretendard CSS, 총 2건뿐이다.

### 5. (Info) JS 번들 구성 — 참고용 관찰
- 페이지당 스크립트 총량은 111~114KB로 준수한 수준이나, 그 중 두 개의 청크가 각각 54.5KB, 45.2KB로 대부분을 차지한다(나머지 라우트별 청크는 0.3~2.2KB 수준). 이 두 청크의 정확한 구성(React/Next 프레임워크 vs. `@phosphor-icons/react` 등 UI 라이브러리)은 이번 조사 범위에서 소스맵까지 들여다보지 않아 확정하지 못했다. 번들 분석(`@next/bundle-analyzer`)으로 실제 구성을 확인하고 불필요한 부분이 있다면 code-splitting을 검토할 가치가 있다.
- Mobile(4x CPU 스로틀) 측정에서만 페이지당 Long Task 2건(131~184ms)이 관찰되었고 Desktop(1x)에서는 0건이었다. CWV 실패로 이어질 수준은 아니지만, 콘텐츠·인터랙션이 늘어날수록(문의 폼 검증 로직, 캐러셀 등) INP 리스크로 전이될 수 있는 영역이니 실사용자 트래픽 확보 후 RUM(`web-vitals` 라이브러리)으로 INP를 반드시 실측할 것을 권한다.
- 홈페이지에서는 Next.js `<Link>`의 기본 프리페치 동작으로 `/about`, `/partners`, `/services`, `/why`, `/contact`용 청크가 배경에서 소량(각 0.3~2.2KB) 프리페치되는 것도 확인했다 — 정상적인 기본 동작이며 문제 아님.

## 잘 되어 있는 점 (What Works)

- **CLS 0.0000**: 6개 페이지·뷰포트 전 조합에서 레이아웃 시프트 전무. Next.js의 자동 폰트 메트릭 폴백(`size-adjust`)과 이미지 부재가 함께 작용한 결과로 보인다.
- **경량 페이지**: 페이지당 169~195KB(요청 13~21개)로 매우 가볍다. 이미지가 없다는 특수성을 감안해도 스크립트/폰트/CSS 자체의 무게가 이미 잘 관리되고 있다.
- **Vercel Edge + ISR/정적 캐싱**: 모든 페이지가 `x-vercel-cache: HIT`, `x-nextjs-prerender: 1`로 서빙됨을 확인(curl 헤더). 오리진 컴퓨트 없이 엣지에서 즉시 응답하므로 TTFB가 어느 리전에서 측정하든 구조적으로 유리하다.
- **Outfit 폰트 로딩 모범 사례**: `next/font/google` + `display: swap` + 자동 preload + 메트릭 폴백까지 이상적인 구성.
- **DOM 크기 관리 양호**: 215~395개 요소로 INP 위험 임계선(1,500개)과 거리가 멀다.
- **Long Task 최소**: Desktop 스로틀 없음 기준 Long Task 0건.

## 우선순위별 권고 요약

| 우선순위 | 조치 | 예상 효과 |
|---|---|---|
| High(배포 전 검증 필수) | 히어로 이미지 배포 시 이 리포트 방법으로 즉시 재측정 | 실제 LCP 회귀 여부 조기 발견 |
| Medium | Pretendard를 `next/font/local`로 셀프 호스팅 전환(또는 최소 `preconnect` 추가) | 서드파티 origin 왕복 제거, 렌더 차단 스타일시트 지연 감소 |
| Low | `@next/bundle-analyzer`로 54.5KB/45.2KB 청크 구성 확인 | 불필요한 코드 식별 시 초기 JS 파싱/실행 비용 절감 |
| Info | 트래픽 확보 후 CrUX/RUM(`web-vitals`)으로 필드 데이터 검증, 특히 INP | 랩 데이터의 한계를 보완, 실제 Search Console CWV 판정과 대조 |

## 측정 스크립트

Playwright/CDP 기반 자체 측정 스크립트는 다음 경로에 보관되어 있다(재실행 가능):
`/private/tmp/claude-501/-Users-ijaeseung-nepal-school/ac7e4494-3ec3-4ef3-9733-aa22d7d84687/scratchpad/measure_cwv.py`

실행 예: `python3 measure_cwv.py / /services /contact`
