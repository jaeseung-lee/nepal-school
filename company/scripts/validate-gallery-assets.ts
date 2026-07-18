import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GALLERY_ITEMS,
  GALLERY_LOCALES,
  type GalleryCategory,
  type GalleryItem,
} from "../lib/gallery";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
export const COMPANY_DIRECTORY = path.resolve(SCRIPT_DIRECTORY, "..");
export const REPOSITORY_DIRECTORY = path.resolve(COMPANY_DIRECTORY, "..");
export const GALLERY_SOURCE_DIRECTORY = path.join(REPOSITORY_DIRECTORY, "images");
export const GALLERY_PUBLIC_DIRECTORY = path.join(COMPANY_DIRECTORY, "public", "gallery");

const SOURCE_IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".heic",
  ".heif",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".webp",
]);

const GALLERY_CATEGORIES = new Set<GalleryCategory>([
  "training",
  "facilities",
  "visits",
  "meetings",
]);

export type GalleryAssetValidationResult = {
  sourceCount: number;
  manifestCount: number;
  webpCount: number;
  errors: string[];
};

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  return [...duplicates].sort();
}

async function directoryExists(directory: string): Promise<boolean> {
  try {
    return (await stat(directory)).isDirectory();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function findFilesRecursively(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findFilesRecursively(entryPath);
    return entry.isFile() ? [entryPath] : [];
  }));

  return nested.flat();
}

