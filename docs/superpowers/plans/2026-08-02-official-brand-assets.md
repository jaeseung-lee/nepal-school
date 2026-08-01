# Official Brand Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Export the supplied Illustrator logo into production-ready vector and social assets, replace every visible JW placeholder and default social preview, verify the result in a browser, and commit only logo-related changes.

**Architecture:** A deterministic Node exporter converts the PDF-compatible Illustrator artboards through pdftocairo, tightens their SVG view boxes, and uses the installed Sharp package to create raster derivatives. A reusable BrandLogo component owns asset selection and dimensions. Shared SEO metadata references a stable static social card, while editorial pages keep their existing image overrides.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Node.js, Sharp 0.34, Poppler pdftocairo, native node:test, in-app browser screenshots.

## Global Constraints

- Preserve every existing uncommitted content-refresh change; stage only files listed in this plan.
- Preserve source geometry and colors; never recreate the outlined lettering with a font.
- Keep blog, business-area, and caregiver social images unchanged.
- Store reusable brand files under company/public/brand/ and Next browser icons under company/app/.
- Use the full color lockup in the public header and footer and the official symbol in compact internal placements.
- Use a 1200 x 630 light-background static default card for both Open Graph and Twitter.
- Point Organization JSON-LD logo to the dedicated SVG and image to the default social card.
- Save browser captures under ignored tmp/brand-qa/ and do not add them to git.

---

### Task 1: Deterministic brand export and asset contract

**Files:**
- Create: company/scripts/export-brand-assets.mjs
- Create: company/test/brand-assets.test.ts
- Create: company/assets/brand/logo.ai
- Create: company/assets/brand/README.md
- Create: company/public/brand/logo-color.svg
- Create: company/public/brand/logo-white.svg
- Create: company/public/brand/logo-black.svg
- Create: company/public/brand/mark-color.svg
- Create: company/public/brand/og-image.png
- Modify: company/app/icon.svg
- Modify: company/app/favicon.ico
- Modify: company/app/apple-icon.png
- Modify: company/package.json
- Modify: company/package-lock.json

**Interfaces:**
- Consumes: the checksum-verified `company/assets/brand/logo.ai` source by default, with an optional checksum-equivalent absolute source path.
- Produces: the five public brand assets plus the three Next browser-icon assets under the company root, or under an absolute `--output-root` for clean reproducibility checks.

- [x] **Step 1: Write the failing asset contract test**

Create test/brand-assets.test.ts with this SVG contract and helpers that read PNG IHDR dimensions and ICO directory records:

~~~ts
const expectedSvgFiles = [
  "public/brand/logo-color.svg",
  "public/brand/logo-white.svg",
  "public/brand/logo-black.svg",
  "public/brand/mark-color.svg",
  "app/icon.svg",
];

for (const file of expectedSvgFiles) {
  assert.equal(fs.existsSync(path.join(root, file)), true, `${file} must exist`);
  const svg = fs.readFileSync(path.join(root, file), "utf8");
  assert.match(svg, /<svg\b/);
  assert.match(svg, /<path\b/);
  assert.doesNotMatch(svg, /<text\b|<image\b/i);
}
~~~

Assert apple-icon.png is 180 x 180, og-image.png is 1200 x 630, and favicon.ico contains 16, 32, and 48 pixel entries. Parse each SVG viewBox and assert the full-lockup ratio is between 3.9 and 4.0 and the tight mark ratio is between 1.35 and 1.45.

- [x] **Step 2: Run the test and verify it fails**

~~~bash
cd company && node --import tsx --test test/brand-assets.test.ts
~~~

Expected: FAIL because public/brand/logo-color.svg and the other new files do not exist.

- [x] **Step 3: Implement the exporter**

Create scripts/export-brand-assets.mjs using node:child_process, node:crypto, node:fs, node:os, node:path, and sharp. Enforce the approved source SHA-256, support a safe absolute `--output-root`, and use these SVG top-origin crop boxes:

~~~js
const FULL_ARTBOARDS = [
  { page: 1, name: "logo-color.svg", x: 28.3473, y: 217.794, width: 785.196, height: 198.413 },
  { page: 2, name: "logo-white.svg", x: 28.3473, y: 198.431, width: 785.196, height: 198.414 },
  { page: 3, name: "logo-black.svg", x: 28.3473, y: 198.431, width: 785.196, height: 198.414 },
];
const MARK = { x: 28.3473, y: 217.794, width: 277, height: 198.413 };
~~~

For each page, run pdftocairo -svg -f PAGE -l PAGE INPUT OUTPUT. Replace only the root SVG width, height, and viewBox with the crop values. Derive mark-color.svg and square app/icon.svg from page 1; the square icon viewBox is x 28.3473, y 178.5005, width 277, height 277.

