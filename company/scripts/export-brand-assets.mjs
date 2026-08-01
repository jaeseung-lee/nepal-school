import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const FULL_ARTBOARDS = [
  { page: 1, name: "logo-color.svg", x: 28.3473, y: 217.794, width: 785.196, height: 198.413 },
  { page: 2, name: "logo-white.svg", x: 28.3473, y: 198.431, width: 785.196, height: 198.414 },
  { page: 3, name: "logo-black.svg", x: 28.3473, y: 198.431, width: 785.196, height: 198.414 },
];
const MARK = { x: 28.3473, y: 217.794, width: 277, height: 198.413 };
const ICON = { x: 28.3473, y: 178.5005, width: 277, height: 277 };
const LIGHT_BACKGROUND = "#F7F4ED";

const companyRoot = path.resolve(import.meta.dirname, "..");
const brandDirectory = path.join(companyRoot, "public", "brand");
const appDirectory = path.join(companyRoot, "app");

function fail(message) {
  throw new Error(`Brand asset export failed: ${message}`);
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) fail(`${command} could not run: ${result.error.message}`);
  if (result.status !== 0) {
    fail(`${command} exited with ${result.status}: ${(result.stderr || result.stdout || "unknown error").trim()}`);
  }
  return result.stdout;
}

function verifyPageCount(source) {
  const details = run("pdfinfo", [source]);
  const pages = Number(details.match(/^Pages:\s+(\d+)$/m)?.[1]);
  if (!Number.isInteger(pages) || pages < 3) {
    fail(`source must contain at least three pages; found ${Number.isInteger(pages) ? pages : "an unreadable page count"}`);
  }
}

function cropSvg(svg, { x, y, width, height }) {
  const openingTag = svg.match(/<svg\b[^>]*>/i)?.[0];
  if (!openingTag) fail("pdftocairo output has no root SVG element");

  const attributes = {
    width: String(width),
    height: String(height),
    viewBox: `${x} ${y} ${width} ${height}`,
  };
  let replacement = openingTag;
  for (const [name, value] of Object.entries(attributes)) {
    const pattern = new RegExp(`\\s${name}=("[^"]*"|'[^']*')`, "i");
    replacement = pattern.test(replacement)
      ? replacement.replace(pattern, ` ${name}="${value}"`)
      : replacement.replace(/>$/, ` ${name}="${value}">`);
  }
  return svg.replace(openingTag, replacement);
}

function packIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const directories = images.map(({ size, buffer }) => {
    const directory = Buffer.alloc(16);
    directory.writeUInt8(size === 256 ? 0 : size, 0);
    directory.writeUInt8(size === 256 ? 0 : size, 1);
    directory.writeUInt16LE(1, 4);
    directory.writeUInt16LE(32, 6);
    directory.writeUInt32LE(buffer.length, 8);
    directory.writeUInt32LE(offset, 12);
    offset += buffer.length;
    return directory;
  });

  return Buffer.concat([header, ...directories, ...images.map(({ buffer }) => buffer)]);
}

async function renderAssets(colorSvg, markSvg, iconSvg) {
  const mark = Buffer.from(markSvg);
  const faviconImages = await Promise.all(
    [16, 32, 48].map(async (size) => ({
      size,
      buffer: await sharp(mark).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
    })),
  );
  const appleIcon = await sharp(Buffer.from(iconSvg))
    .resize(180, 180, { fit: "contain", background: LIGHT_BACKGROUND })
    .flatten({ background: LIGHT_BACKGROUND })
    .png()
    .toBuffer();
  const lockup = await sharp(Buffer.from(colorSvg)).resize(820, 230, { fit: "contain" }).png().toBuffer();
  const lockupMetadata = await sharp(lockup).metadata();
  const ogImage = await sharp({
    create: { width: 1200, height: 630, channels: 4, background: LIGHT_BACKGROUND },
  })
    .composite([{
      input: lockup,
      left: Math.round((1200 - (lockupMetadata.width ?? 820)) / 2),
      top: Math.round((630 - (lockupMetadata.height ?? 230)) / 2),
    }])
    .png()
    .toBuffer();

  return { appleIcon, favicon: packIco(faviconImages), ogImage };
}

async function main() {
  const source = process.argv[2];
  if (!source) fail("missing source argument; pass an absolute Illustrator/PDF-compatible file path");
  if (!path.isAbsolute(source)) fail("source path must be absolute");
  if (!fs.existsSync(source)) fail(`source does not exist: ${source}`);
  verifyPageCount(source);

  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "brand-assets-"));
  try {
    const svgByPage = new Map();
    for (const artboard of FULL_ARTBOARDS) {
      const exported = path.join(temporaryDirectory, `page-${artboard.page}.svg`);
      run("pdftocairo", ["-svg", "-f", String(artboard.page), "-l", String(artboard.page), source, exported]);
      if (!fs.existsSync(exported)) fail(`pdftocairo did not create page ${artboard.page}`);
      svgByPage.set(artboard.page, fs.readFileSync(exported, "utf8"));
    }

    const fullSvgs = FULL_ARTBOARDS.map((artboard) => ({
      name: artboard.name,
      svg: cropSvg(svgByPage.get(artboard.page), artboard),
    }));
    const pageOneSvg = svgByPage.get(1);
    const markSvg = cropSvg(pageOneSvg, MARK);
    const iconSvg = cropSvg(pageOneSvg, ICON);
    const rasterAssets = await renderAssets(fullSvgs[0].svg, markSvg, iconSvg);

    fs.mkdirSync(brandDirectory, { recursive: true });
    for (const { name, svg } of fullSvgs) fs.writeFileSync(path.join(brandDirectory, name), svg);
    fs.writeFileSync(path.join(brandDirectory, "mark-color.svg"), markSvg);
    fs.writeFileSync(path.join(brandDirectory, "og-image.png"), rasterAssets.ogImage);
    fs.writeFileSync(path.join(appDirectory, "icon.svg"), iconSvg);
    fs.writeFileSync(path.join(appDirectory, "apple-icon.png"), rasterAssets.appleIcon);
    fs.writeFileSync(path.join(appDirectory, "favicon.ico"), rasterAssets.favicon);

    const requiredOutputs = [
      ...fullSvgs.map(({ name }) => path.join(brandDirectory, name)),
      path.join(brandDirectory, "mark-color.svg"),
      path.join(brandDirectory, "og-image.png"),
      path.join(appDirectory, "icon.svg"),
      path.join(appDirectory, "apple-icon.png"),
      path.join(appDirectory, "favicon.ico"),
    ];
    for (const output of requiredOutputs) {
      if (!fs.existsSync(output)) fail(`required output is absent: ${output}`);
    }
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
