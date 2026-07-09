import fs from "fs";
import path from "path";
import { marked, Renderer } from "marked";

// 위키 마크다운 파일은 이 dashboard 폴더의 상위 폴더(nepal-school)에 위치한다.
const CONTENT_DIR = path.join(process.cwd(), "..");

export type DocSlug =
  | "overview"
  | "visa"
  | "market"
  | "nepal"
  | "cost"
  | "conclusion"
  | "competition"
  | "timeline";

// slug(URL) ↔ 파일 ↔ 메타데이터 정의
export interface DocMeta {
  slug: DocSlug;
  file: string;
  num: string;
  title: string;
  desc: string;
  icon: string;
}

// 렌더링까지 끝난 단일 문서
export interface Doc extends DocMeta {
  html: string;
  raw: string;
}

// 클라이언트 검색용 인덱스 항목
export interface SearchEntry {
  slug: DocSlug;
  num: string;
  title: string;
  desc: string;
  icon: string;
  text: string;
}

// 문서 정의: slug(URL) ↔ 파일 ↔ 메타데이터
export const DOCS: DocMeta[] = [
  {
    slug: "overview",
    file: "00-사업개요.md",
    num: "00",
    title: "사업 개요",
    desc: "사업 모델·수수료 구조·검증 질문",
    icon: "📋",
  },
  {
    slug: "visa",
    file: "01-제도-비자.md",
    num: "01",
    title: "제도·비자 실현가능성",
    desc: "특정기능1호와 기능실습·E-9 구분",
    icon: "🛂",
  },
  {
    slug: "market",
    file: "02-시장-수요.md",
    num: "02",
    title: "시장·수요 규모",
    desc: "일본 개호·숙박 인력부족·수용 규모·임금",
    icon: "📈",
  },
  {
    slug: "nepal",
    file: "03-네팔-송출실태.md",
    num: "03",
    title: "네팔 송출 실태",
    desc: "네팔 SSW 송출·Richhood/JITCO 해석",
    icon: "🇳🇵",
  },
  {
    slug: "cost",
    file: "04-수익모델-비용검증.md",
    num: "04",
    title: "수익모델·비용 검증",
    desc: "700만원 과금·수익 구조·관할 분리",
    icon: "💰",
  },
  {
    slug: "conclusion",
    file: "05-종합결론-리스크.md",
    num: "05",
    title: "종합 결론·리스크",
    desc: "실현가능성 종합 판단·체크리스트",
    icon: "🎯",
  },
  {
    slug: "competition",
    file: "06-경쟁사-신규비자-시장규모.md",
    num: "06",
    title: "경쟁사·신규비자·시장 규모",
    desc: "실제 신규비자 루트·경쟁사·초기 SAM",
    icon: "🏁",
  },
  {
    slug: "timeline",
    file: "07-취업타임라인-주체별역할.md",
    num: "07",
    title: "취업 타임라인·주체별 역할",
    desc: "학생 취업 흐름·주체별 업무·서류 교환",
    icon: "🧭",
  },
];

// 파일명 → 라우트 매핑(마크다운 내부 링크 변환용)
const FILE_TO_ROUTE: Record<string, string> = DOCS.reduce(
  (acc, d) => {
    acc[d.file] = `/docs/${d.slug}`;
    return acc;
  },
  { "README.md": "/" } as Record<string, string>,
);

function rewriteLinks(html: string): string {
  // ./00-사업개요.md, 00-사업개요.md, ./README.md → 앱 라우트
  return html.replace(
    /href="\.?\/?([^"]+?\.md)(#[^"]*)?"/g,
    (match: string, file: string, hash?: string) => {
      const decoded = decodeURIComponent(file);
      const route = FILE_TO_ROUTE[decoded] || FILE_TO_ROUTE[file];
      if (route) return `href="${route}${hash || ""}"`;
      return match;
    },
  );
}

// GitHub 호환 heading slug (한글·CJK 보존, 구두점 제거, 공백→하이픈)
function slugify(inner: string): string {
  return inner
    .replace(/<[^>]+>/g, "") // 인라인 HTML 태그 제거(<strong> 등)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\s-]/gu, "") // 구두점(.·—+() 등) 제거, 유니코드 문자·숫자·공백·하이픈 유지
    .replace(/\s/g, "-"); // GitHub과 동일하게 공백 1개당 하이픈 1개(다중 하이픈 미축약)
}

// 렌더된 HTML의 h1~h6에 id를 부여해 페이지 내 #앵커 링크가 동작하도록 한다.
function addHeadingIds(html: string): string {
  return html.replace(
    /<(h[1-6])>([\s\S]*?)<\/\1>/g,
    (_m: string, tag: string, inner: string) =>
      `<${tag} id="${slugify(inner)}">${inner}</${tag}>`,
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMarkdown(raw: string): string {
  const renderer = new Renderer();
  const defaultCodeRenderer = renderer.code.bind(renderer);

  renderer.code = (code: string, infostring: string | undefined, escaped: boolean) => {
    const language = (infostring || "").trim().split(/\s+/)[0];
    if (language === "mermaid") {
      return `<div class="mermaid">${escapeHtml(code)}</div>`;
    }
    return defaultCodeRenderer(code, infostring, escaped);
  };

  marked.setOptions({ gfm: true, breaks: false, renderer });
  return addHeadingIds(rewriteLinks(marked.parse(raw) as string));
}

function readFileSafe(file: string): string | null {
  try {
    return fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
  } catch (e) {
    return null;
  }
}

export function getDocBySlug(slug: string): Doc | null {
  const doc = DOCS.find((d) => d.slug === slug);
  if (!doc) return null;
  const raw = readFileSafe(doc.file);
  if (raw == null)
    return { ...doc, html: "<p>문서를 찾을 수 없습니다.</p>", raw: "" };
  const html = renderMarkdown(raw);
  return { ...doc, html, raw };
}

export function getReadme(): { html: string; raw: string } {
  const raw = readFileSafe("README.md");
  if (raw == null) return { html: "", raw: "" };
  return { html: renderMarkdown(raw), raw };
}

// 클라이언트 검색용 인덱스: 제목 + 본문 일반 텍스트
export function getSearchIndex(): SearchEntry[] {
  return DOCS.map((d) => {
    const raw = readFileSafe(d.file) || "";
    const text = raw
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[#>*_`|\-]/g, " ")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
    return {
      slug: d.slug,
      num: d.num,
      title: d.title,
      desc: d.desc,
      icon: d.icon,
      text,
    };
  });
}
