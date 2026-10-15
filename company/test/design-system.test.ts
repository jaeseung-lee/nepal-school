import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

// 공개 사이트는 모노톤 디자인 시스템만 쓴다. 삭제된 브랜드 색 토큰은 빌드가 조용히 무시하므로
// (클래스가 아무 스타일도 만들지 않음) 소스에서 직접 막는다. 내부 영업툴은 별도 화면이라 제외한다.
const root = process.cwd();
const PUBLIC_SOURCE_DIRS = ["app", "components"];
const EXCLUDED = [path.join("app", "(internal)"), path.join("components", "sales")];
const UTILITY_PREFIX = "(?:text|bg|border|ring|outline|decoration|from|via|to|fill|stroke|shadow|divide|placeholder|caret|accent)";

function listSourceFiles(directory: string): string[] {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    if (EXCLUDED.some((excluded) => relative.startsWith(excluded))) return [];
    if (entry.isDirectory()) return listSourceFiles(relative);
    return /\.(tsx?|mjs)$/.test(entry.name) ? [relative] : [];
  });
}

function findMatches(pattern: RegExp) {
  return PUBLIC_SOURCE_DIRS.flatMap(listSourceFiles).flatMap((file) =>
    [...fs.readFileSync(path.join(root, file), "utf8").matchAll(pattern)].map((match) => `${file}: ${match[0]}`),
  );
}

function isNeutral(red: number, green: number, blue: number) {
  return red === green && green === blue;
}

test("공개 화면은 삭제된 브랜드 색 토큰 클래스를 쓰지 않는다", () => {
  const legacy = new RegExp(`\\b${UTILITY_PREFIX}-(?:cobalt|clay|primary-|gold-|blue-accent)[\\w/-]*`, "g");
  assert.deepEqual(findMatches(legacy), []);
});

test("공개 화면은 Tailwind 기본 유채색 팔레트와 임의 hex 색을 쓰지 않는다", () => {
  const chromatic = new RegExp(
    `\\b${UTILITY_PREFIX}-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}\\b`,
    "g",
  );
  assert.deepEqual(findMatches(chromatic), []);
  assert.deepEqual(findMatches(new RegExp(`\\b${UTILITY_PREFIX}-\\[#[0-9a-fA-F]{3,8}\\]`, "g")), []);
});

test("디자인 토큰과 전역 CSS 색은 무채색만 정의한다", () => {
  const css = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");

  assert.doesNotMatch(css, /--color-(?:cobalt|clay|primary|gold|blue-accent)/);
  for (const [, hex] of css.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
    const [red, green, blue] = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
    assert.ok(isNeutral(red, green, blue), `globals.css has a chromatic color: #${hex}`);
  }
  for (const [, red, green, blue] of css.matchAll(/rgb\((\d+)\s+(\d+)\s+(\d+)/g)) {
    assert.ok(isNeutral(Number(red), Number(green), Number(blue)), `globals.css has a chromatic rgb(): ${red} ${green} ${blue}`);
  }
});
