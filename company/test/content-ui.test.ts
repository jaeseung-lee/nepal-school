import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("contact UI uses generic mobile labels, stable detail keys, and renders reassurance after the notice", () => {
  const form = read("components/contact-form.tsx");
  const content = read("components/page-content/contact-content.tsx");

  assert.doesNotMatch(form, /messages\.site\.areaServed\[phone\.market\]/);
  assert.match(form, />\{messages\.common\.mobile\}<\/span>/);
  assert.match(form, /\{form\.notice\}[\s\S]*\{form\.reassurance\}/);

  assert.doesNotMatch(content, /messages\.site\.areaServed\[phone\.market\]/);
  assert.match(content, /label: messages\.common\.mobile/);
  for (const key of ["founder", "business-number", "address", "email"]) {
    assert.match(content, new RegExp(`key: "${key}"`));
  }
  assert.match(content, /key: `phone-\$\{phone\.countryCode\}`/);
  assert.match(content, /<div key=\{item\.key\}/);
});

test("footer keeps country-prefixed phone labels without rendering network copy", () => {
  const footer = read("components/site-footer.tsx");

  assert.match(footer, /messages\.site\.areaServed\[phone\.market\]/);
  assert.match(footer, /messages\.footer\.description/);
  assert.match(footer, /messages\.footer\.countries/);
  assert.doesNotMatch(footer, /messages\.footer\.network/);
});

test("blog articles omit drafting disclosure UI and dead copy while preserving schema and official sources", () => {
  const article = read("components/blog/blog-article.tsx");
  const copy = read("lib/blog-copy.ts");

  assert.doesNotMatch(article, /disclosure-title|CheckCircle|generationMethod|post\.reviewer/);
  assert.doesNotMatch(copy, /\b(?:reviewer|reviewedAt|disclosureTitle|aiDisclosure|humanDisclosure|legalNotice|revisions):/);
  assert.match(article, /<BlogPostSchema post=\{post\}/);
  assert.match(article, /aria-labelledby="sources-title"/);
  assert.match(article, /post\.sources\.map/);
  assert.match(article, /post\.relatedPosts\.map/);
});
