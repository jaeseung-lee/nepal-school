import assert from "node:assert/strict";
import test from "node:test";
import { resolveBlogSchedule } from "../scripts/blog-schedule.mjs";

test("월요일은 한국어 경로로 해석한다", () => {
  const result = resolveBlogSchedule("2026-07-20");
  assert.equal(result.locale, "ko");
  assert.equal(result.jurisdiction, "KR");
});

test("수요일은 일본어 경로로 해석한다", () => {
  const result = resolveBlogSchedule("2026-07-22");
  assert.equal(result.locale, "ja");
  assert.equal(result.jurisdiction, "JP");
});

test("금요일은 네팔어 경로로 해석한다", () => {
  const result = resolveBlogSchedule("2026-07-24");
  assert.equal(result.locale, "ne");
  assert.equal(result.jurisdiction, "NP");
});

test("예약일이 아니면 콘텐츠 생성을 중단한다", () => {
  assert.equal(resolveBlogSchedule("2026-07-21").scheduled, false);
});
