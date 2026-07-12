# Schema.org 구조화 데이터 감사 — company-iota-murex.vercel.app (정우인재개발원)

감사 대상: 배포된 라이브 페이지 `/`, `/about`, `/contact`, `/partners`, `/services`, `/why` (사전 크롤 HTML 기준)
+ 소스코드 대조: `/Users/ijaeseung/nepal-school/company` (Next.js 15, App Router)

---

## 0. 요약

라이브 사이트에는 **`Organization` JSON-LD 1개만** 모든 페이지에 공통 렌더링되어 있고, 그 외 스키마(WebSite, BreadcrumbList, Service, FAQPage 등)는 **전무**합니다. 반면 로컬 소스코드에는 이미 `BreadcrumbList` + `FAQPage` + `ItemList`를 갖춘 `/visa` 섹션(비자 허브 + 상세 8페이지)이 상당히 잘 구현되어 있으나, **아직 커밋·배포되지 않아** 실제 사이트에서는 `/visa` 요청 시 404가 반환됩니다(`page_visa.html` = "404: This page could not be found."). 즉, 이번 감사에서 가장 시급한 항목은 새 스키마를 "만드는" 것이 아니라 **이미 만들어진 것을 배포하는 것**입니다.

---

## 1. 탐지 결과 (라이브 페이지, 크롤 HTML 기준)

| 페이지 | JSON-LD 블록 수 | 타입 | 비고 |
|---|---|---|---|
| `/` | 1 | `Organization` | |
| `/about` | 1 | `Organization` | |
| `/contact` | 1 | `Organization` | |
| `/partners` | 1 | `Organization` | |
| `/services` | 1 | `Organization` | |
| `/why` | 1 | `Organization` | |
| `/visa` | — | — | **404** (미배포, 로컬 소스만 존재) |

- Microdata(`itemscope`/`itemprop`), RDFa(`vocab="https://schema.org"`) 형식은 6개 페이지 전체에서 **검출되지 않음** — JSON-LD 단일 방식 사용은 올바른 선택입니다.
- 6개 페이지의 `Organization` 블록은 **완전히 동일한 내용**이며 `app/layout.tsx`에서 `<OrganizationSchema />`로 1회 렌더 후 모든 하위 페이지에 전파되는 구조입니다(`company/app/layout.tsx:53`).

