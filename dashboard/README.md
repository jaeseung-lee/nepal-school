# 네팔→일본 특정기능 사업 위키 — 대시보드

위키 마크다운(`../*.md`)을 한 화면에서 볼 수 있는 Next.js(App Router) 내부 열람용 대시보드.
콘텐츠 기준일은 2026-06-17이며, 핵심 수치는 출입국재류관리청·후생노동성·관광청/국토교통성·국제교류기금 등 공식자료 우선으로 갱신한다.

## 실행 방법

```bash
cd dashboard
npm install
npm run dev
```

→ 브라우저에서 http://localhost:3000 접속.

## 비공개 배포

Vercel 배포 환경에서는 Basic Auth로 대시보드를 보호한다. Vercel Project Settings → Environment Variables에 아래 값을 Production과 Preview 환경에 설정한다.

```bash
BASIC_AUTH_USER=admin
BASIC_AUTH_PASSWORD=<공유할 비밀번호>
```

환경변수가 없는 로컬 개발 환경은 그대로 열리지만, production 환경에서 값이 빠지면 대시보드는 공개되지 않고 설정 오류로 실패한다.

## 구성

- **홈(`/`)** — 핵심 지표(KPI) 카드, 개호/숙박 판정 배너, 검증 축별 판정표, 문서 바로가기.
- **문서(`/docs/[slug]`)** — 6개 위키 문서를 표·인용·코드블록까지 렌더링. 이전/다음 이동.
- **사이드바** — 전체 문서 네비게이션 + **제목·본문 실시간 검색**(매칭 스니펫 표시).

## 콘텐츠 출처

문서 내용은 상위 폴더(`nepal-school/`)의 `00-사업개요.md` ~ `05-종합결론-리스크.md`,
`README.md`를 빌드/렌더 시점에 직접 읽어옵니다. 마크다운을 수정하면 대시보드에 그대로 반영됩니다.

```
nepal-school/
├── README.md              ← 위키 인덱스
├── 00-사업개요.md
├── 01-제도-비자.md
├── 02-시장-수요.md
├── 03-네팔-송출실태.md
├── 04-수익모델-비용검증.md
├── 05-종합결론-리스크.md
└── dashboard/             ← 이 Next.js 앱
```

## 기술 스택

Next.js 14 (App Router) · React 18 · marked(마크다운 렌더) · Node 내장 테스트 러너 · 의존성 최소화.
