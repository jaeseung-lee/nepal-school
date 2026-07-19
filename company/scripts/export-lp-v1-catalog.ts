import { existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { GALLERY_ITEMS } from "@/lib/gallery";
import {
  LP_V1_COPY,
  LP_V1_META,
  LP_V1_PDF_HREFS,
  LP_V1_SOURCE_URL,
  type LpV1Locale,
} from "@/lib/lp-v1-copy";
import { getLpV1GalleryItems } from "@/lib/lp-v1-gallery";
import { SITE } from "@/lib/site";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "../..");
const PUBLIC_ROOT = join(REPO_ROOT, "company/public");

const PALETTE = {
  paper: "#F7F4EE",
  paperSoft: "#FCFAF5",
  surface: "#FFFFFF",
  cobalt: "#174EA6",
  cobaltSoft: "#E8EFFB",
  deepCobalt: "#0C2E68",
  clay: "#A85B38",
  claySoft: "#F2E7DF",
  ink: "#181A1F",
  muted: "#686B73",
  line: "#DED8CC",
} as const;

const HERO_ORIGINAL = "images/KakaoTalk_Photo_2026-07-18-14-45-32 009.jpeg";

function parseLocale(argv: readonly string[]): LpV1Locale {
  const index = argv.indexOf("--locale");
  const locale = index >= 0 ? argv[index + 1] : undefined;
  if (locale !== "ko" && locale !== "ja") {
    throw new Error("Usage: export-lp-v1-catalog.ts --locale <ko|ja> [--pretty]");
  }
  return locale;
}

function repositoryRelativeImage(src: string, id: string): string {
  const inventoryItem = GALLERY_ITEMS.find((item) => item.id === id);
  if (inventoryItem && existsSync(join(REPO_ROOT, inventoryItem.sourceFile))) {
    return inventoryItem.sourceFile;
  }

  const publicImage = join(PUBLIC_ROOT, src.replace(/^\//, ""));
  if (!existsSync(publicImage)) {
    throw new Error(`Catalog image is missing: ${relative(REPO_ROOT, publicImage)}`);
  }
  return relative(REPO_ROOT, publicImage);
}

function exportCatalog(locale: LpV1Locale) {
  const gallery = [...getLpV1GalleryItems(locale)]
    .sort((left, right) => left.order - right.order)
    .map((item) => ({
      id: item.id,
      src: item.src,
      imageFile: repositoryRelativeImage(item.src, item.id),
      group: item.group,
      order: item.order,
      width: item.width,
      height: item.height,
      aspect: item.aspect,
      objectPosition: item.objectPosition,
      alt: item.alt,
      caption: item.caption,
    }));

  if (gallery.length !== 16 || gallery.some((item, index) => item.order !== index + 1)) {
    throw new Error("LP v1 catalog gallery must expose all 16 consecutively ordered images");
  }

  const landingUrl = `${SITE.url}${locale === "ja" ? "/ja" : ""}/services/japan-caregiver`;
  const heroImage = existsSync(join(REPO_ROOT, HERO_ORIGINAL))
    ? HERO_ORIGINAL
    : "company/public/lp/v1/caregiver-lab.webp";

  return {
    schemaVersion: 1,
    catalogVersion: "v1",
    locale,
    metadata: LP_V1_META[locale],
    copy: LP_V1_COPY[locale],
    pdfHref: LP_V1_PDF_HREFS[locale],
    sourceUrl: LP_V1_SOURCE_URL,
    landingUrl,
    palette: PALETTE,
    hero: {
      imageFile: heroImage,
      objectPosition: "43% 50%",
    },
    gallery,
    contact: {
      email: SITE.email,
      legalName: SITE.legalName,
      brandName: SITE.brandName,
      siteUrl: SITE.url,
    },
  };
}

const locale = parseLocale(process.argv.slice(2));
const pretty = process.argv.includes("--pretty");
process.stdout.write(`${JSON.stringify(exportCatalog(locale), null, pretty ? 2 : undefined)}\n`);