### 배포된 Organization JSON-LD (원문, `/` 기준)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "정우인재개발원",
  "legalName": "Joong Woo Human Resource Development Institute",
  "alternateName": "JOONG WOO HRD",
  "url": "https://company-iota-murex.vercel.app",
  "logo": "https://company-iota-murex.vercel.app/opengraph-image",
  "image": "https://company-iota-murex.vercel.app/opengraph-image",
  "description": "네팔·베트남 인재를 현지 직업훈련부터 양성해 한국·일본 기업에 합법적이고 안정적으로 연결합니다. 교육 → 시험 → 매칭 → 비자 → 정착까지 원스톱.",
  "foundingDate": "2026-06-10",
  "founder": { "@type": "Person", "name": "오제환" },
  "knowsLanguage": ["ko", "en", "ja", "vi", "ne"],
  "areaServed": [
    { "@type": "Country", "name": "네팔" },
    { "@type": "Country", "name": "베트남" },
    { "@type": "Country", "name": "한국" },
    { "@type": "Country", "name": "일본" }
  ],
  "taxID": "684-13-02918",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "경기도 용인시 기흥구 구갈로28번길 21-6, 금보빌딩 6층 6034호",
    "addressCountry": "KR"
  }
}
```

> **참고**: 위 배포본은 `베트남`을 언급하지만, 로컬 `company/lib/site.ts`와 `company/components/organization-schema.tsx`는 이미 `베트남`을 제거한 버전으로 수정되어 있습니다(`git diff` 확인, 미커밋 상태). 즉 다음 배포 시 `description`·`areaServed`·`knowsLanguage`가 네팔 단독 서사로 자동 갱신됩니다. 이는 스키마 오류가 아니라 **배포 지연** 이슈이므로, `/visa` 섹션과 함께 다음 배포에 반드시 포함해야 사이트 카피(제목·OG·FAQ)와 구조화 데이터 간 불일치가 사라집니다.

---

## 2. 검증 결과 (Organization 블록)

| 항목 | 결과 | 메모 |
|---|---|---|
| `@context` = `https://schema.org` | ✅ Pass | http 아님, 정확 |
| `@type` = `Organization` | ✅ Pass | 지원 종료 타입 아님 |
| `name` / `url` / `logo` 3종 (구글 로고 리치 결과 최소 요건) | ✅ Pass | 세 필드 모두 존재 → 사이트링크 검색창/로고 노출 최소 요건 충족 |
| `description`, `foundingDate`(ISO 8601), `founder` | ✅ Pass | 날짜 형식 정확(`2026-06-10`) |
| 절대 URL 사용 | ✅ Pass | `url`, `logo`, `image` 모두 절대경로 |
| 플레이스홀더 텍스트(`[Business Name]` 등) 잔존 | ✅ Pass (없음) | |
| `address.streetAddress` | ⚠️ 개선 필요 | 도로명 전체가 한 문자열에 뭉쳐 있음. `addressLocality`(용인시), `addressRegion`(경기도), `postalCode` 분리 권장 |
| `logo` 이미지 적합성 | ⚠️ 개선 필요 | `/opengraph-image`는 1200×630 소셜 공유용 그라디언트 배경 카피 이미지. 구글 로고 가이드(정사각형에 가까운 순수 로고, 최소 112×112px)와 맞지 않음. `company/README.md`에도 "자사 로고(현재 JW 텍스트 마크로 대체)"가 TODO로 이미 등록되어 있음 |
| `telephone` / `email` / `contactPoint` | ❌ 없음(정보 미확정) | `lib/site.ts`의 `telephone: ""`, `email: ""` → 코드가 조건부로 필드를 생략하도록 이미 설계되어 있어(`organization-schema.tsx:26-27`) 값만 채우면 자동 반영됨. `README.md`에 이미 "필수 입력값" TODO로 등록 |
| `sameAs` | ❌ 없음(정보 미확정) | `SITE.sameAs: []`. 네이버/카카오 채널, 링크드인 회사 페이지, 국세청 사업자정보 등 공식 채널이 생기면 채울 것(허위 링크 금지) |
| `@id` (엔티티 그래프 연결용) | ❌ 없음 | `WebSite`·`BreadcrumbList` 등 추가 스키마와 `publisher`/`about`으로 상호 참조하려면 필요 |
| 지원 종료 타입 사용 여부 | ✅ 없음 | HowTo, SpecialAnnouncement, CourseInfo 등 사용 안 함 |

**결론: 구조적으로 유효하지만(오류 없음), 얕습니다.** 필수 속성 누락은 없고, 확장 여지(주소 세분화, 로고, 연락처, sameAs, @id)만 남아 있습니다.

---

## 3. 누락된 스키마 기회

### 3-1. 이미 만들어졌지만 배포되지 않은 것 (최우선 조치)

`company/app/visa/` 및 `company/components/visa/visa-schema.tsx`, `company/components/json-ld.tsx`가 모두 **git 미추적(untracked) 상태**이며 배포 사이트에는 반영되어 있지 않습니다.

- `company/app/visa/page.tsx`: `BreadcrumbList` + `ItemList`(8개 비자/제도 목록) JSON-LD 구현 완료
- `company/components/visa/visa-schema.tsx`: 비자 상세 8페이지 각각에 `BreadcrumbList`(홈 › 비자 정보 › 개별 비자) + `FAQPage`(`lib/visas.ts`의 `faqs` 배열과 화면 아코디언 동기화) 구현 완료, 코드 주석에도 "구글의 FAQ 리치 결과 노출은 제한적이지만, AI 검색·엔티티 인식 신호로 유지 비용이 거의 없다"고 명시 — 본 감사 규칙(FAQPage는 SERP 효과 없음, AI 인용용으로는 유지)과 정확히 일치하는 판단입니다.
- **조치**: `app/visa/`, `components/visa/`, `components/json-ld.tsx`, `lib/visas.ts`를 커밋하고 배포하십시오. 코드 품질 자체는 검증 결과 문제 없습니다(아래 3-4 참고).

### 3-2. WebSite 스키마 (전 페이지 공통, 미존재)

사이트 전체를 대표하는 `WebSite` 엔티티가 없습니다. 검색창 사이트링크(Sitelinks Search Box)는 현재 사이트 내 검색 기능이 없으므로 `potentialAction`(SearchAction)은 강제할 필요 없지만, `WebSite` 자체는 엔티티 인식과 `Organization`과의 `publisher` 연결을 위해 추가를 권장합니다.

