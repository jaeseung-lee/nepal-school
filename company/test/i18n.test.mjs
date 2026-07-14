import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const TEST_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIRECTORY = path.resolve(TEST_DIRECTORY, "..", "messages");
const BASE_LOCALE = "ko";
const SUPPORTED_LOCALES = ["ko", "en", "ja", "ne", "vi", "lo"];

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getCatalogPath(locale, catalogDirectory) {
  return path.join(catalogDirectory, `${locale}.json`);
}

function readCatalog(locale, catalogDirectory) {
  const catalogPath = getCatalogPath(locale, catalogDirectory);

  assert.ok(
    existsSync(catalogPath),
    `Missing ${locale} translation catalog: ${path.relative(process.cwd(), catalogPath)}`,
  );

  try {
    return JSON.parse(readFileSync(catalogPath, "utf8"));
  } catch (error) {
    assert.fail(
      `Unable to parse ${locale} translation catalog (${path.relative(process.cwd(), catalogPath)}): ${error.message}`,
    );
  }
}

function getCatalogDirectories(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const hasLocaleCatalog = SUPPORTED_LOCALES.some((locale) =>
    entries.some((entry) => entry.isFile() && entry.name === `${locale}.json`),
  );
  const childDirectories = entries
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => getCatalogDirectories(path.join(directory, entry.name)));

  return hasLocaleCatalog ? [directory, ...childDirectories] : childDirectories;
}

function displayPath(keyPath) {
  return keyPath || "<root>";
}

function assertValidCatalog(value, locale, keyPath = "") {
  assert.ok(
    isObject(value),
    `${locale}:${displayPath(keyPath)} must be an object, not ${Array.isArray(value) ? "an array" : typeof value}`,
  );

  const keys = Object.keys(value);

  assert.ok(keys.length > 0, `${locale}:${displayPath(keyPath)} must not be an empty object`);

  for (const key of keys) {
    const childPath = keyPath ? `${keyPath}.${key}` : key;
    const child = value[key];

    if (isObject(child)) {
      assertValidCatalog(child, locale, childPath);
      continue;
    }

    assert.equal(
      typeof child,
      "string",
      `${locale}:${childPath} must be a string leaf, not ${Array.isArray(child) ? "an array" : typeof child}`,
    );
    assert.ok(child.trim().length > 0, `${locale}:${childPath} must not be an empty string`);
  }
}

function assertSameStructure(base, translated, locale, keyPath = "") {
  const baseKeys = Object.keys(base).sort();
  const translatedKeys = Object.keys(translated).sort();

  assert.deepEqual(
    translatedKeys,
    baseKeys,
    `${locale}:${displayPath(keyPath)} must have exactly the same keys as ${BASE_LOCALE}`,
  );

  for (const key of baseKeys) {
    const childPath = keyPath ? `${keyPath}.${key}` : key;
    const baseValue = base[key];
    const translatedValue = translated[key];
    const baseIsObject = isObject(baseValue);
    const translatedIsObject = isObject(translatedValue);

    assert.equal(
      translatedIsObject,
      baseIsObject,
      `${locale}:${childPath} must have the same object/string type as ${BASE_LOCALE}`,
    );

    if (baseIsObject) {
      assertSameStructure(baseValue, translatedValue, locale, childPath);
    }
  }
}

test("all translation catalog groups match their Korean baseline", () => {
  const catalogDirectories = getCatalogDirectories(MESSAGES_DIRECTORY);

  assert.ok(catalogDirectories.length > 0, "No translation catalog directories were found");

  for (const catalogDirectory of catalogDirectories) {
    const catalogLabel = path.relative(MESSAGES_DIRECTORY, catalogDirectory) || ".";
    const catalogs = new Map(
      SUPPORTED_LOCALES.map((locale) => [locale, readCatalog(locale, catalogDirectory)]),
    );
    const koreanCatalog = catalogs.get(BASE_LOCALE);

    assertValidCatalog(koreanCatalog, `${BASE_LOCALE}:${catalogLabel}`);

    for (const locale of SUPPORTED_LOCALES) {
      const catalog = catalogs.get(locale);
      const catalogLocale = `${locale}:${catalogLabel}`;

      assertValidCatalog(catalog, catalogLocale);

      if (locale !== BASE_LOCALE) {
        assertSameStructure(koreanCatalog, catalog, catalogLocale);
      }
    }
  }
});