Use Sharp to render transparent square mark images at 16, 32, and 48 pixels. Pack the PNG buffers into one ICO using the standard 6-byte header and one 16-byte directory record per image. Render Apple icon at 180 x 180 on #F7F4ED. Composite the color lockup at no more than 820 x 230 pixels onto a 1200 x 630 #F7F4ED canvas.

Exit non-zero with a clear error if the tracked or explicitly supplied source is missing, its checksum differs, Poppler fails, an output is absent, or fewer than three pages are available.

- [x] **Step 4: Export production assets**

~~~bash
cd company
node scripts/export-brand-assets.mjs
~~~

Expected: the five public files and three app icons are written without warnings.

- [x] **Step 5: Run the asset contract**

Run the focused test directly so the concurrently modified package.json remains untouched:

~~~bash
cd company && node --import tsx --test test/brand-assets.test.ts
~~~

Expected: PASS, including a clean export into a temporary output root and byte comparison against every committed derivative.

- [x] **Step 6: Commit the asset unit and implementation plan**

~~~bash
git add company/scripts/export-brand-assets.mjs company/test/brand-assets.test.ts company/assets/brand company/package-lock.json company/public/brand company/app/icon.svg company/app/favicon.ico company/app/apple-icon.png docs/superpowers/plans/2026-08-02-official-brand-assets.md
git add -p company/package.json
git commit -m "feat: export official brand assets"
~~~

### Task 2: Reusable component and visible placements

**Files:**
- Create: company/lib/brand.ts
- Create: company/components/brand-logo.tsx
- Modify: company/components/site-header.tsx
- Modify: company/components/site-footer.tsx
- Modify: company/app/(internal)/login/page.tsx
- Modify: company/app/(internal)/sales/layout.tsx
- Modify: company/test/brand-assets.test.ts

**Interfaces:**
- Consumes: Task 1 public asset URLs.
- Produces: BRAND_ASSETS, BRAND_SOCIAL_IMAGE, and BrandLogo props kind, tone, className, and priority.

- [x] **Step 1: Extend the test with component rendering assertions**

Import BrandLogo and render it through react-dom/server. Assert consumer-visible output rather than source text:

~~~tsx
const lockup = renderToStaticMarkup(<BrandLogo kind="lockup" />);
const mark = renderToStaticMarkup(<BrandLogo kind="mark" />);
assert.match(lockup, /src="\/brand\/logo-color\.svg"/);
assert.match(lockup, /width="785"/);
assert.match(lockup, /height="198"/);
assert.match(mark, /src="\/brand\/mark-color\.svg"/);
assert.match(mark, /width="277"/);
assert.match(mark, /height="198"/);
assert.match(lockup + mark, /alt=""/);
~~~

Run the direct brand test command and expect FAIL because BrandLogo does not exist yet. The placement edits are verified through task review and the Task 4 browser captures, which exercise the real Next-rendered pages.

- [x] **Step 2: Define constants**

Create lib/brand.ts:

~~~ts
export const BRAND_ASSETS = {
  lockup: {
    color: "/brand/logo-color.svg",
    white: "/brand/logo-white.svg",
    black: "/brand/logo-black.svg",
  },
  mark: { color: "/brand/mark-color.svg" },
  social: "/brand/og-image.png",
} as const;

export const BRAND_SOCIAL_IMAGE = {
  url: BRAND_ASSETS.social,
  width: 1200,
  height: 630,
  alt: "정우 인재개발원 HRDI 공식 로고",
} as const;
~~~

- [x] **Step 3: Implement BrandLogo**

Create components/brand-logo.tsx around next/image. Accept kind lockup or mark, tone color/white/black only for lockup, className, and priority as a discriminated prop union. Render alt="", aria-hidden="true", unoptimized, lockup intrinsic size 785 x 198, and mark size 277 x 198.

- [x] **Step 4: Replace placeholders**

In site-header.tsx replace only the badge and localized text block with:

~~~tsx
<BrandLogo kind="lockup" className="h-10 w-auto max-w-[158px] sm:max-w-[176px]" priority />
~~~

Keep its link and localized aria-label. In site-footer.tsx replace only the badge/name group with a lockup at h-11 and max width 174px, preserving the concurrent footer.network removal. In the login page and sales layout replace only square JW spans with mark logos at h-11 and h-10 respectively. Preserve all auth, text, routing, and content edits.

- [x] **Step 5: Verify and commit**

Run the direct brand test and typecheck; both must PASS. Stage the clean Task 2 files normally. For site-footer.tsx, use git add -p and stage only the logo replacement; leave the pre-existing messages.footer.network deletion unstaged. If both edits appear in one hunk, use patch edit mode and remove the network-deletion lines before applying the staged patch. Inspect git diff --cached before committing and confirm the staged footer still contains the network paragraph from HEAD.

