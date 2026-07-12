# GEO(생성형 검색 최적화) 감사 보고서
**대상**: https://company-iota-murex.vercel.app (정우인재개발원 / Joong Woo HRD)
**감사일**: 2026-07-12
**대상 페이지**: `/`, `/services`, `/about`, `/partners`, `/why`, `/contact` (라이브) + `/visa/*` (로컬 미배포, 참고용 분석)

---

## 0. 요약 — GEO 준비도 점수: **44 / 100**

| 항목 | 가중치 | 점수 | 코멘트 |
|---|---|---|---|
| 인용가능성 (Citability) | 25% | 35/100 | 홈 FAQ 1개 섹션 외엔 직접답변형 구조·통계·출처 병기 거의 없음 |
| 구조적 가독성 (Structural Readability) | 20% | 58/100 | H1~H3 위계는 정상. 질문형 헤딩·정의문단 부족 |
| 멀티모달 콘텐츠 (Multi-Modal) | 15% | 12/100 | 실사진 없음(플레이스홀더 박스), 영상·인포그래픽·유튜브 전무 |
| 권위·브랜드 신호 (Authority) | 20% | 26/100 | Organization 스키마는 있으나 `sameAs` 비어있음, 외부 프로필 0개, 실명 인증된 파트너 데이터 미노출 |
| 기술적 접근성 (Technical) | 20% | 83/100 | SSR 완전 지원, robots.txt 정상, X-Robots-Tag/noai 없음. llms.txt만 누락 |

가중합산: 0.25×35 + 0.20×58 + 0.15×12 + 0.20×26 + 0.20×83 = **43.95 ≈ 44/100**

**한 줄 진단**: 이 사이트는 "크롤러가 못 들어오는" 문제가 아니라 "들어와도 인용할 만한 자기완결적 콘텐츠가 부족한" 문제다. 기술 인프라(SSR, robots.txt, 사이트맵)는 이미 AI 크롤러 친화적으로 잘 구성되어 있고, 로컬 저장소에는 이 문제를 정확히 겨냥한 `/visa/*` 비자 정보 섹션(FAQPage+BreadcrumbList 스키마, 출처·기준일 병기)이 이미 구현되어 있으나 **아직 배포되지 않았다**. 최우선 조치는 새 콘텐츠 제작이 아니라 이미 만들어진 것의 배포다.

---

## 1. AI 크롤러 접근 상태

```
User-Agent: *
Allow: /

User-Agent: GPTBot
User-Agent: OAI-SearchBot
User-Agent: ChatGPT-User
User-Agent: ClaudeBot
User-Agent: PerplexityBot
User-Agent: Google-Extended
Allow: /

Sitemap: https://company-iota-murex.vercel.app/sitemap.xml
```
(생성 소스: `company/app/robots.ts`)

| 크롤러 | 상태 | 비고 |
|---|---|---|
| GPTBot | ✅ 허용 | |
| OAI-SearchBot | ✅ 허용 | |
| ChatGPT-User | ✅ 허용 | |
| ClaudeBot | ✅ 허용 | |
| PerplexityBot | ✅ 허용 | |
| Google-Extended | ✅ 허용 | AI Overviews/Gemini 학습·인용 대상 |
| CCBot / anthropic-ai / cohere-ai | 명시 규칙 없음(전체 허용 `*`에 포함) | 학습 전용 크롤러 차단은 선택사항 — 현재는 열려 있음. 정책 결정 필요 시 별도 차단 가능 (Low, 선택) |

**추가 확인**:
- 전 페이지 `curl -sI` 결과 `X-Robots-Tag` 헤더 없음 — 헤더 레벨 차단 없음.
- `<meta name="robots">` 태그는 정상 페이지(`/`, `/services`, `/about`, `/partners`, `/why`, `/contact`) 어디에도 없음(기본값 indexable) — `noai`/`noimageai` 등 차단 지시자 전무. 404 페이지에만 `noindex`가 정상적으로 붙어 있음(의도된 동작).
- HTTPS + HSTS(`max-age=63072000; includeSubDomains; preload`) 적용.

