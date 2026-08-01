import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { BrandLogo } from "@/components/brand-logo";
import OrganizationSchema from "@/components/organization-schema";
import { buildPageMetadata, buildRootMetadata } from "@/lib/seo";

const root = path.resolve(import.meta.dirname, "..");
const { createElement } = React;
const sourceSha256 = "03d31c21877613ffd0d388436af4ad23bc319c199f44f60a03c4b27b8c65366e";
const generatedAssets = [
  "public/brand/logo-color.svg",
  "public/brand/logo-white.svg",
  "public/brand/logo-black.svg",
  "public/brand/mark-color.svg",
  "public/brand/og-image.png",
  "app/icon.svg",
  "app/apple-icon.png",
  "app/favicon.ico",
] as const;

// tsx executes TSX with the classic React runtime; match the app's server renderer
// so calling this server component directly exposes its script element.
globalThis.React = React;

const expectedSvgFiles = [
  "public/brand/logo-color.svg",
  "public/brand/logo-white.svg",
  "public/brand/logo-black.svg",
  "public/brand/mark-color.svg",
  "app/icon.svg",
];

function readPngDimensions(file: string) {
  const buffer = fs.readFileSync(file);
  assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readIcoSizes(file: string) {
  const buffer = fs.readFileSync(file);
  assert.equal(buffer.readUInt16LE(0), 0, "ICO reserved field must be zero");
  assert.equal(buffer.readUInt16LE(2), 1, "ICO type must be icon");

  const count = buffer.readUInt16LE(4);
  return Array.from({ length: count }, (_, index) => {
    const offset = 6 + index * 16;
    return buffer.readUInt8(offset) || 256;
  });
}

function readViewBox(svg: string, file: string) {
  const match = svg.match(/\bviewBox="([^"]+)"/i);
  assert.ok(match, `${file} must define a viewBox`);
  const values = match[1].trim().split(/\s+/).map(Number);
  assert.equal(values.length, 4, `${file} viewBox must have four values`);
  assert.ok(values.every(Number.isFinite), `${file} viewBox values must be numeric`);
  return values;
}