~~~bash
git add company/lib/brand.ts company/components/brand-logo.tsx company/components/site-header.tsx "company/app/(internal)/login/page.tsx" "company/app/(internal)/sales/layout.tsx" company/test/brand-assets.test.ts
git add -p company/components/site-footer.tsx
git diff --cached -- company/components/site-footer.tsx
git commit -m "feat: replace placeholder logo treatments"
~~~

### Task 3: Stable default social metadata

**Files:**
- Modify: company/lib/seo.ts
- Modify: company/components/organization-schema.tsx
- Modify: company/test/brand-assets.test.ts
- Delete: company/lib/opengraph-image.tsx
- Delete: company/app/(public-ko)/opengraph-image.tsx
- Delete: company/app/[locale]/opengraph-image.tsx

**Interfaces:**
- Consumes: BRAND_ASSETS.social and BRAND_SOCIAL_IMAGE.
- Produces: explicit shared Open Graph/Twitter images and stable Organization JSON-LD URLs.

- [x] **Step 1: Extend metadata tests**

Import buildRootMetadata and buildPageMetadata. Assert both return /brand/og-image.png in Open Graph images and Twitter images. Call OrganizationSchema(), read the returned script element's dangerouslySetInnerHTML.__html, parse it as JSON, and assert logo equals the absolute /brand/logo-color.svg URL and image equals the absolute /brand/og-image.png URL. Re-run the existing SEO suite as the regression contract for caregiver and business-area image overrides.

Run the direct brand test and expect FAIL because shared images and Organization JSON-LD still point at the old generated route.

- [x] **Step 2: Add shared metadata images**

Import BRAND_SOCIAL_IMAGE in lib/seo.ts. Add images: [BRAND_SOCIAL_IMAGE] to both Open Graph objects and images: [BRAND_SOCIAL_IMAGE.url] to both Twitter objects. Do not alter titles, descriptions, canonicals, alternates, or verification.

- [x] **Step 3: Correct Organization JSON-LD**

Import BRAND_ASSETS in organization-schema.tsx and use:

~~~ts
logo: `${SITE_URL}${BRAND_ASSETS.lockup.color}`,
image: `${SITE_URL}${BRAND_ASSETS.social}`,
~~~

Preserve all remaining schema fields.

- [x] **Step 4: Remove obsolete generators**

Delete the shared generated-image module and both App Router wrappers so file-based metadata cannot override the stable public image. Do not change business-area, caregiver, or blog metadata.

- [x] **Step 5: Verify and commit**

Run the direct brand test, test:seo, and typecheck; all must PASS. Stage only Task 3 files:

~~~bash
git add company/lib/seo.ts company/components/organization-schema.tsx company/test/brand-assets.test.ts company/lib/opengraph-image.tsx "company/app/(public-ko)/opengraph-image.tsx" "company/app/[locale]/opengraph-image.tsx"
git commit -m "feat: publish official social brand metadata"
~~~

### Task 4: Production verification and screenshot handoff

**Files:**
- Create, ignored: tmp/brand-qa/home-desktop.png
- Create, ignored: tmp/brand-qa/home-mobile.png
- Create, ignored: tmp/brand-qa/default-og.png

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: passing build, HTTP metadata evidence, and desktop/mobile screenshots.

- [x] **Step 1: Run full relevant verification**

~~~bash
cd company && node --import tsx --test test/brand-assets.test.ts
cd ..
npm --prefix company run test:seo
npm --prefix company run test:i18n
npm --prefix company run typecheck
npm --prefix company run build
~~~

Expected: every command exits 0.

- [x] **Step 2: Start and inspect the local app**

Run npm --prefix company run dev -- --hostname 127.0.0.1 --port 3007 in a persistent session. For /, /en, and /services/japan-caregiver, inspect emitted icon, apple-touch-icon, og:image, and twitter:image tags. Root and English must use /brand/og-image.png; caregiver must keep /lp/v1/og.png. Confirm brand SVG, social PNG, and icon URLs return HTTP 200 with correct content types.

- [x] **Step 3: Capture screenshots**

Using the in-app browser, capture desktop home at 1440 x 1000, mobile home at 390 x 844, and the social image at its native 1200 x 630 size. Save under tmp/brand-qa/. Inspect for clipping, illegible outlined text, wrong backgrounds, stale JW badges, and layout shifts. Fix any defect and rerun verification.

- [x] **Step 4: Confirm repository scope**

Run git status --short and git log -5 --oneline. Logo commits must contain only files listed here; unrelated content-refresh changes must remain uncommitted and untouched.