function isSupportedSourceImage(filePath: string): boolean {
  return SOURCE_IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function isWithin(directory: string, candidate: string): boolean {
  const relative = path.relative(directory, candidate);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

function publicPathForFile(filePath: string): string {
  return `/gallery/${toPosixPath(path.relative(GALLERY_PUBLIC_DIRECTORY, filePath))}`;
}

function inspectManifestItem(item: GalleryItem, errors: string[]): void {
  if (!item.id.trim()) errors.push("Gallery manifest contains an item with an empty id.");
  if (!Number.isInteger(item.order) || item.order < 1) {
    errors.push(`Gallery item ${item.id || "<unknown>"} has an invalid order: ${item.order}.`);
  }
  if (!GALLERY_CATEGORIES.has(item.category)) {
    errors.push(`Gallery item ${item.id || "<unknown>"} has an unsupported category: ${String(item.category)}.`);
  }

  const normalizedSource = toPosixPath(path.relative(
    REPOSITORY_DIRECTORY,
    path.resolve(REPOSITORY_DIRECTORY, item.sourceFile),
  ));
  if (!item.sourceFile.startsWith("images/") || normalizedSource !== item.sourceFile) {
    errors.push(`Gallery item ${item.id || "<unknown>"} has an invalid sourceFile: ${item.sourceFile}.`);
  }

  const destinationRelativePath = item.src.startsWith("/gallery/")
    ? item.src.slice("/gallery/".length)
    : "";
  const destinationPath = path.resolve(GALLERY_PUBLIC_DIRECTORY, destinationRelativePath);
  if (!item.src.startsWith("/gallery/") || !item.src.endsWith(".webp") || !isWithin(GALLERY_PUBLIC_DIRECTORY, destinationPath)) {
    errors.push(`Gallery item ${item.id || "<unknown>"} has an invalid WebP destination: ${item.src}.`);
  }

  for (const locale of GALLERY_LOCALES) {
    const copy = item.copy?.[locale];
    if (!copy || typeof copy !== "object") {
      errors.push(`Gallery item ${item.id || "<unknown>"} is missing ${locale} copy.`);
      continue;
    }

    for (const field of ["title", "description", "alt"] as const) {
      if (typeof copy[field] !== "string" || !copy[field].trim()) {
        errors.push(`Gallery item ${item.id || "<unknown>"} has empty ${locale}.${field} copy.`);
      }
    }
  }
}

async function inspectWebp(filePath: string): Promise<string[]> {
  const errors: string[] = [];
  let fileSize = 0;

  try {
    fileSize = (await stat(filePath)).size;
  } catch (error) {
    return [`Unable to read WebP asset ${publicPathForFile(filePath)}: ${(error as Error).message}`];
  }

  if (fileSize === 0) return [`WebP asset is empty: ${publicPathForFile(filePath)}.`];

  let data: Buffer;
  try {
    data = await readFile(filePath);
  } catch (error) {
    return [`Unable to read WebP asset ${publicPathForFile(filePath)}: ${(error as Error).message}`];
  }

  if (data.length < 12 || data.subarray(0, 4).toString("ascii") !== "RIFF" || data.subarray(8, 12).toString("ascii") !== "WEBP") {
    return [`WebP asset does not have a valid RIFF/WEBP header: ${publicPathForFile(filePath)}.`];
  }

  const declaredRiffSize = data.readUInt32LE(4);
  if (declaredRiffSize + 8 !== data.length || declaredRiffSize + 8 !== fileSize) {
    errors.push(`WebP asset has an invalid RIFF length: ${publicPathForFile(filePath)}.`);
  }

  let offset = 12;
  while (offset + 8 <= data.length) {
    const chunkType = data.subarray(offset, offset + 4).toString("ascii");
    const chunkLength = data.readUInt32LE(offset + 4);
    const nextOffset = offset + 8 + chunkLength + (chunkLength % 2);

    if (nextOffset > data.length) {
      errors.push(`WebP asset has a truncated ${chunkType} chunk: ${publicPathForFile(filePath)}.`);
      break;
    }
    if (chunkType === "EXIF" || chunkType === "XMP " || chunkType === "ICCP") {
      errors.push(`WebP asset must not retain ${chunkType.trim()} metadata: ${publicPathForFile(filePath)}.`);
    }
    offset = nextOffset;
  }

  if (offset !== data.length && offset + 8 > data.length) {
    errors.push(`WebP asset has trailing bytes after its RIFF chunks: ${publicPathForFile(filePath)}.`);
  }

  return errors;
}

/**
 * Verifies that every original in `images/` has exactly one public WebP and
 * that the manifest is the complete, localized bridge between the two.
 */
export async function validateGalleryAssets(
  items: readonly GalleryItem[] = GALLERY_ITEMS,
): Promise<GalleryAssetValidationResult> {
  const errors: string[] = [];
  const sourceDirectoryExists = await directoryExists(GALLERY_SOURCE_DIRECTORY);
  const publicDirectoryExists = await directoryExists(GALLERY_PUBLIC_DIRECTORY);

  if (!sourceDirectoryExists) errors.push(`Gallery source directory is missing: ${GALLERY_SOURCE_DIRECTORY}.`);
  if (!publicDirectoryExists) errors.push(`Public gallery directory is missing: ${GALLERY_PUBLIC_DIRECTORY}.`);

  const sourceFiles = sourceDirectoryExists
    ? (await findFilesRecursively(GALLERY_SOURCE_DIRECTORY)).filter(isSupportedSourceImage).sort()
    : [];
  const webpFiles = publicDirectoryExists
    ? (await findFilesRecursively(GALLERY_PUBLIC_DIRECTORY)).filter((filePath) => path.extname(filePath).toLowerCase() === ".webp").sort()
    : [];
  const sourcePaths = sourceFiles.map((filePath) => toPosixPath(path.relative(REPOSITORY_DIRECTORY, filePath)));
  const publicWebpPaths = webpFiles.map(publicPathForFile);

  for (const item of items) inspectManifestItem(item, errors);

  for (const duplicate of duplicateValues(items.map((item) => item.id))) {
    errors.push(`Gallery manifest has a duplicate id: ${duplicate}.`);
  }
  for (const duplicate of duplicateValues(items.map((item) => String(item.order)))) {
    errors.push(`Gallery manifest has a duplicate order: ${duplicate}.`);
  }
  for (const duplicate of duplicateValues(items.map((item) => item.sourceFile))) {
    errors.push(`Gallery manifest has a duplicate sourceFile: ${duplicate}.`);
  }
  for (const duplicate of duplicateValues(items.map((item) => item.src))) {
    errors.push(`Gallery manifest has a duplicate WebP destination: ${duplicate}.`);
  }

  const manifestSources = new Set<string>(items.map((item) => item.sourceFile));
  const manifestDestinations = new Set<string>(items.map((item) => item.src));
  const actualSources = new Set(sourcePaths);
  const actualWebps = new Set(publicWebpPaths);

  for (const sourcePath of sourcePaths) {
    if (!manifestSources.has(sourcePath)) errors.push(`Source image is missing from the gallery manifest: ${sourcePath}.`);
  }
  for (const sourcePath of manifestSources) {
    if (!actualSources.has(sourcePath)) errors.push(`Gallery manifest references a missing source image: ${sourcePath}.`);
  }
  for (const destination of manifestDestinations) {
    if (!actualWebps.has(destination)) errors.push(`Gallery manifest references a missing WebP asset: ${destination}.`);
  }
  for (const publicWebpPath of publicWebpPaths) {
    if (!manifestDestinations.has(publicWebpPath)) errors.push(`Orphan public gallery WebP asset: ${publicWebpPath}.`);
  }

  for (const webpPath of webpFiles) {
    errors.push(...await inspectWebp(webpPath));
  }

  return {
    sourceCount: sourceFiles.length,
    manifestCount: items.length,
    webpCount: webpFiles.length,
    errors: errors.sort(),
  };
}

export async function runGalleryAssetValidation(): Promise<GalleryAssetValidationResult> {
  const result = await validateGalleryAssets();
  console.log(`Gallery assets: ${result.sourceCount} source image(s), ${result.manifestCount} manifest item(s), ${result.webpCount} WebP asset(s).`);

  if (result.errors.length === 0) {
    console.log("Gallery asset validation passed.");
    return result;
  }

  for (const error of result.errors) console.error(`- ${error}`);
  process.exitCode = 1;
  return result;
}

const invokedScript = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedScript === fileURLToPath(import.meta.url)) {
  void runGalleryAssetValidation().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
