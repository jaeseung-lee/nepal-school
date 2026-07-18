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
import { LP_V1_PDF_HREFS, type LpV1Locale } from "../lib/lp-v1-copy";

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

test("lp/v1 gallery keeps the approved 6 training + 10 partnership contact sheet", async () => {
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
  const pdfItems = LP_V1_GALLERY_ITEMS
    .filter((item) => item.pdfOrder !== undefined)
    .sort((first, second) => (first.pdfOrder ?? 0) - (second.pdfOrder ?? 0));
  assert.deepEqual(pdfItems.map((item) => item.pdfOrder), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(pdfItems.map((item) => item.group), [
    "training",
    "training",
    "training",
    "partnership",
    "partnership",
    "partnership",
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
    assert.equal(sha256(publicPdf), sha256(outputPdf));
  }
});
