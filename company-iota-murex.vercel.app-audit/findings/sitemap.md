# XML 사이트맵 감사 — company-iota-murex.vercel.app

- 대상: `https://company-iota-murex.vercel.app/sitemap.xml`
- 생성 소스: `/Users/ijaeseung/nepal-school/company/app/sitemap.ts` (Next.js 15 App Router `MetadataRoute.Sitemap`)
- 감사 일시: 2026-07-12 (fetch 응답 `date: Sat, 11 Jul 2026 16:11:47 GMT`, Vercel edge cache HIT, age 781s)

## 1. 요약 판정

| 체크 항목 | 결과 |
|---|---|
| XML 형식 유효성 | 통과 |
| URL당 상태 코드 (전체 6건) | 통과 (전부 200) |
| `robots.txt`의 `Sitemap:` 선언 | 통과 (존재) |
| 50,000 URL 제한 | 통과 (6 URL, 여유 큼) |
| lastmod 신뢰성 | 주의 (전부 동일 타임스탬프) |
| priority / changefreq 사용 | 정보 (Google이 무시하는 태그, 제거 권장) |
| 실제 사이트 대비 커버리지 | 통과 (배포된 6페이지와 100% 일치) — 단, 로컬 소스에 `/visa` 섹션 존재, 미배포 |

## 2. XML 형식 검증

`curl`로 가져온 원문:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>https://company-iota-murex.vercel.app/</loc>
<lastmod>2026-07-02T09:16:15.575Z</lastmod>
<changefreq>monthly</changefreq>
<priority>1</priority>
</url>
... (services, about, partners, why, contact 동일 구조)
</urlset>
```

- `python3 xml.etree.ElementTree`로 파싱 확인 — **정상 well-formed XML**, 선언(`<?xml version="1.0" encoding="UTF-8"?>`)과 네임스페이스(`xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`) 모두 표준 스펙에 부합.
- HTTP 응답 `content-type: application/xml` — 올바름.
- URL 개수 6건, 50,000건 제한과는 거리가 멀어 인덱스 사이트맵 분할 불필요.

## 3. URL 상태 코드 검증 (6건 전수)

```
/          -> 200
/services  -> 200
/about     -> 200
/partners  -> 200
/why       -> 200
/contact   -> 200
```

전 URL이 200을 반환. 사이트맵에 포함된 URL 중 non-200, 리다이렉트, noindex 페이지 없음 — **High/Medium 등급 이슈 없음**.

## 4. lastmod 신뢰성 — 주의 (Low)

6개 URL 모두 `lastmod`가 정확히 동일: `2026-07-02T09:16:15.575Z`.

원인은 `app/sitemap.ts`의 다음 코드:

```ts
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();   // 빌드 시점의 현재 시각을 모든 URL에 동일하게 사용
  return routes.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: "monthly",
    priority,
  }));
}
```

`new Date()`가 **빌드(정적 생성) 시점의 타임스탬프**를 캡처해 전 페이지에 동일하게 주입하는 구조다. 페이지별 실제 콘텐츠 수정 이력과 무관하므로 크롤러에게 신호로서 가치가 낮다(체크리스트상 "All identical lastmod → Low → Use real dates").

- 영향은 낮음 — 6페이지 규모의 정적 마케팅 사이트에서 크롤 예산(crawl budget) 문제로 이어질 가능성은 희박.
- 권장: 콘텐츠 실제 변경 시점을 반영하려면 (a) 각 라우트 소스 파일의 git 최종 커밋 시각을 빌드 타임에 읽어 매핑하거나, (b) 향후 CMS/데이터 소스(`lib/site.ts`, `lib/visas.ts` 등)에 `updatedAt` 필드를 두고 이를 sitemap 생성에 사용. 급하지 않다면 현행 유지도 무방(정보성 신호일 뿐 랭킹에 직접 영향 없음).

## 5. priority / changefreq — 정보성 (Info)

전 6개 URL에 `<changefreq>monthly</changefreq>`와 `<priority>`(1.0~0.6, 라우트별 차등)가 포함되어 있다. Google은 두 태그를 공식적으로 완전히 무시한다(2023년 명시적 공표 이후 changefreq/priority 모두 크롤링·랭킹에 사용하지 않음). 현재 값 자체는 논리적으로 잘 짜여 있으나(홈 1.0 → 서비스 0.9 → about 0.8 → partners/why 0.7 → contact 0.6), 실질적 효과는 없다.

- 심각도: 정보성, 조치 필수 아님.
- 선택 사항: 사이트맵 파일 크기를 줄이고 유지보수 부담을 낮추고 싶다면 `app/sitemap.ts`에서 `changeFrequency`/`priority` 필드를 제거해도 무방. 굳이 제거하지 않아도 무해함.

## 6. robots.txt — Sitemap 선언 검증

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

Host: https://company-iota-murex.vercel.app
Sitemap: https://company-iota-murex.vercel.app/sitemap.xml
```

- `Sitemap:` 선언 **존재하고 절대 URL 형식으로 정확함** — 통과.
- 전 UA에 `Allow: /` — 사이트맵에 포함된 모든 경로 크롤링 허용, 사이트맵-robots 간 충돌 없음.
- 참고(정보성, 조치 불필요): `Host: https://company-iota-murex.vercel.app` 줄은 Yandex 전용의 오래된 비표준 지시어이며 원래 스킴(`https://`) 없이 호스트명만 쓰는 문법이다(`Host: company-iota-murex.vercel.app`). Google/대부분 크롤러는 이 지시어 자체를 무시하므로 실질적 위해는 없으나, 정확성을 위해 다음 재작업 시 정리해도 좋음.