**결론**: 크롤러 허용 설정은 모범적이다. 감점 요인이 아니다.

---

## 2. llms.txt 상태: **누락 (404)**

```
curl -sI https://company-iota-murex.vercel.app/llms.txt
→ HTTP/2 404
```

`company/public/` 디렉터리에도 `llms.txt` 파일이 존재하지 않는다. RSL(Really Simple Licensing) 1.0 관련 태그(`<link rel="license" type="application/rsl+xml">` 등)도 발견되지 않았다.

llms.txt는 아직 비공식 제안 단계 표준이라 없다고 감점 폭이 크지는 않지만, 신생 기업(2026-06 설립)으로서 도메인 자체의 신뢰 신호(백링크, 도메인 나이)가 전무한 상황에서는 AI 에이전트에게 "이 사이트가 무엇을 하는 곳인지"를 명시적으로 알려주는 저비용 채널로서 가치가 크다. 아래 3장 부록에 한국어 초안을 제공한다.

---

## 3. 페이지별 인용가능성(Citability) 분석

`scripts/render_page.py --mode auto`로 렌더링 후 `extracted_text`(trafilatura 보일러플레이트 제거)를 기준으로 측정. 모든 페이지 `is_spa: false` — 완전 SSR, JS 없이도 본문이 초기 HTML에 존재함(2줄 다른 방식으로 교차검증: `homepage-render.json`의 `content`와 `raw_content`가 동일).

| 페이지 | 본문 단어수(추정) | 직접답변 Q&A 구조 | 통계+출처 병기 | 자기완결형 인용 단락 |
|---|---|---|---|---|
| `/` (홈) | ~320 (nav/footer 제외) | ✅ FAQ 5문항 있음(`faq-section.tsx`) | ✗ | 부분적 (FAQ 답변만) |
| `/services` | ~315 | ✗ | ✗ | ✗ (태그라인 반복) |
| `/about` | ~295 | ✗ | ✗ | ✗ |
| `/partners` | ~269 | ✗ | ✗ | ✗ (카테고리 나열만, 기관 실명 있으나 검증 근거 없음) |
| `/why` | ~287 | ✗ | ✗ (원칙만 선언, 실제 출처·기준일 병기 사례 없음) | ✗ |
| `/contact` | ~253 | ✗ | 해당없음 | 해당없음 |

**핵심 문제**:
1. **콘텐츠가 전체적으로 얇다.** 6개 페이지 모두 250~320단어 수준으로, 대부분 마케팅 태그라인(예: "인재는 보내는 게 아니라 키우는 것")이며 이 문구가 `/`과 `/services`에 그대로 반복된다. AI 검색엔진이 인용할 만한 "134~167단어 자기완결형 단락"에 해당하는 콘텐츠가 사실상 존재하지 않는다.
2. **질문형 헤딩이 홈 FAQ 1곳 뿐.** 나머지 H2/H3는 전부 선언형/영문 슬로건("Shaping Global Talent", "From Training to Settlement")이라 "네팔 인력 채용 어떻게 하나요?" 류의 자연어 질의와 헤딩 텍스트 매칭이 약하다.
3. **통계·수치가 의도적으로 없음.** `/about`, `/`, `/services`에 반복되는 문구: *"객관 지표만 표기합니다. 정우인재개발원은 2026년 6월 설립된 신생 기업으로, 검증할 수 없는 자사 실적 수치(취업자 수·순위 등)는 원칙적으로 표기하지 않습니다."* — 이는 신뢰도 측면에서 올바른 태도이며 **가짜 지표를 넣으라는 권고는 하지 않는다.** 다만 GEO 관점에서는 "인용할 숫자가 없다"는 뜻이므로, 검증 가능한 제3의 숫자(정부 통계, 공식 고시 수치, 파트너 기관 등록번호 등)로 그 공백을 메워야 한다 — 5장 참고.
4. **`/why` 페이지의 약속이 라이브 콘텐츠에 반영되어 있지 않음.** `/why`는 "모든 제도 설명에는 정부·공식 출처와 기준일을 병기합니다"라고 명시하지만, 정작 라이브 사이트에는 그 "제도 설명" 자체(비자별 상세 페이지)가 없다. 이 약속을 지키는 콘텐츠는 이미 로컬에 존재한다 (`/visa/*`, 아래 4장).