### 3-3. BreadcrumbList (라이브 하위 페이지 5개, 미존재)

`components/page-banner.tsx`가 이미 모든 하위 페이지(`/about`, `/services`, `/partners`, `/why`, `/contact`)에 "홈 › {crumb}" 형태의 **시각적** 브레드크럼(`<nav aria-label="현재 위치">`)을 렌더링하고 있지만, 이에 대응하는 `BreadcrumbList` JSON-LD는 없습니다. 화면과 데이터가 이미 1:1 대응 가능한 구조이므로 구현 비용이 매우 낮은 손쉬운 개선(quick win)입니다. `/visa` 섹션에 이미 동일 패턴이 구현되어 있으니 그 컴포넌트를 재사용/추출하면 됩니다.

### 3-4. Service 스키마 (`/services`, 미존재)

`components/service-cards.tsx`가 3대 사업영역(현지 직업훈련, 한국 취업비자, 일본 특정기능)을 카드로 노출하지만 구조화 데이터가 없습니다. B2B 서비스업이므로 `Service` + `OfferCatalog`로 각 사업영역을 명시하면 AI 검색(ChatGPT/Perplexity 등)이 "무엇을 파는 회사인지"를 정확히 인용할 수 있습니다. (Google 리치 결과 트리거는 없지만 GEO 목적에는 유효합니다.)

### 3-5. FAQPage — 홈페이지 (`components/faq-section.tsx`, 미존재)

홈페이지 `<FaqSection />`에 5개 질문·답변이 `<details>` 아코디언으로 이미 존재하지만 `FAQPage` JSON-LD는 없습니다. **규칙상 신규 FAQPage 추가는 구글 리치 결과 이득이 없으므로 우선순위는 낮음(Low/Info)** 이나, `/visa` 섹션에 이미 동일 패턴이 구축되어 있어 동일 원칙으로 확장하는 데 추가 비용이 거의 들지 않습니다. AI 인용/엔티티 해석 목적이라면 추가를 권장합니다.

주의: `FAQS[1].a`(어떤 취업비자와 제도를 지원하나요)는 JSX(`<Link>` 포함)로 작성되어 있어 그대로 JSON-LD `text`에 넣을 수 없습니다. 순수 텍스트 버전을 별도로 두거나(예: `lib/visas.ts`의 `VisaFaq` 처럼 문자열만 저장) 링크 부분을 텍스트로 풀어써야 합니다.

### 3-6. ContactPage (`/contact`, 선택)

`/contact`에 `ContactPage` 타입 래핑은 구글 리치 결과가 없는 항목이라 우선순위 낮음(Low). 다만 `mainEntity`로 `Organization`을 연결해두면 엔티티 신호가 강화됩니다. 전화/이메일이 채워진 뒤 `ContactPoint`와 함께 추가하는 것을 권장합니다.

### 3-7. LocalBusiness / EmploymentAgency 검토 (참고, 강제 변경 아님)

`정우인재개발원`은 실질적으로 해외 인력송출·매칭을 수행하는 사업이라 schema.org의 `EmploymentAgency`(LocalBusiness의 하위 타입)가 의미상 더 정확할 수 있습니다. 다만 `LocalBusiness` 계열은 `telephone`, `openingHoursSpecification` 등을 기대하는 경우가 많고 현재 두 값 모두 미확정(`입력 예정`)이므로, **지금 당장 `@type`을 바꾸기보다는 전화번호·주소 세분화가 확정된 뒤** `"@type": ["Organization", "EmploymentAgency"]` 형태의 배열 타입으로 보강하는 것을 권장합니다(Low, 향후 과제).

---

## 4. 생성된 JSON-LD (구현 권장안)

### 4-1. Organization 보강 — `company/components/organization-schema.tsx`