## 7. 실제 사이트 대비 커버리지

배포본 크롤 결과(`/Users/ijaeseung/nepal-school/company-iota-murex.vercel.app-audit/crawl/`)에는 `page_visa.html`이 존재하지만, 내용을 확인한 결과 실제로는 **404 페이지**였다(`<title>404: This page could not be found.</title>`, `<meta name="robots" content="noindex"/>`). 실 요청으로도 재확인:

```
/visa                        -> 404
/visa/e-9                    -> 404
/visa/e-7                    -> 404
/visa/d-2-d-4                -> 404
/visa/e-8                    -> 404
/visa/tokutei-ginou          -> 404
/visa/tokutei-ginou-kaigo    -> 404
/visa/tokutei-ginou-shukuhaku-> 404
/visa/ikusei-shuro           -> 404
```

즉 **현재 프로덕션에는 `/visa` 섹션이 존재하지 않으며**, 사이트맵에 6 URL만 있는 것은 정확하다. 커버리지 자체는 문제없음(누락 페이지도, 초과/오류 페이지도 없음).

### 로컬 소스 상태 (배포 전 사전 확인)

로컬 저장소(`/Users/ijaeseung/nepal-school/company`)에는 `/visa` 허브 페이지 + 비자별 상세 페이지(`app/visa/[slug]`) 8종이 이미 구현되어 있고(`lib/visas.ts`의 `VISAS` 배열), `app/sitemap.ts`에도 이미 다음과 같이 반영되어 있다(단, 아직 커밋되지 않은 워킹 트리 변경분 — `git diff` 확인됨):

```ts
import { VISAS } from "@/lib/visas";
...
const routes = [
  { path: "/", priority: 1.0 },
  { path: "/services", priority: 0.9 },
  { path: "/visa", priority: 0.9 },
  { path: "/about", priority: 0.8 },
  { path: "/partners", priority: 0.7 },
  { path: "/why", priority: 0.7 },
  { path: "/contact", priority: 0.6 },
  ...VISAS.map((visa) => ({ path: `/visa/${visa.slug}`, priority: visa.sitemapPriority })),
];
```

VISAS 배열의 8개 슬러그(`e-9`, `e-7`, `d-2-d-4`, `e-8`, `tokutei-ginou`, `tokutei-ginou-kaigo`, `tokutei-ginou-shukuhaku`, `ikusei-shuro`) 각각이 자동으로 사이트맵 엔트리로 파생되는 구조라 별도 수동 등록이 필요 없다. **로직 자체는 이미 올바르게 연결되어 있으므로, 이 브랜치가 배포되면 사이트맵은 자동으로 6 URL → 15 URL(홈/서비스/비자허브/about/partners/why/contact + 비자 상세 8종)로 확장된다.** 별도 코드 수정 없이 배포만 하면 됨 — 이 점은 감사 브리프에서 지시한 "배포 시 sitemap.ts에 추가 필요"라는 우려와 달리 **이미 해결되어 있는 상태**임을 확인.

## 8. 품질 게이트 (로케이션 페이지 임계값) 평가

체크리스트상 30+/50+ 로케이션 페이지 임계값은 이 사이트에는 **해당 사항 없음** — 현재도, 배포 예정인 `/visa` 확장 이후에도 도시명만 바꾸는 로케이션 페이지가 전혀 없다.

다만 `/visa/[slug]` 8개는 공통 데이터 구조(`Visa` 인터페이스)에서 파생되는 **템플릿 기반 프로그래매틱 페이지**라는 점에서 구조적으로는 로케이션 페이지와 유사한 패턴이다. 소스(`lib/visas.ts`)를 검토한 결과:

- 슬러그별로 고유한 `summary`(90~150자 실질 설명), 5행 `glance` 요약표, 4~6개의 **슬러그 전용 FAQ**(질문·답변 모두 해당 비자 특유의 절차·수치·요건을 다룸 — 예: E-9의 재고용 연장, 개호의 3종 시험, 육성취로의 2027년 4월 시행일 등)로 구성됨.
- 도시명만 바뀌는 형태가 아니라 국가(한국/일본)·제도별로 완전히 다른 법령 구조, 수치, FAQ를 담고 있어 **"Safe at Scale" 카테고리(실제 세부 스펙을 갖춘 Integration/Glossary형 페이지)에 해당**하며, "Penalty Risk" 카테고리(도시명 치환형 로케이션 페이지, 실질 가치 없는 "Best X for Y")에는 해당하지 않는다고 판단.
- 결론: 하드 스톱/경고 트리거 없음. 배포해도 무방하나, 배포 후에도 각 페이지가 실제로 서로 다른 렌더링 콘텐츠를 갖는지(즉 템플릿만 있고 본문이 비어있지 않은지) 배포 후 재크롤로 재검증 권장.

## 9. 종합 소견

현재 프로덕션 사이트맵은 6페이지 규모에 맞게 간결하고 정확하며, Critical/High 등급 결함이 전혀 없다. 유일한 개선 여지는 (a) 빌드 타임스탬프 대신 실제 lastmod 사용(Low), (b) Google이 무시하는 priority/changefreq 태그 정리(Info, 선택) 뿐이다. `/visa` 섹션은 로컬에서 이미 사이트맵 로직까지 완성된 상태로 대기 중이며, 배포 시 별도 코드 수정 없이 6→15 URL로 자동 확장되고 로케이션 페이지 품질 게이트에도 저촉되지 않는다.