---

## 4. [최우선 발견] 로컬 저장소에 이미 구현된 `/visa` 섹션 — 미배포 상태

`git status`에서 다음이 추적되지 않은 상태로 확인됨:
```
?? company/app/visa/            (허브 + 9개 상세 페이지: e-9, e-7, e-8, d-2-d-4,
                                  tokutei-ginou, tokutei-ginou-kaigo,
                                  tokutei-ginou-shukuhaku, ikusei-shuro)
?? company/components/visa/     (faq-list, visa-schema, visa-glance, visa-process,
                                  related-visas, visa-disclaimer)
?? company/lib/visas.ts         (비자 데이터 단일 출처)
 M company/lib/nav.ts           ("비자 정보" 메뉴 항목 추가 — 아직 라이브에 없음)
 M company/app/sitemap.ts       (/visa, /visa/[slug] 라우트 추가 — 아직 라이브에 없음)
```

이 미배포 코드를 검토한 결과, 이번 감사에서 지적한 인용가능성 문제 대부분을 정확히 해결하도록 설계되어 있다:

- **질문형 헤딩 + 직접답변**: 비자별로 4~6개 FAQ, 각 답변이 첫 문장에서 바로 결론을 제시(예: "*내국인 구인노력(워크넷 구인 등)을 먼저 거친 뒤 관할 고용센터에 고용허가를 신청합니다.*").
- **FAQPage + BreadcrumbList JSON-LD**: `components/visa/visa-schema.tsx`가 화면 아코디언과 동일한 데이터 배열에서 스키마를 생성 — 콘텐츠와 스키마가 항상 동기화됨.
- **통계 + 출처 + 기준일 병기**: 예) *"수용상한 126,900명 (2026년 1월 각의결정 운용방침 기준)"*, *"개호기능시험 합격률은 대체로 70%대... (2025~2026년 MHLW 공표 기준)"*. `/why`가 선언한 원칙을 실제로 지키는 콘텐츠.
- **비교표**: `/visa` 허브 페이지에 E-9 vs 특정기능1호 vs 육성취로 비교표 — AI가 표 형태로 그대로 추출·인용하기 좋은 구조.
- **연도별 변동 수치 배제 원칙 준수**: 쿼터·임금처럼 매년 바뀌는 수치는 싣지 않고 구조·절차 중심 서술 + 위 두 사례처럼 "각의결정 기준일"이 명시된 수치만 포함 — 정확성 리스크 관리가 되어 있음.

**권고**: 이 브랜치를 커밋·배포하는 것이 이번 감사에서 나올 수 있는 단일 조치 중 ROI가 가장 높다. 이미 코드가 완성되어 있으므로 추가 리소스는 배포 전 사실 검증(특히 법무부·출입국재류관리청 수치의 최신성 재확인)과 QA 정도다. (Effort: Low, Impact: Very High)

---

## 5. 권위·브랜드 신호(Authority & Brand Signals) 분석

