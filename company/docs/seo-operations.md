# SEO 색인·측정 운영 절차

기준일: 2026-07-16

## 배포 순서

1. 기술 기반 배포: 서버 `lang`, 정적 다국어 URL, canonical/hreflang, sitemap, robots, 스키마, 구 도메인 리디렉션, 로컬 폰트, 동의형 GA4·PostHog.
2. 콘텐츠 배포: 6개 주제 × 6개 언어의 36개 글과 `llms.txt`, `llms-full.txt`.
3. 각 배포에서 `test:i18n`, `validate:blog`, `test:blog`, `test:seo`, `typecheck`, `build`를 실행한다.
4. 빌드 후 로컬 또는 프리뷰 URL에 `SEO_BASE_URL=https://preview.example.com npm run test:seo:live`를 실행한다.

## 환경변수

- `NEXT_PUBLIC_GA_MEASUREMENT_ID`: 새 GA4 웹 데이터 스트림의 `G-` 측정 ID. 방문자가 허용한 뒤에만 로드된다.
- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`: PostHog 프로젝트의 공개 `phc_` 토큰. 개인 API 키(`phx_`)를 넣지 않는다. 방문자가 허용한 뒤에만 로드된다.
- `NEXT_PUBLIC_POSTHOG_HOST`: PostHog 수집 호스트. US Cloud는 `https://us.i.posthog.com`, EU Cloud는 `https://eu.i.posthog.com`을 사용한다.
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`: Google Search Console HTML 태그의 `content` 값.
- `NEXT_PUBLIC_NAVER_SITE_VERIFICATION`: 네이버 서치어드바이저 HTML 태그의 `content` 값.
- `NEXT_PUBLIC_BING_SITE_VERIFICATION`: Bing Webmaster Tools `msvalidate.01`의 `content` 값.

토큰은 태그 전체가 아니라 `content` 값만 입력한다. 값이 없으면 해당 메타 태그를 출력하지 않는다.

## Vercel 도메인 전환

1. Vercel의 `company` 프로젝트에서 **Settings → Domains**를 연다.
2. `jeongwoohrd.com`을 추가하고, 함께 제안되는 `www.jeongwoohrd.com`도 추가한다.
3. `www.jeongwoohrd.com`을 실제 서비스 주소로 연결하고 `jeongwoohrd.com`은 `www.jeongwoohrd.com`으로 리디렉션한다.
4. `joongwoohrd.com`과 `www.joongwoohrd.com`은 삭제하지 말고 같은 프로젝트에 유지한다. 애플리케이션의 영구 리디렉션 규칙이 두 구 호스트를 새 `www` 주소로 보낸다.
5. 외부 도메인 업체에서 DNS를 관리하면 Vercel 도메인 화면이 각 호스트에 표시하는 A/CNAME 값을 그대로 등록한다. Vercel 네임서버를 사용하면 Vercel에서 DNS를 관리한다.
6. DNS가 검증되고 새 프로덕션 배포가 완료된 뒤, 신·구 도메인의 임의 하위 경로와 쿼리가 새 `www`의 동일 URL로 308 이동하는지 확인한다.

## Google Search Console

1. 기존 `https://www.joongwoohrd.com/` URL-prefix 속성과 새 `https://www.jeongwoohrd.com/` 속성의 소유권을 모두 확인한다.
2. 새 속성에 `https://www.jeongwoohrd.com/sitemap.xml`을 제출한다.
3. 구 주소의 변경된 주소 도구를 사용할 수 있으면 새 주소로 사이트 이전을 알린다.
4. URL 검사에서 홈, `/services`, `/visa`, 각 비자 허브와 아래 핵심 글을 우선 검사한다.
5. 라이브 URL 테스트가 정상일 때만 색인 생성을 요청한다.
6. `페이지 색인 생성`, `HTTPS`, `코어 웹 바이탈`, `리치 결과` 보고서를 주 1회 확인한다.

우선 검사 글은 한국어 6개와 각 언어 인덱스다. 대표 URL은 `/blog/e9-vs-e7-hiring-guide`, `/blog/foreign-worker-hiring-checklist`, `/blog/japan-ssw-nepal-hiring-guide`, `/blog/e9-employer-permit-checklist`, `/blog/ssw-care-employer-support-checklist`, `/blog/ssw-accommodation-hiring-guide`다.

## 네이버·Bing 등록

1. 네이버 서치어드바이저에 `https://www.jeongwoohrd.com` 사이트를 추가하고 HTML 태그 인증 토큰을 환경변수에 입력한다.
2. Bing Webmaster Tools에서 사이트를 추가하고 `msvalidate.01` 토큰을 환경변수에 입력한다.
3. 재배포 후 각 도구에서 소유권을 확인하고 동일 사이트맵을 제출한다.
4. 인증이 끝나도 환경변수는 유지한다. 토큰을 저장소에 직접 커밋하지 않는다.

## 배포 후 확인

- 구 Vercel 호스트와 `joongwoohrd.com`, `www.joongwoohrd.com`의 임의 경로가 새 정식 `www`의 동일 경로로 308 영구 이동하는지 확인한다. 별도 Vercel 프로젝트가 구 호스트를 소유하면 그 프로젝트에도 리디렉션 전용 배포가 필요하다.
- apex가 `www`로 영구 이동하는지 확인한다.
- 홈의 Organization/WebSite/FAQPage, 서비스·비자 허브의 Service, 글의 BlogPosting을 Rich Results Test와 Schema Markup Validator로 확인한다.
- 모바일 360px, 390px, 768px에서 헤더, 표 가로 스크롤, 동의 배너와 글 본문을 확인한다.
- 동의 전 `googletagmanager.com` 및 PostHog 수집 호스트 요청이 0인지, 허용 후 각 도구가 한 번만 초기화되는지 브라우저 네트워크/GA4 DebugView/PostHog Live Events에서 확인한다.
- GA4와 PostHog는 `cta_clicked`, `language_changed`, `visa_content_viewed`, `article_read`, `official_source_clicked`, 페이지뷰와 웹 바이탈(LCP, INP, CLS)을 함께 받는다. PostHog의 자동 클릭 수집·히트맵은 비활성화한다. 세션 리플레이는 동의 후에만 시작하며, 화면 텍스트·입력값을 가리고 네트워크 요청의 본문·헤더는 기록하지 않는다.
- 페이지뷰는 앱이 직접 전송한다. GA4 웹 데이터 스트림에서 브라우저 히스토리 기반 페이지 변경 자동 측정을 함께 켜면 중복될 수 있으므로, 출시 전 경로 이동마다 도구별 페이지뷰가 한 번인지 확인한다.

## 4주·8주·12주 기록

각 시점에 다음 값을 `docs/seo-index-monitor.csv`에 기록한다.

- 사이트맵 제출/읽음 상태와 색인 URL 수
- 노출 쿼리 수, 클릭, 노출, CTR, 평균 게재순위
- 언어별 유기적 세션과 핵심 이벤트
- 상위 노출 페이지와 중복/크롤 제외 사유
- Google, ChatGPT, Perplexity의 인용 여부

특정 순위 상승은 보장 지표가 아니다. 정확한 색인 신호, 공식 출처 인용, 측정의 일관성을 성공 기준으로 사용한다.
