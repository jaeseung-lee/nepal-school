import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  BUSINESS_AREA_LOCALES,
  BUSINESS_AREA_SLUGS,
  getBusinessArea,
  getBusinessAreas,
} from "../lib/business-areas";
import { LP_V1_COPY } from "../lib/lp-v1-copy";

const publicRoot = path.join(process.cwd(), "public");

test("사업영역은 4개이며 한국어·일본어 구조가 일치한다", () => {
  assert.deepEqual(BUSINESS_AREA_SLUGS, [
    "japan-caregiver",
    "japan-hospitality",
    "korea-study",
    "korea-welding",
  ]);
  assert.deepEqual(BUSINESS_AREA_LOCALES, ["ko", "ja"]);

  for (const locale of BUSINESS_AREA_LOCALES) {
    const areas = getBusinessAreas(locale);
    assert.equal(areas.length, 4);
    assert.deepEqual(areas.map((area) => area.slug), [...BUSINESS_AREA_SLUGS]);
  }

  for (const slug of BUSINESS_AREA_SLUGS) {
    const korean = getBusinessArea("ko", slug);
    const japanese = getBusinessArea("ja", slug);
    assert.equal(korean.href, `/services/${slug}`);
    assert.equal(japanese.href, korean.href);
    assert.equal(japanese.stages.length, korean.stages.length);
    assert.equal(japanese.evidence.images.length, korean.evidence.images.length);
    assert.ok(korean.meta.title && korean.meta.description && korean.hero.title && korean.cta.subject);
    assert.ok(japanese.meta.title && japanese.meta.description && japanese.hero.title && japanese.cta.subject);
  }
});

test("개호 카드와 교차 링크는 원본 lp/v1 히어로 카피를 그대로 사용한다", () => {
  for (const locale of BUSINESS_AREA_LOCALES) {
    const area = getBusinessArea(locale, "japan-caregiver");
    const originalHero = LP_V1_COPY[locale].hero;
    const title = originalHero.titleLines.join(locale === "ko" ? " " : "");

    assert.equal(area.hero.title, title);
    assert.equal(area.hero.summary, originalHero.description);
  }
});

test("사업영역에서 참조하는 모든 이미지가 배포 자산으로 존재한다", () => {
  for (const locale of BUSINESS_AREA_LOCALES) {
    for (const area of getBusinessAreas(locale)) {
      assert.ok(area.evidence.images.length >= 2, `${locale}/${area.slug} needs at least two images`);
      for (const image of area.evidence.images) {
        const absolutePath = path.join(publicRoot, image.src.replace(/^\//, ""));
        assert.ok(fs.existsSync(absolutePath), `${locale}/${area.slug} missing ${image.src}`);
        assert.ok(fs.statSync(absolutePath).size > 10_000, `${image.src} is unexpectedly small`);
        if (image.kind === "field-record") {
          assert.match(image.src, /^\/(?:gallery|lp\/v1)\//);
        } else {
          assert.match(image.src, /^\/kv\//);
        }
      }
    }
  }
});

test("미확정 용접 과정 수치·인증은 확정 사실로 노출하지 않는다", () => {
  for (const locale of BUSINESS_AREA_LOCALES) {
    const welding = JSON.stringify(getBusinessArea(locale, "korea-welding"));
    for (const unverifiedClaim of ["12주", "300시간", "80% 실습", "CTEVT 인증", "AWS", "ASME", "IIW"]) {
      assert.doesNotMatch(welding, new RegExp(unverifiedClaim));
    }
  }
});