### 5.1 Organization 스키마
`components/organization-schema.tsx` (전 페이지 공통 렌더):
```json
{
  "@type": "Organization",
  "name": "정우인재개발원",
  "foundingDate": "2026-06-10",
  "founder": { "@type": "Person", "name": "오제환" },
  "taxID": "684-13-02918",
  "address": { "streetAddress": "..." }
  // sameAs: 없음 (lib/site.ts에서 sameAs: [] 로 비어있음)
}
```
법인명·설립일·대표자·사업자번호·주소 등 기본 엔티티 정보는 스키마로 잘 노출되고 있다. 그러나 `sameAs` 배열이 완전히 비어 있어 **외부 신원 확인 링크(공식 채널, 지도 등록 등)가 전혀 없다.**

### 5.2 브랜드 언급 상관관계 (GEO 프레임워크 기준)

| 신호 | AI 인용 상관관계 | 정우인재개발원 현황 |
|---|---|---|
| YouTube 언급 | ~0.737 (가장 강함) | 없음 — 채널·영상 콘텐츠 전무 |
| Reddit 존재 | 높음 | 없음(국내 B2B 특성상 자연스러운 공백이나, 국내 채용담당자 커뮤니티/카페 언급도 확인 안 됨) |
| Wikipedia 엔티티 | 높음 | 없음 (설립 1개월 미만 기업이라 예상된 결과) |
| Domain Rating(백링크) | ~0.266 (약함) | 도메인 신규(vercel.app 서브도메인) — 자체 도메인 이전 및 백링크 축적 필요 |
| LinkedIn | 별도 항목(Bing/Copilot 및 MS 생태계에 중요) | 없음 |

**해석**: 이 회사는 2026년 6월 설립된 신생 법인이므로 위 신호가 전무한 것 자체는 "결함"이라기보다 "생애주기상 당연한 현재 상태"에 가깝다. 다만 ChatGPT/Google AIO/Perplexity가 "정우인재개발원"이라는 개체를 신뢰 가능한 실체로 인식하려면 최소한의 외부 발자국(공식 채널 개설 + `sameAs` 연결)이 필요하며, 비용 대비 임팩트가 커서 조기에 착수할 가치가 있다.

### 5.3 [놓치고 있는 자산] 저장소 내 실제 서명 MOU 데이터가 사이트에 반영되지 않음

`/mou/README.md`(저장소 루트, 미추적 상태)에 정우인재개발원이 2026-07-05 네팔 현지 5개 기관과 체결한 MOU에 대해 **정부 공식 등록기관 조회로 검증한 상세 데이터**가 이미 정리되어 있다:

- Richhood Overseas Inc. — 네팔 OCR(회사등록청) 등록번호 28533(2004-05-31), 日 OTIT NPL003155 등재 ✅
- Sunkoshi Manpower Service — OCR 102132(1995-07-22), 네팔 DoFE 라이선스 69/052/053(원본 보유), 日 OTIT NPL003184 ✅
- Satyawati Overseas Concern — OCR 40207(2006-06-29), 日 OTIT NPL003166 ✅ (단, 설립연도 상충 이슈 ⚠️ 있음)
- Bhairav Industrial Skill(s) Hub — OCR 365265(2025-04-16) ✅ (CTEVT 인증 주장은 미확인 ⚠️ — 게시 시 제외 권장)
- Ocean Technical Institute — OCR 27018(2004-02-02), FEB 오리엔테이션 License No.18 ✅ (Richhood와 동일 대표자·인접 등록번호로 동일 소유 가능성 시사 — 게시 시 유의)

반면 현재 라이브 `/partners` 페이지는 이 중 일부(Richhood Overseas 등)를 실명으로 언급하지만 **"합법 송출 채널"이라는 서술뿐, 등록번호·정부 조회 출처·검증일 등 근거가 전혀 없다.** 이는 "객관 지표만 표기"라는 회사 원칙과도 정확히 부합하는, 이미 검증까지 끝난 콘텐츠 소스인데도 활용되지 않고 있는 사례다.

