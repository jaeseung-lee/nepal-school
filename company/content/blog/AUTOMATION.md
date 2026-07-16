# 다국어 블로그 자동 PR 운영 규칙

이 문서는 예약 작업의 단일 운영 기준이다. 예약 작업은 `resume/`, `mou/`와 개인정보가 포함될 수 있는 문서를 읽지 않는다. 콘텐츠 조사에는 공개된 공식 웹페이지와 이 디렉터리의 정책·템플릿만 사용한다.

## 실행 흐름

1. `npm run blog:schedule -- --date=YYYY-MM-DD`로 오늘의 언어, 관할, 독자, 브랜치 접두사를 결정한다.
2. `content-strategy`와 `ai-seo` 스킬을 사용해 독자의 검색 의도와 기존 글의 중복 여부를 확인한다.
3. 최근 공식 변경사항을 먼저 검토한다. 적합한 변경이 없으면 `automation-policy.json`의 evergreen 주제를 고른다.
4. 관할 국가의 허용된 공식 호스트에서 최소 2개의 1차 출처를 확보한다. 공표일, 시행일, 확인일, 대상 독자와 관할을 기록할 수 없으면 글을 만들지 않는다.
5. `content/blog/{locale}/{slug}.md`에 글을 추가한다. 상태는 반드시 `review`, 작성 방식은 사실에 맞게 `ai-assisted`로 기록하고 검토자는 `null`로 둔다.
6. 대표 이미지 1개와 본문 이미지 최대 2개를 `image-library.json`에서 고른다. 원격 이미지, 공식 로고, 공문 스크린샷, 이미지에 문자를 구운 도식은 사용하지 않는다. 절차와 비교는 Markdown 목록·표처럼 접근 가능한 HTML로 렌더링되는 구조를 쓴다.
7. 아래 검증을 순서대로 실행한다.
   - `npm run test:i18n`
   - `npm run validate:blog`
   - `npm run test:blog`
   - `npm run typecheck`
   - `BLOG_INCLUDE_REVIEW=1 npm run build`
8. 모든 검증이 통과한 경우에만 `codex/blog-날짜-언어-slug` 브랜치를 푸시하고 Draft PR을 만든다. 자동 병합과 `published` 전환은 금지한다.

## 생성 전 중단 조건

- `gh auth status`가 실패한다.
- `codex/blog-날짜-언어-`로 시작하는 같은 날 브랜치나 PR이 이미 있다.
- 열려 있는 `codex/blog-` Draft PR이 3개 이상이다.
- 공식 출처에 접근할 수 없거나 최소 2개를 확보하지 못했다.
- 법적 해석이 필요하거나 출처끼리 설명이 충돌한다.
- 이미지의 출처·허용 용도·alt를 확정할 수 없다.
- 콘텐츠·다국어·타입·빌드 검증 중 하나라도 실패한다.

중단 시 브랜치 푸시와 PR 생성은 하지 않고, Codex 작업 결과에 이유와 필요한 사람의 조치를 남긴다. Codex 예약 작업을 비활성화하는 것이 전체 kill switch다.

## PR 본문 필수 항목

- 언어, 관할, 대상 독자, 선택 이유
- 출처 팩: 공식 URL, 공표일, 시행일, 확인일
- 핵심 주장과 각 주장을 뒷받침하는 출처
- 대표·본문 이미지 경로, 출처·사용 권한, alt·캡션
- 실행한 검증과 결과
- 사람이 확인할 사실, 표현, 법적 해석, 실제 검토자 입력 항목
- 공개 전 `reviewer.name`, `reviewer.credentials`, `reviewer.reviewedAt`, `status: published` 변경 필요 안내
