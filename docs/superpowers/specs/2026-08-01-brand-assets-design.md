# Official Brand Asset Replacement Design

## Goal

Replace every placeholder or obsolete Joongwoo logo treatment with assets derived from the supplied Illustrator source, while preserving page-specific social images whose purpose is editorial rather than corporate branding. Verify the result in a running browser and capture desktop and mobile screenshots.

## Source and asset model

The supplied `logo.ai` is a PDF-compatible, three-artboard Illustrator document. It contains vector-only outlined artwork in color, white, and black variants. Each artboard will be exported with its recorded artwork bounds so the resulting SVG has no A4-page whitespace.

The deployed brand kit will contain:

- tight-cropped color, white, and black full-lockup SVG files;
- a tight-cropped symbol-only color SVG for compact placements;
- square-padded browser icons derived from that symbol;
- a 1200 x 630 default social card using the color lockup on a clean light background.

All derivatives must preserve the source geometry and colors. No logo lettering will be recreated with a font.

## Placement rules

- Public header and footer: use the official color full lockup on the existing light backgrounds.
- Internal login and sales navigation: replace the `JW` text badge with the official symbol.
- Browser metadata: replace `icon.svg`, `favicon.ico`, and `apple-icon.png` with symbol-based assets sized and padded for their target formats.
- Default Open Graph and Twitter cards: use the new 1200 x 630 brand card and declare it explicitly in shared metadata.
- Organization structured data: point `logo` to the dedicated public SVG and `image` to the default social card.
- Blog posts, business-area pages, and the caregiver landing page: retain their existing content-specific social images.

The current localized company-name copy remains available to screen readers through link labels and surrounding page metadata. Existing content-refresh edits in the worktree must be preserved.

## Implementation boundaries

Reusable public assets live under `company/public/brand/`. Existing Next.js file-convention browser icons remain under `company/app/`. A small reusable React logo component may centralize sizing and accessible labeling if it reduces duplicated markup without changing unrelated layout behavior.

The obsolete generated default OG composition may be replaced by a stable static public image. Page-specific metadata continues to override that default where it already supplies editorial imagery.

## Validation

- Confirm SVGs remain vector-only and have tight view boxes.
- Confirm favicon, app icon, Apple icon, and social card dimensions and file types.
- Run focused asset/SEO tests, TypeScript checking, and a production build.
- Inspect emitted `icon`, `apple-touch-icon`, `og:image`, and `twitter:image` metadata for Korean and localized routes.
- Capture desktop and mobile screenshots of the public header/footer and compact internal logo placements where authentication permits.
- Visually inspect the default social card and browser icons at representative sizes.

## Success criteria

No visible `JW` placeholder badge or obsolete default OG artwork remains. The official logo is crisp at desktop and mobile sizes, favicon-family assets are legible, structured metadata references stable public assets, content-specific social imagery is preserved, and the final screenshots show no clipping or layout regression.