**권고**: `/mou/README.md`에서 ✅(공식 확인) 라벨이 붙은 사실만 선별해 `/partners` 페이지에 "기관명 + 등록번호 + 등록기관(OCR/OTIT/DoFE) + 확인일"의 짧은 인용 가능한 문장으로 반영한다. ⚠️(미확인·상충) 라벨이 붙은 항목(예: Bhairav의 CTEVT 인증 주장, Ocean·Richhood 동일소유 가능성)은 정책상 게시하지 않는다. (Effort: Low~Medium, Impact: High — 회사 고유의 "가짜 지표 배제" 원칙을 지키면서도 실제 검증된 권위 신호를 확보하는 유일한 방법)

---

## 6. 구조적 가독성 & 멀티모달

- **헤딩 위계**: H1(페이지당 1개) → H2 → H3 순서가 전 페이지에서 올바르게 지켜짐. `<nav aria-label="현재 위치">`로 시각적 브레드크럼이 있으나 **BreadcrumbList 구조화 데이터는 라이브 페이지에 없음**(미배포 `/visa` 섹션에만 구현됨).
- **프로세스 리스트**: 홈/사업영역 페이지의 "선발→교육→시험→매칭→계약·비자→입국→정착" 7단계가 `<ol>`로 마크업되어 있어 추출성이 좋음 — 이 부분은 잘 되어 있다.
- **이미지**: 실사진이 없고 `[ 현지 교육 현장 사진 ]`, `[ 한국 산업현장 사진 ]` 같은 placeholder 텍스트 박스만 존재(`company/README.md`의 "공개 전 확정/연동 TODO"에 이미 알려진 상태). alt 텍스트 최적화 이전에 실제 이미지 자체가 없음.
- **영상/인포그래픽**: 전무. 프로세스 다이어그램, 비자 비교 인포그래픽 등으로 전환 가능한 콘텐츠(7단계 프로세스, 비자 비교표)가 이미 텍스트로는 존재하므로 시각 자산화 우선순위가 높음.
- **다국어**: `EN/JA/VI/NE` 언어 스위처가 UI에 노출되어 있으나 전부 `disabled`(준비 중) 처리됨. `hreflang` 태그 없음 — 현재는 단일 언어(ko)이므로 정합성 문제는 없으나, 실제 채용 의사결정권자 상당수가 접하는 일본어 특정기능 검색 트래픽을 전혀 잡지 못하고 있음.

---

## 7. 기술적 접근성 (SSR vs CSR)

- `render_page.py --mode auto` 결과 전 페이지 `is_spa: false`, `mode_used: raw` — Playwright 렌더링 없이도 원본 HTML(`raw_content`)과 JS 실행 후 콘텐츠(`content`)가 동일. **완전한 서버 사이드 렌더링(Next.js App Router 정적/증분 프리렌더)**.
- Vercel 엣지 캐시(`x-vercel-cache: HIT`, `x-nextjs-prerender: 1`) — TTFB 최소화, AI 크롤러의 타임아웃/렌더 예산 문제로부터 자유로움.
- `canonical` 태그 전 페이지 정상.
- `sitemap.xml` 정상 응답, 6개 URL 등록(단 `/visa/*` 라우트는 로컬 `sitemap.ts`에만 추가되어 있고 라이브에는 미반영).
- 유일한 감점 요인은 llms.txt 부재(2장) 뿐.

**결론**: 기술적 접근성은 이 사이트의 가장 강한 영역이다. Next.js SSR을 그대로 활용하고 있어 CSR 이슈로 인한 AI 크롤러 콘텐츠 누락 위험이 없다.

---

## 8. 플랫폼별 예상 가시성 (정성적 추정)

DataForSEO 등 실측 도구 연동 없이, 위 정성 신호를 기반으로 한 상대적 추정치다.