`@id` 추가 + 주소 세분화만 반영한 예시(전화/이메일/sameAs는 값이 채워지면 기존 조건부 스프레드 패턴이 자동으로 포함하므로 코드 구조 변경 불필요):

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://company-iota-murex.vercel.app/#organization",
  "name": "정우인재개발원",
  "legalName": "Joong Woo Human Resource Development Institute",
  "alternateName": "JOONG WOO HRD",
  "url": "https://company-iota-murex.vercel.app",
  "logo": "https://company-iota-murex.vercel.app/opengraph-image",
  "description": "네팔 인재를 현지 직업훈련부터 양성해 한국과 일본 기업에 합법적이고 안정적으로 연결합니다. 교육, 시험, 매칭, 비자, 정착까지 원스톱으로 관리합니다.",
  "foundingDate": "2026-06-10",
  "founder": { "@type": "Person", "name": "오제환" },
  "areaServed": [
    { "@type": "Country", "name": "네팔" },
    { "@type": "Country", "name": "한국" },
    { "@type": "Country", "name": "일본" }
  ],
  "taxID": "684-13-02918",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "구갈로28번길 21-6, 금보빌딩 6층 6034호",
    "addressLocality": "용인시 기흥구",
    "addressRegion": "경기도",
    "addressCountry": "KR"
  }
}
```

주소 분리는 `lib/site.ts`에 `streetAddress`, `addressLocality`, `addressRegion` 3개 필드를 나눠 저장하도록 리팩터링한 뒤 `organization-schema.tsx`에서 조립하는 방식을 권장합니다.

### 4-2. WebSite — `app/layout.tsx`에 `OrganizationSchema` 옆에 추가

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://company-iota-murex.vercel.app/#website",
  "url": "https://company-iota-murex.vercel.app",
  "name": "정우인재개발원",
  "alternateName": "JOONG WOO HRD",
  "inLanguage": "ko-KR",
  "publisher": { "@id": "https://company-iota-murex.vercel.app/#organization" }
}
```

구현 예시(`company/components/website-schema.tsx` 신규):

```tsx
import JsonLd from "@/components/json-ld";
import { SITE, SITE_URL } from "@/lib/site";

export default function WebsiteSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE.nameKo,
    alternateName: SITE.alternateName,
    inLanguage: "ko-KR",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
  return <JsonLd data={data} />;
}
```

### 4-3. BreadcrumbList — 라이브 하위 페이지 공통 컴포넌트

신규 `company/components/breadcrumb-schema.tsx`:

```tsx
import JsonLd from "@/components/json-ld";
import { SITE_URL } from "@/lib/site";

export default function BreadcrumbSchema({ crumb, path }: { crumb: string; path: string }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: crumb, item: `${SITE_URL}${path}` },
    ],
  };
  return <JsonLd data={data} />;
}
```

각 페이지에 1줄 추가 (예: `app/about/page.tsx`):

```tsx
<BreadcrumbSchema crumb="회사소개" path="/about" />
```

동일하게 `/services`(사업영역), `/partners`(파트너십), `/why`(신뢰·전문성), `/contact`(문의)에 적용.

### 4-4. Service — `/services` 페이지

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "외국인력 채용 및 인재 양성 서비스",
  "provider": { "@id": "https://company-iota-murex.vercel.app/#organization" },
  "areaServed": [
    { "@type": "Country", "name": "한국" },
    { "@type": "Country", "name": "일본" }
  ],
  "audience": {
    "@type": "BusinessAudience",
    "audienceType": "외국인력 채용을 검토하는 한국·일본 기업"
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "정우인재개발원 3대 사업영역",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "현지 직업훈련",
          "description": "직무, 언어, 문화 교육을 네팔 현지에서 진행해 채용 전 준비도를 높입니다."
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "한국 취업비자 매칭",
          "description": "E-9, E-7, D-2, D-4, 계절근로(E-8) 제도에 맞춰 채용 절차를 설계합니다."
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "일본 특정기능 매칭",
          "description": "개호·숙박 분야를 중심으로 일본어·기능시험을 통과한 인재를 매칭합니다."
        }
      }
    ]
  }
}
```

### 4-5. FAQPage — 홈페이지 `FaqSection`

`components/faq-section.tsx`의 `FAQS`를 `lib/visas.ts`의 `VisaFaq` 패턴처럼 "표시용 JSX"와 "JSON-LD용 순수 텍스트"를 분리하는 것을 권장합니다. 예시(2번째 항목만 순수 텍스트로 치환):

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "정우인재개발원은 어떤 회사인가요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "정우인재개발원은 네팔 인재를 현지 직업훈련부터 양성해 한국과 일본 기업에 합법적으로 연결하는 글로벌 인적자원 개발 기업입니다."
      }
    },
    {
      "@type": "Question",
      "name": "어떤 취업비자와 제도를 지원하나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "한국은 E-9, E-7, D-2, D-4, E-8을 지원하고 일본은 특정기능 1호를 지원합니다. 기업 요건과 직무에 맞는 제도를 검토합니다. 제도별 요건과 절차는 비자 정보 페이지(/visa)에서 확인할 수 있습니다."
      }
    },
    {
      "@type": "Question",
      "name": "채용은 어떤 절차로 진행되나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "선발, 교육, 시험, 매칭, 계약과 비자, 입국, 정착의 흐름으로 진행됩니다. 각 단계는 현지 파트너와 역할을 나누어 관리합니다."
      }
    },
    {
      "@type": "Question",
      "name": "어느 나라의 인재를 연결하나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "네팔 현지에서 양성한 인재를 한국과 일본 기업에 연결합니다. 현재 협력망은 3개국을 중심으로 운영됩니다."
      }
    },
    {
      "@type": "Question",
      "name": "신생 기업인데 신뢰할 수 있나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "검증 가능한 객관 지표만 공개하고 확인할 수 없는 취업자 수나 순위는 표기하지 않습니다. 네팔 5개 기관과의 MOU를 포함한 협력 체계를 기반으로 운영합니다."
      }
    }
  ]
}
```

