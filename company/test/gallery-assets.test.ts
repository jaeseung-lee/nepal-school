import assert from "node:assert/strict";
import test from "node:test";
import { GALLERY_ITEMS, GALLERY_LOCALES, getGalleryItems } from "../lib/gallery";
import { validateGalleryAssets } from "../scripts/validate-gallery-assets";

test("gallery originals, manifest, and WebP derivatives remain one-to-one", async () => {
  const result = await validateGalleryAssets();

  assert.deepEqual(result.errors, []);
  assert.equal(result.sourceCount, GALLERY_ITEMS.length);
  assert.equal(result.manifestCount, GALLERY_ITEMS.length);
  assert.equal(result.webpCount, GALLERY_ITEMS.length);
  assert.deepEqual(GALLERY_ITEMS.map((item) => item.order), Array.from({ length: GALLERY_ITEMS.length }, (_, index) => index + 1));
});

test("gallery exposes nonempty localized UI copy for every supported locale", () => {
  for (const locale of GALLERY_LOCALES) {
    const items = getGalleryItems(locale);
    assert.equal(items.length, GALLERY_ITEMS.length);
    for (const item of items) {
      assert.ok(item.title.trim());
      assert.ok(item.description.trim());
      assert.ok(item.alt.trim());
      assert.equal(item.copy[locale].alt, item.alt);
    }
  }
});
