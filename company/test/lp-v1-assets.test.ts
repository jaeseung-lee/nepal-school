import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { GALLERY_ITEMS } from "../lib/gallery";
import {
  LP_V1_GALLERY_ITEMS,
  getLpV1GalleryItems,
} from "../lib/lp-v1-gallery";
import {
  LP_V1_COPY,
  LP_V1_META,
  LP_V1_PDF_HREFS,
  type LpV1Locale,
} from "../lib/lp-v1-copy";

const TEST_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const COMPANY_DIRECTORY = path.resolve(TEST_DIRECTORY, "..");
const REPOSITORY_DIRECTORY = path.resolve(COMPANY_DIRECTORY, "..");
const PUBLIC_DIRECTORY = path.join(COMPANY_DIRECTORY, "public");
const OUTPUT_PDF_DIRECTORY = path.join(REPOSITORY_DIRECTORY, "output", "pdf");
const LOCALES: readonly LpV1Locale[] = ["ko", "ja"];
const APPROVED_GALLERY_IDS = [
  "caregiver-practice",
  "caregiver-mobility",
  "healthcare-training-classroom",
  "nursing-classroom-visit",
  "caregiver-training-programme-display",
  "campus-programme-display",
  "campus-welcome-garlanded-guests",
  "campus-partnership-meeting",
  "campus-visit-outdoor-group",
  "dakshinkali-municipality-partnership-visit",
  "municipal-office-meeting",
  "office-presentation-meeting",
  "stakeholder-meeting-presentation",
  "institutional-visit-group-wide",
  "oxbridge-foundation-welcome-ceremony",
  "visiting-group-building-entrance",
] as const;
const APPROVED_PDF_SHA256: Readonly<Partial<Record<LpV1Locale, string>>> = {
  ko: "fc9346caf552dfb546ebe16ac6ade54b3be0db5d050037d3dadab80cdb1a9d53",
  ja: "7114c45bb59fe052f3fa8828d470b0b6a9d0aee640926df846fcbc4fa6200b6a",
};
const REJECTED_PDF_SHA256: Readonly<Partial<Record<LpV1Locale, string>>> = {
  ja: "266d53593fa2dc163e79450fa890273a7debd5c4c4a70af7b74457b0c6d254c5",
};
const REJECTED_JA_COPY = [
  "主要学習モジュール",
  "現場記録",
  "講義と実習を統合",
  "モジュール＋統合プロジェクト",
  "技術だけを反復するのではありません。介護の倫理と安全を軸に、準備、実施、片付け、記録までを一つの業務単位として学びます。",
  "尊重ある対話",
  "活動 · 対話 · 観察 · 報告",
  "筆記 · 実技 · 最終実技・口頭試問",
  "筆記・実技・最終実技・口頭試問",
  "KTSの正式MOUパートナーとして、日本・韓国での連携営業を担います",
  "事業開発・パートナー開拓・連携営業窓口",
] as const;

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  return [...duplicates].sort();
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

test("lp/v1 원문·메타데이터·PDF 링크는 승인된 카피를 유지한다", () => {
  const approvedCopy = JSON.stringify({ LP_V1_COPY, LP_V1_META, LP_V1_PDF_HREFS });

  assert.equal(
    createHash("sha256").update(approvedCopy).digest("hex"),
    "8266e9ba17b9f3df283a9e625c6ecc0fb532b3639aea6038a32673a7bceb0e4f",
  );
});

test("lp/v1 일본어 카탈로그는 승인된 직업훈련·평가·영업대행 카피를 사용한다", () => {
  const copy = LP_V1_COPY.ja;

  assert.deepEqual(
    {
      programLabel: copy.hero.programLabel,
      programBasis: copy.hero.programBasis,
      evidenceLabel: copy.hero.evidenceLabel,
    },
    {
      programLabel: "ネパール現地介護職業訓練コース",
      programBasis: "CTEVT（ネパール）短期職業訓練コース",
      evidenceLabel: "研修風景",
    },
  );
  assert.deepEqual(
    copy.facts.items.map(({ label, note }) => ({ label, note })),
    [
      { label: "訓練期間", note: "介護職集中訓練コース" },
      { label: "総訓練時間", note: "実習・演習を中心とした390時間" },
      { label: "主要カリキュラム", note: "各科目＋統合プロジェクト" },
    ],
  );
  assert.equal(copy.facts.evaluation, "筆記試験・実技試験・最終実技評価・口頭試問");
  assert.equal(
    copy.curriculum.description,
    "介護の倫理と安全を基本に、準備・実施・片付け・記録までを一連の業務として学びます。",
  );
  assert.deepEqual(
    {
      description: copy.curriculum.domains[5].description,
      detail: copy.curriculum.domains[5].detail,
    },
    {
      description: "基本運動と余暇活動を支援し、尊重あるコミュニケーション、ストレスへの対応、観察・報告を学びます。",
      detail: "活動 · コミュニケーション · 観察 · 報告",
    },
  );
  assert.equal(copy.completion.items[0].value, "筆記試験・実技試験・最終実技評価・口頭試問");
  assert.equal(
    copy.partnership.title,
    "KTSの正式MOUパートナーとして、日本・韓国向けの営業代行と事業連携を担います",
  );
  assert.equal(
    copy.partnership.joongwoo.role,
    "KTS介護研修の日本・韓国向け営業代行・事業連携窓口",
  );

  const serializedCopy = JSON.stringify(copy);
  for (const rejected of REJECTED_JA_COPY) {
    assert.ok(!serializedCopy.includes(rejected), `superseded Japanese copy remains: ${rejected}`);
  }
});