> 참고: 구글은 2026년 5월 7일부로 모든 사이트의 FAQ 리치 결과를 종료했으므로 위 스키마는 검색 결과 노출을 위한 것이 아니라 AI 검색(ChatGPT/Perplexity/AI Overviews) 인용과 엔티티 이해를 위한 것입니다.

---

## 5. 우선순위 정리 (Deploy 체크리스트)

1. **(최우선)** `app/visa/`, `components/visa/`, `components/json-ld.tsx`, `lib/visas.ts` 커밋 및 배포 — 이미 완성된 `BreadcrumbList`/`FAQPage`/`ItemList` 8+1페이지분을 실제로 라이브에 반영
2. `lib/site.ts`/`organization-schema.tsx`의 베트남 제거 변경사항도 함께 배포 (사이트 카피와 구조화 데이터 정합성 확보)
3. `WebSite` 스키마 신규 추가 (`app/layout.tsx`)
4. `/about`, `/services`, `/partners`, `/why`, `/contact` 5개 라이브 페이지에 `BreadcrumbList` 추가 (이미 있는 `PageBanner`의 `crumb` prop 재사용)
5. `/services`에 `Service` + `OfferCatalog` 추가
6. 홈페이지 `FaqSection`에 `FAQPage` 추가 (Low/Info, GEO 목적)
7. `Organization`에 `@id` 부여, 주소 세분화(`addressLocality`/`addressRegion`), 로고를 OG 공유 이미지가 아닌 전용 로고 자산으로 교체 (로고 확정 후 — 이미 README TODO에 등록됨)
8. 전화/이메일/sameAs — 값 확정 시 `lib/site.ts`만 채우면 기존 조건부 렌더링 로직이 자동으로 `contactPoint`/`sameAs`에 반영 (코드 변경 불필요, 이미 README TODO에 등록됨)

---

## 6. 잘 되어 있는 것 (What Works)

- JSON-LD만 사용, Microdata/RDFa 혼용 없음 — 형식 일관성 우수
- `@context`가 `https://schema.org`(https)로 정확히 지정됨
- 모든 URL이 절대경로, `foundingDate`가 ISO 8601(`2026-06-10`) 정확
- `Organization`에 `name`/`url`/`logo` 3종이 모두 존재해 구글의 로고 리치 결과 최소 요건 충족
- 지원 종료 타입(HowTo, SpecialAnnouncement, CourseInfo 등) 및 잘못된 FAQPage 신규 남발 없음 — 오히려 `/visa` 섹션 코드 주석에 "구글 FAQ 리치 결과는 제한적이나 AI 검색 신호로 유지"라고 명시해 최신 가이드라인을 이미 정확히 반영 중
- `lib/site.ts`(회사 단일 정보 출처) + `organization-schema.tsx`의 조건부 스프레드 패턴 덕분에 전화/이메일/sameAs 등 미확정 필드가 채워지는 즉시 스키마에 자동 반영되는 구조 — 유지보수성이 좋음
- `/visa` 섹션(미배포)의 `lib/visas.ts`는 화면 FAQ 아코디언과 `FAQPage` JSON-LD를 동일 배열에서 파생시켜 컨텐츠-스키마 동기화가 보장되도록 설계됨 — 모범적인 패턴이며 배포 후 홈페이지 FAQ에도 동일 패턴 적용 권장
- 플레이스홀더 텍스트(`[Business Name]` 등)가 스키마 내 어디에도 남아있지 않음