test("official brand assets satisfy the published vector and raster contract", () => {
  for (const file of expectedSvgFiles) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} must exist`);
    const svg = fs.readFileSync(path.join(root, file), "utf8");
    assert.match(svg, /<svg\b/);
    assert.match(svg, /<path\b/);
    assert.doesNotMatch(svg, /<text\b|<image\b/i);
  }

  for (const file of [
    "public/brand/logo-color.svg",
    "public/brand/logo-white.svg",
    "public/brand/logo-black.svg",
  ]) {
    const [, , width, height] = readViewBox(fs.readFileSync(path.join(root, file), "utf8"), file);
    const ratio = width / height;
    assert.ok(ratio > 3.9 && ratio < 4.0, `${file} must retain its full-lockup ratio`);
  }

  const [, , markWidth, markHeight] = readViewBox(
    fs.readFileSync(path.join(root, "public/brand/mark-color.svg"), "utf8"),
    "public/brand/mark-color.svg",
  );
  const markRatio = markWidth / markHeight;
  assert.ok(markRatio > 1.35 && markRatio < 1.45, "mark-color.svg must retain its tight-mark ratio");

  assert.deepEqual(readPngDimensions(path.join(root, "app/apple-icon.png")), { width: 180, height: 180 });
  assert.deepEqual(readPngDimensions(path.join(root, "public/brand/og-image.png")), { width: 1200, height: 630 });
  assert.deepEqual(readIcoSizes(path.join(root, "app/favicon.ico")).sort((a, b) => a - b), [16, 32, 48]);
});

test("tracked Illustrator source reproduces every committed brand asset byte for byte", () => {
  const source = path.join(root, "assets", "brand", "logo.ai");
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "brand-assets-reproduction-"));

  try {
    assert.equal(
      createHash("sha256").update(fs.readFileSync(source)).digest("hex"),
      sourceSha256,
      "tracked logo.ai must match the approved source checksum",
    );

    const exported = spawnSync(
      process.execPath,
      [path.join(root, "scripts", "export-brand-assets.mjs"), "--output-root", outputRoot],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(
      exported.status,
      0,
      `brand exporter must succeed with the tracked source:\n${exported.stderr || exported.stdout}`,
    );

    for (const asset of generatedAssets) {
      assert.deepEqual(
        fs.readFileSync(path.join(outputRoot, asset)),
        fs.readFileSync(path.join(root, asset)),
        `${asset} must be byte-identical after a clean export`,
      );
    }
  } finally {
    fs.rmSync(outputRoot, { recursive: true, force: true });
  }
});

test("official social card preserves the light background around the lockup", async () => {
  const { data, info } = await sharp(path.join(root, "public/brand/og-image.png"))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const x = 600;
  const y = 205;
  const pixelOffset = (y * info.width + x) * info.channels;

  assert.deepEqual(
    [...data.subarray(pixelOffset, pixelOffset + 4)],
    [247, 244, 237, 255],
    "the lockup's padded top edge must composite to the #F7F4ED card background",
  );
});

test("BrandLogo renders the official lockup and mark at their intrinsic dimensions", () => {
  const lockup = renderToStaticMarkup(createElement(BrandLogo, { kind: "lockup" }));
  const mark = renderToStaticMarkup(createElement(BrandLogo, { kind: "mark" }));

  assert.match(lockup, /src="\/brand\/logo-color\.svg"/);
  assert.match(lockup, /width="785"/);
  assert.match(lockup, /height="198"/);
  assert.match(mark, /src="\/brand\/mark-color\.svg"/);
  assert.match(mark, /width="277"/);
  assert.match(mark, /height="198"/);
  assert.match(lockup + mark, /alt=""/);
});

test("BrandLogo exposes an optional screen-reader label while keeping its image decorative", () => {
  const screenReaderLabel = "정우 인재개발원 — Joongwoo Human Resources Development Institute";
  const logo = renderToStaticMarkup(createElement(BrandLogo, { kind: "lockup", screenReaderLabel }));

  assert.match(logo, /aria-hidden="true"/);
  assert.ok(logo.includes(`<span class="sr-only">${screenReaderLabel}</span>`));
});

test("default social metadata and Organization JSON-LD use the published brand assets", () => {
  const rootMetadata = buildRootMetadata("ko");
  const pageMetadata = buildPageMetadata({
    title: "채용 지원",
    description: "정우인재개발원 채용 지원 안내",
    path: "/contact",
  });
  const organizationScript = OrganizationSchema();
  const organization = JSON.parse(organizationScript.props.dangerouslySetInnerHTML.__html);
  const rootOpenGraphImages = rootMetadata.openGraph?.images;
  const pageOpenGraphImages = pageMetadata.openGraph?.images;

  assert.ok(Array.isArray(rootOpenGraphImages));
  const rootOpenGraphImage = rootOpenGraphImages[0];
  assert.ok(rootOpenGraphImage && typeof rootOpenGraphImage === "object" && "url" in rootOpenGraphImage);
  assert.equal(rootOpenGraphImage.url, "/brand/og-image.png");
  assert.deepEqual(rootMetadata.twitter?.images, ["/brand/og-image.png"]);
  assert.ok(Array.isArray(pageOpenGraphImages));
  const pageOpenGraphImage = pageOpenGraphImages[0];
  assert.ok(pageOpenGraphImage && typeof pageOpenGraphImage === "object" && "url" in pageOpenGraphImage);
  assert.equal(pageOpenGraphImage.url, "/brand/og-image.png");
  assert.deepEqual(pageMetadata.twitter?.images, ["/brand/og-image.png"]);
  assert.equal(organization.logo, "https://www.joongwoohrd.com/brand/logo-color.svg");
  assert.equal(organization.image, "https://www.joongwoohrd.com/brand/og-image.png");
});
