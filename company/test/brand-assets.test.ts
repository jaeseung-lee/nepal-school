import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { BrandLogo } from "@/components/brand-logo";

const root = path.resolve(import.meta.dirname, "..");

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