test("lp/v1 MOU 소개는 KTS와 정우의 협력 역할을 과장 없이 설명한다", () => {
  const expectations = {
    ko: {
      title: "KTS의 정식 MOU 파트너로서 한국·일본 영업대행과 사업협력을 담당합니다",
      role: "KTS 개호교육의 한국·일본 영업대행·사업협력 창구",
      noEmploymentGuarantee: /취업 또는 배치 결과를 보장하지 않습니다/,
      affirmativeEmploymentGuarantee: /(?:취업|채용|고용)[^.!?]{0,24}보장(?!하지)/,
      exclusivityClaim: /독점/,
    },
    ja: {
      title: "KTSの正式MOUパートナーとして、日本・韓国向けの営業代行と事業連携を担います",
      role: "KTS介護研修の日本・韓国向け営業代行・事業連携窓口",
      noEmploymentGuarantee: /就職、配属の結果を保証するものではありません/,
      affirmativeEmploymentGuarantee:
        /(?:就職|採用|雇用)[^。.!?]{0,24}保証(?!するものではありません|しません|されません|しない)/,
      exclusivityClaim: /独占/,
    },
  } as const;

  for (const locale of LOCALES) {
    const partnership = LP_V1_COPY[locale].partnership;
    const expectation = expectations[locale];
    const partnershipCopy = JSON.stringify(partnership);

    assert.equal(partnership.school.name, "Kathmandu Technical School");
    assert.equal(partnership.title, expectation.title);
    assert.match(partnership.title, /MOU/);
    assert.equal(partnership.joongwoo.role, expectation.role);
    assert.match(partnership.note, expectation.noEmploymentGuarantee);
    assert.doesNotMatch(partnershipCopy, expectation.exclusivityClaim);
    assert.doesNotMatch(partnershipCopy, expectation.affirmativeEmploymentGuarantee);
  }
});

test("lp/v1 gallery keeps all 6 training + 10 partnership images in catalog order", async () => {
  assert.equal(LP_V1_GALLERY_ITEMS.length, 16);
  assert.equal(
    LP_V1_GALLERY_ITEMS.filter((item) => item.group === "training").length,
    6,
  );
  assert.equal(
    LP_V1_GALLERY_ITEMS.filter((item) => item.group === "partnership").length,
    10,
  );
  assert.deepEqual(
    [...LP_V1_GALLERY_ITEMS.map((item) => item.id)].sort(),
    [...APPROVED_GALLERY_IDS].sort(),
  );
  assert.deepEqual(duplicateValues(LP_V1_GALLERY_ITEMS.map((item) => item.id)), []);
  assert.deepEqual(duplicateValues(LP_V1_GALLERY_ITEMS.map((item) => item.src)), []);
  assert.deepEqual(
    LP_V1_GALLERY_ITEMS.map((item) => item.order),
    Array.from({ length: 16 }, (_, index) => index + 1),
  );

  const sharedGallerySources = new Set<string>(GALLERY_ITEMS.map((item) => item.src));
  assert.deepEqual(LP_V1_GALLERY_ITEMS.map((item) => item.group), [
    ...Array.from({ length: 6 }, () => "training" as const),
    ...Array.from({ length: 10 }, () => "partnership" as const),
  ]);

  for (const item of LP_V1_GALLERY_ITEMS) {
    if (item.src.startsWith("/gallery/")) {
      assert.ok(sharedGallerySources.has(item.src), `${item.id} must reference the shared gallery manifest`);
    } else {
      assert.ok(item.src.startsWith("/lp/v1/"), `${item.id} has an unsupported image path`);
    }

    const assetPath = path.join(PUBLIC_DIRECTORY, item.src.slice(1));
    assert.ok((await stat(assetPath)).size > 0, `${item.id} image is missing or empty`);
  }

  for (const locale of LOCALES) {
    const localizedItems = getLpV1GalleryItems(locale);
    assert.equal(localizedItems.length, 16);
    for (const item of localizedItems) {
      assert.ok(item.alt.trim(), `${locale}:${item.id} alt text is empty`);
      assert.ok(item.caption.trim(), `${locale}:${item.id} caption is empty`);
    }
  }
});

test("lp/v1 PDF hrefs resolve to byte-identical deployable catalog files", async () => {
  for (const locale of LOCALES) {
    const href = LP_V1_PDF_HREFS[locale];
    assert.match(href, /^\/downloads\/kts-caregiver-catalog-(ko|ja)-v1\.pdf$/);

    const filename = path.basename(href);
    const publicPdf = await readFile(path.join(PUBLIC_DIRECTORY, href.slice(1)));
    const outputPdf = await readFile(path.join(OUTPUT_PDF_DIRECTORY, filename));

    assert.ok(publicPdf.length > 10_000, `${locale} public PDF is unexpectedly small`);
    assert.equal(publicPdf.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.match(publicPdf.subarray(-1024).toString("latin1"), /%%EOF/);
    const publicDigest = sha256(publicPdf);
    assert.equal(publicDigest, sha256(outputPdf));

    const approvedDigest = APPROVED_PDF_SHA256[locale];
    if (approvedDigest) {
      assert.equal(publicDigest, approvedDigest, `${locale} PDF differs from its approved digest`);
    }

    const rejectedDigest = REJECTED_PDF_SHA256[locale];
    if (rejectedDigest) {
      assert.notEqual(publicDigest, rejectedDigest, `${locale} PDF is still the superseded catalog`);
    }
  }
});