| 플랫폼 | 추정 점수 | 근거 |
|---|---|---|
| Google AI Overviews | 30~35/100 | 신규 도메인·백링크 0에 가까움(DR 상관 0.266 감안해도 영향), Organization 스키마는 있으나 sameAs 부재로 Knowledge Graph 연결 약함. E-E-A-T 관점에서 저자·경력 정보(`대표·핵심 인력 약력 입력 예정`)도 공석. |
| ChatGPT (검색/브라우징) | 30/100 | 홈 FAQ는 GPTBot이 크롤링 가능하나 FAQPage 스키마 부재로 구조 파싱에 불리. llms.txt 부재. `/visa` 배포 시 큰 폭 개선 예상. |
| Perplexity | 30/100 | PerplexityBot 크롤링은 허용되어 있으나(1장), 실시간 인용 특성상 "특정 수치+출처" 콘텐츠가 있어야 인용됨 — 현재 라이브 콘텐츠엔 인용할 수치가 거의 없음. |
| Bing Copilot | 25~30/100 | Bing/LinkedIn 생태계 신호(LinkedIn 회사 페이지 등) 전무. Bing 웹마스터 도구/IndexNow 연동 여부 미확인. |

**공통 병목**: 4개 플랫폼 모두에서 점수를 누르는 요인은 크롤러 차단이 아니라 (1) 도메인/브랜드 신뢰 신호 부족, (2) 인용 가능한 자기완결형 답변 부족 — 이 둘이다. 이미 언급한 "11%만이 ChatGPT와 Google AI Overviews 양쪽에 동시 인용된다"는 통계를 감안하면, 이 사이트는 두 플랫폼 모두를 겨냥한 범용 최적화(FAQPage 스키마, 명확한 정의문, 출처 병기)를 우선하고 이후 플랫폼별 미세조정을 하는 것이 합리적이다.

**한국어 쿼리별 코멘트**:
- **"네팔 인력 채용"**: `/services`, `/partners`에 관련 내용은 있으나 "네팔 인력 채용 절차"를 묻는 질의에 바로 매칭되는 H2/단락이 없음. `/visa` 배포 + "네팔 인력 채용 방법" 류의 질문형 H2 추가 필요.
- **"특정기능 비자 인력"**: 로컬 미배포 `tokutei-ginou`, `tokutei-ginou-kaigo`, `tokutei-ginou-shukuhaku` 페이지가 정확히 이 쿼리를 겨냥해 만들어져 있음 — 배포만 하면 즉시 대응 가능.
- **"외국인 근로자 송출업체"**: 현재 `/partners`가 가장 근접하나 "송출업체"라는 표현 자체가 페이지 텍스트에 없고 카테고리 설명("네팔 해외고용(송출) 기관")만 있음. 정확한 쿼리 매칭을 위해 "송출업체", "송출기관" 등 실제 검색어 동의어를 본문에 자연스럽게 포함 필요.

---

## 9. Top 5 우선순위 개선 사항

| 순위 | 조치 | 예상 임팩트 | 소요(Effort) |
|---|---|---|---|
| 1 | **로컬에 이미 구현된 `/visa` 섹션(허브+9개 상세, FAQPage+BreadcrumbList 스키마 포함) 배포** — `lib/nav.ts`, `app/sitemap.ts` 변경분 포함 커밋 후 릴리즈 | Very High | Low (배포 전 최신 법령·수치 재검증만 필요) |
| 2 | **홈페이지 기존 FAQ(`faq-section.tsx`)에 FAQPage JSON-LD 추가** — `visa-schema.tsx`와 동일 패턴 재사용, 콘텐츠는 이미 있음 | High | Low (반나절 이내) |
| 3 | **`llms.txt` 게시** — 본 보고서 부록 초안을 `company/public/llms.txt`에 배치 | Medium | Low |
| 4 | **`/mou/README.md`의 검증된(✅) 파트너 등록번호·출처를 `/partners` 페이지에 반영**, 미확인(⚠️) 항목은 게시 제외 | High | Medium (사실 선별·문구 작성 필요) |
| 5 | **`sameAs` 및 외부 엔티티 발자국 최소 1~2개 확보** — 회사 공식 채널(네이버 블로그/포스트, 유튜브, LinkedIn 회사 페이지 중 우선순위 선정) 개설 후 `lib/site.ts`의 `sameAs` 배열에 연결 | Medium~High(시간이 지날수록 상관관계 ~0.737까지 성장) | Medium (외부 채널 신규 개설·운영 필요) |

