import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

const execFileAsync = promisify(execFile);

/**
 * The encode settings the existing `public/gallery` derivatives were produced
 * with. Reproduced from the shipped files to within ~1%, so new photos sit at
 * the same weight and sharpness as their neighbours.
 */
export const GALLERY_MAX_EDGE = 2200;
export const GALLERY_WEBP_QUALITY = 82;

const SIPS_BINARY = "/usr/bin/sips";
const HEIF_EXTENSIONS = new Set([".heic", ".heif"]);

/**
 * The bundled sharp binary ships an AV1 decoder only, so it advertises HEIF
 * container support while failing on the HEVC-coded files iPhones actually
 * produce. macOS ImageIO reads them, so route those through `sips` first.
 * PNG is used for the hand-off because it is lossless and, having no
 * orientation tag, cannot rotate twice.
 */
async function decodeHeifToPng(sourcePath: string, workingDirectory: string): Promise<string> {
  const pngPath = path.join(workingDirectory, `${path.basename(sourcePath, path.extname(sourcePath))}.png`);
  await execFileAsync(SIPS_BINARY, ["-s", "format", "png", "--out", pngPath, sourcePath]);
  return pngPath;
}

/**
 * Writes the metadata-free WebP that `validate-gallery-assets.ts` demands.
 * sharp emits no EXIF/XMP/ICC unless asked, so never add `withMetadata`,
 * `keepMetadata`, `keepExif`, or `keepIccProfile` here — each one re-adds a
 * chunk the validator rejects, and the build fails.
 */
export async function buildGalleryDerivative(sourcePath: string, destinationPath: string): Promise<void> {
  const needsHeifDecode = HEIF_EXTENSIONS.has(path.extname(sourcePath).toLowerCase());
  const workingDirectory = needsHeifDecode ? await mkdtemp(path.join(tmpdir(), "gallery-derivative-")) : null;

  try {
    const decodedPath = workingDirectory ? await decodeHeifToPng(sourcePath, workingDirectory) : sourcePath;

    await sharp(decodedPath)
      .rotate() // bake EXIF orientation before resizing; a no-op when absent
      .resize({ width: GALLERY_MAX_EDGE, height: GALLERY_MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: GALLERY_WEBP_QUALITY })
      .toFile(destinationPath);
  } finally {
    if (workingDirectory) await rm(workingDirectory, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const [sourcePath, destinationPath] = process.argv.slice(2);
  if (!sourcePath || !destinationPath) {
    throw new Error("Usage: build-gallery-derivative.ts <source image> <destination .webp>");
  }

  await buildGalleryDerivative(sourcePath, destinationPath);
  const { width, height, size } = await sharp(destinationPath).metadata();
  console.log(`${destinationPath}: ${width}x${height}, ${size} bytes.`);
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith("build-gallery-derivative.ts")) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
