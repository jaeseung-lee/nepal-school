# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A single repo holding three loosely-coupled things about a **Nepal → Japan 특정기능1호 (Specified Skilled Worker 1, 介護·宿泊) manpower business**:

1. **Root wiki** — Korean-language research/feasibility markdown (`00-사업개요.md` … `07-취업타임라인-주체별역할.md` + `README.md`). This is the source of truth; the dashboard app renders it.
2. **`dashboard/`** — Next.js 14 internal viewer that renders the root wiki markdown.
3. **`company/`** — Next.js 15 marketing site for 정우인재개발원 (Jeongwoo Human Resource Development Institute), a separate B2B corporate site.

The two apps are **independent** (own `package.json`, own `node_modules`, different React/Next versions). The repo root itself is not a JS project — there is no root `package.json`.

Working language is **Korean**: docs, code comments, and UI copy are all Korean (Japanese-origin institutional terms kept in the original, e.g. 特定技能1号, 介護). Match this when writing content or comments.

## Commands

Both apps default to port 3000 (`next dev`); run only one at a time, or pass `-p`.

**dashboard/**
```bash
cd dashboard && npm install
npm run dev          # http://localhost:3000
npm run build
npm run lint
npm run test                                   # all tests: node --test lib/*.test.mjs
node --test lib/basicAuth.test.mjs             # a single test file
```

**company/**
```bash
cd company && npm install
npm run dev
npm run build        # prebuild runs gallery/lp-v1/business/network/i18n/design tests
npm run typecheck    # tsc --noEmit  (dashboard has no typecheck script)
npm run test:design  # monochrome design guard
```
`npm run lint` exists in company/ but no ESLint config is checked in, so it does not run; use `npx tsc --noEmit --noUnusedLocals` for unused code.

## dashboard/ architecture

The dashboard reads the wiki markdown from its **parent directory** (`lib/content.ts`: `CONTENT_DIR = path.join(process.cwd(), "..")`). It is therefore coupled to the repo root — it only works when run from inside `dashboard/` with the wiki files one level up.

- **`lib/content.ts` is the single source of truth.** The `DOCS` array maps `slug` (URL) ↔ `file` (root `.md`) ↔ display metadata. **To add/rename a wiki doc you must edit this array** — routes (`/docs/[slug]`), the sidebar, search index, and prev/next paging all derive from it. (Note: some UI strings still hardcode "/ 05" paging text from when there were 6 docs; there are now 8, 00–07.)
- **Markdown pipeline** (`renderMarkdown` in `content.ts`, using `marked`): a custom renderer (a) turns ```` ```mermaid ```` blocks into `<div class="mermaid">` for client-side rendering by `components/MermaidRenderer.tsx`, (b) rewrites `.md` links to app routes via `FILE_TO_ROUTE`, (c) injects heading `id`s with a CJK-preserving GitHub-style `slugify` so in-page `#anchor` links work.
- **Auth**: `middleware.ts` + `lib/basicAuth.mjs` enforce HTTP Basic Auth from `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`. It **fails closed in production** (returns 500 if the env vars are missing) and **fails open in dev** (`NODE_ENV !== "production"` passes through). `basicAuth.mjs` is plain JS (not TS) because middleware and the Node test runner both import it; it uses constant-time comparison.

## company/ architecture

- **Tailwind CSS v4 with CSS-in-config** — there is **no `tailwind.config` file**. Theme tokens live in the `@theme` block of `app/globals.css`. Add/change design tokens there, not in a config file.
- **Monochrome editorial design system** (reference: OFFMORA). Colors are neutral only (`paper`, `ink`, `muted`, `line`, `image`, `night*`); the old brand tokens (`cobalt`, `clay`, `primary-*`, `gold-*`) were removed and `test/design-system.test.ts` (in prebuild) blocks them plus chromatic Tailwind palettes. Type tokens `text-display|headline|statement|subhead|title|description|meta`, utilities `page-wrap`, `py-section`, `eyebrow`, `pill*`, `round-btn`, `hero-scrim`, `surface-dark` (white focus ring on dark surfaces). Images are square-cornered; buttons are pills.
- **Header overlay**: a page whose first section is a dark full-bleed hero marks it `data-hero-overlay`; CSS `body:has([data-hero-overlay]) .site-header` then makes the header fixed and transparent until scroll. Every public page currently starts with one (`PageBanner` or a custom night hero).
- **Photos**: large photos come only from `lib/key-visuals.ts` (real `public/gallery` photos, localized alt via `getGalleryPhoto`). Photos edited with generative AI (they carry a visible "AI-generated content" mark) are not published: move the original into an `images/_archive/` folder (the gallery validator skips `_`-prefixed folders) and drop it from `lib/gallery.ts`. Short decorative English labels live in `lib/section-labels.ts` and render with `lang="en"`.
- Font: Pretendard Variable, self-hosted via `next/font/local` (`app/fonts.ts`); `test:seo` forbids `next/font/google`/CDN fonts in the Korean layout.
- **`lib/site.ts`** = single source for company facts (name, 사업자등록번호, address, `SITE_URL`) consumed by metadata, `sitemap.ts`, `robots.ts`, and `components/organization-schema.tsx` (JSON-LD). **`lib/nav.ts`** = single source for header/footer menu items (`primary: true` = inline desktop nav). Copy lives in `messages/{ko,en,ja,ne,vi,lo}.json` (identical keys enforced by `test:i18n`).
- Interactive pieces are client components: `site-header.tsx` (overlay/dark-glass states, menu + language panels), `hero-image-carousel.tsx`, gallery explorer/lightbox. `contact-form.tsx` is a static phone/mail panel (**no backend yet**).
- Unconfirmed content is intentionally left as `입력 예정` placeholders — the project rule is **do not invent metrics/credentials** for this newly-founded (2026-06) company. See the "공개 전 확정/연동 TODO" section in `company/README.md` before filling contact info, logos, or images.

## Gotchas

- **`.claude/launch.json`** starts `company` on port 3007 via a relative `--prefix company` (resolved from the repo root), so browser-preview works from any checkout. It needs `company/node_modules` present first (`cd company && npm install`).
- `.gitignore` ignores `.claude/` broadly, but `.claude/launch.json` is force-tracked.
- `AGENTS.md` is an empty Cowork stub — no real instructions there.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec

## Deploy Configuration (configured by /setup-deploy)
- Platform: Vercel (`jaeseungs-projects-afaa059f/nepal-school`; application root: `company/`)
- Production URL: https://www.jeongwoohrd.com
- Deploy workflow: automatic on push to `main`
- Deploy status: https://vercel.com/jaeseungs-projects-afaa059f/nepal-school
- Local note: `company/.vercel` is linked to an obsolete project; do not use it for production deploys until it is explicitly relinked
- Merge method: direct commit to `main`
- Project type: Next.js web app
- Post-deploy health check: https://www.jeongwoohrd.com

### Custom deploy hooks
- Pre-merge: `cd company && npm run test:seo && npm run typecheck && npm run build`
- Deploy trigger: `git push origin main`
- Deploy status: open https://vercel.com/jaeseungs-projects-afaa059f/nepal-school
- Health check: `curl -fsS -o /dev/null -w "%{http_code}" https://www.jeongwoohrd.com`