부가 권고(우선순위 6+): 실사진으로 placeholder 이미지 교체(멀티모달 점수 개선), 7단계 프로세스·비자 비교표를 인포그래픽/이미지로 시각화, `/services`·`/`의 반복 태그라인 페이지별 차별화, 일본어(JA) 버전 우선 활성화(특정기능 관련 검색 트래픽 대응).

---

## 10. 부록 — 권장 llms.txt 초안 (한국어)

```
# 정우인재개발원 (Joong Woo HRD)

> 네팔·베트남 인재를 현지 직업훈련부터 양성해 한국·일본 기업에 합법적으로 연결하는
> 글로벌 인적자원 개발 기업입니다. 한국 취업비자(E-9·E-7·D-2·D-4·계절근로 E-8),
> 일본 특정기능 1호(개호·숙박) 채용을 지원합니다.

정우인재개발원(JOONG WOO HRD, 법인명 Joong Woo Human Resource Development Institute,
사업자등록번호 684-13-02918)은 2026년 6월 설립되었으며 경기도 용인시에 본사를 둔
외국인력 채용·양성 전문기업입니다. 네팔·베트남 현지 교육기관·해외고용(송출) 기관과의
파트너십을 통해 "선발 → 교육 → 시험 → 매칭 → 계약·비자 → 입국 → 정착"의 7단계
원스톱 구조로 한국·일본 기업의 외국인력 채용을 지원합니다.

신생 기업으로서 검증되지 않은 자사 실적 수치(취업자 수·순위 등)는 원칙적으로
표기하지 않으며, 제도 관련 설명에는 정부·공식 출처와 기준일을 병기하는 것을
원칙으로 합니다.

## 회사 소개
- [회사소개](https://company-iota-murex.vercel.app/about): 대표자, 사업자 정보, 협력 국가·기관 현황
- [신뢰·전문성](https://company-iota-murex.vercel.app/why): 제도·법규 전문성 원칙과 검증 기준

## 사업영역
- [사업영역](https://company-iota-murex.vercel.app/services): 네팔 직업훈련학교·한국 취업비자·일본 특정기능 3대 사업 및 7단계 프로세스
- [비자 정보](https://company-iota-murex.vercel.app/visa): 한국(E-9·E-7·D-2·D-4·E-8)·일본(특정기능1호·개호·숙박·육성취로) 비자별 요건·절차·FAQ

## 파트너십
- [파트너십](https://company-iota-murex.vercel.app/partners): 네팔·베트남·한국 협력 기관(송출·교육·산업 단체) 목록

## 문의
- [문의](https://company-iota-murex.vercel.app/contact): 채용·제휴 문의

## Optional
- 전화번호·이메일 등 상세 연락처는 확정 후 게시 예정입니다.
- 다국어(영어·일본어·베트남어·네팔어) 버전은 준비 중입니다.
```

---

## 부록 B — 확인한 명령/결과 요약 (재현용)

```bash
curl -sI https://company-iota-murex.vercel.app/            # 200, X-Robots-Tag 없음
curl -s  https://company-iota-murex.vercel.app/robots.txt   # AI 크롤러 전부 Allow
curl -sI https://company-iota-murex.vercel.app/llms.txt     # 404
curl -s  https://company-iota-murex.vercel.app/sitemap.xml  # 6개 URL, /visa 미포함
python3 scripts/render_page.py <URL> --mode auto --json     # 전 페이지 is_spa:false
```
