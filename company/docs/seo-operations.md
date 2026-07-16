# SEO 색인·측정 운영 절차

기준일: 2026-07-16

## 배포 순서

1. 기술 기반 배포: 서버 `lang`, 정적 다국어 URL, canonical/hreflang, sitemap, robots, 스키마, 구 도메인 리디렉션, 로컬 폰트, 동의형 GA4.
2. 콘텐츠 배포: 6개 주제 × 6개 언어의 36개 글과 `llms.txt`, `llms-full.txt`.
3. 각 배포에서 `test:i18n`, `validate:blog`, `test:blog`, `test:seo`, `typecheck`, `build`를 실행한다.
4. 빌드 후 로컬 또는 프리뷰 URL에 `SEO_BASE_URL=https://preview.example.com npm run test:seo:live`를 실행한다.

## 환경변수

- `NEXT_PUBLIC_GA_MEASUREMENT_ID`: 새 GA4 웹 데이터 스트림의 `G-` 측정 ID. 방문자가 허용한 뒤에만 로드된다.
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`: Google Search Console HTML 태그의 `content` 값.
- `NEXT_PUBLIC_NAVER_SITE_VERIFICATION`: 네이버 서치어드바이저 HTML 태그의 `content` 값.
- `NEXT_PUBLIC_BING_SITE_VERIFICATION`: Bing Webmaster Tools `msvalidate.01`의 `content` 값.

토큰은 태그 전체가 아니라 `content` 값만 입력한다. 값이 없으면 해당 메타 태그를 출력하지 않는다.

## Google Search Console

1. 기존 도메인 속성 또는 `https://www.joongwoohrd.com/` URL-prefix 속성을 연다.
2. `https://www.joongwoohrd.com/sitemap.xml`을 다시 제출한다.
3. URL 검사에서 홈, `/services`, `/visa`, 각 비자 허브와 아래 핵심 글을 우선 검사한다.
4. 라이브 URL 테스트가 정상일 때만 색인 생성을 요청한다.
5. `페이지 색인 생성`, `HTTPS`, `코어 웹 바이탈`, `리치 결과` 보고서를 주 1회 확인한다.

우선 검사 글은 한국어 6개와 각 언어 인덱스다. 대표 URL은 `/blog/e9-vs-e7-hiring-guide`, `/blog/foreign-worker-hiring-checklist`, `/blog/japan-ssw-nepal-hiring-guide`, `/blog/e9-employer-permit-checklist`, `/blog/ssw-care-employer-support-checklist`, `/blog/ssw-accommodation-hiring-guide`다.

## 네이버·Bing 등록

1. 네이버 서치어드바이저에 `https://www.joongwoohrd.com` 사이트를 추가하고 HTML 태그 인증 토큰을 환경변수에 입력한다.
2. Bing Webmaster Tools에서 사이트를 추가하고 `msvalidate.01` 토큰을 환경변수에 입력한다.
3. 재배포 후 각 도구에서 소유권을 확인하고 동일 사이트맵을 제출한다.
4. 인증이 끝나도 환경변수는 유지한다. 토큰을 저장소에 직접 커밋하지 않는다.

## 배포 후 확인

- 구 Vercel 호스트의 임의 경로가 정식 `www`의 동일 경로로 307/308 영구 이동하는지 확인한다. 별도 Vercel 프로젝트가 구 호스트를 소유하면 그 프로젝트에도 리디렉션 전용 배포가 필요하다.
- apex가 `www`로 영구 이동하는지 확인한다.
- 홈의 Organization/WebSite/FAQPage, 서비스·비자 허브의 Service, 글의 BlogPosting을 Rich Results Test와 Schema Markup Validator로 확인한다.
- 모바일 360px, 390px, 768px에서 헤더, 표 가로 스크롤, 동의 배너와 글 본문을 확인한다.
- 동의 전 `googletagmanager.com` 요청이 0인지, 허용 후 한 번 로드되고 각 이벤트가 중복되지 않는지 브라우저 네트워크/GA4 DebugView에서 확인한다.
- GA4 이벤트: `cta_clicked`, `language_changed`, `visa_content_viewed`, `article_read`, `official_source_clicked`; 웹 바이탈: LCP, INP, CLS.

## 4주·8주·12주 기록

각 시점에 다음 값을 `docs/seo-index-monitor.csv`에 기록한다.

- 사이트맵 제출/읽음 상태와 색인 URL 수
- 노출 쿼리 수, 클릭, 노출, CTR, 평균 게재순위
- 언어별 유기적 세션과 핵심 이벤트
- 상위 노출 페이지와 중복/크롤 제외 사유
- Google, ChatGPT, Perplexity의 인용 여부

특정 순위 상승은 보장 지표가 아니다. 정확한 색인 신호, 공식 출처 인용, 측정의 일관성을 성공 기준으로 사용한다.
