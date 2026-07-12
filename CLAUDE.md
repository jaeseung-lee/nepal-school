# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A single repo holding three loosely-coupled things about a **Nepal → Japan 특정기능1호 (Specified Skilled Worker 1, 介護·宿泊) manpower business**:

1. **Root wiki** — Korean-language research/feasibility markdown (`00-사업개요.md` … `07-취업타임라인-주체별역할.md` + `README.md`). This is the source of truth; the dashboard app renders it.
2. **`dashboard/`** — Next.js 14 internal viewer that renders the root wiki markdown.
3. **`company/`** — Next.js 15 marketing site for 정우인재개발원 (Joong Woo HRD), a separate B2B corporate site.

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
npm run build
npm run lint
npm run typecheck    # tsc --noEmit  (dashboard has no typecheck script)
```

## dashboard/ architecture

The dashboard reads the wiki markdown from its **parent directory** (`lib/content.ts`: `CONTENT_DIR = path.join(process.cwd(), "..")`). It is therefore coupled to the repo root — it only works when run from inside `dashboard/` with the wiki files one level up.

- **`lib/content.ts` is the single source of truth.** The `DOCS` array maps `slug` (URL) ↔ `file` (root `.md`) ↔ display metadata. **To add/rename a wiki doc you must edit this array** — routes (`/docs/[slug]`), the sidebar, search index, and prev/next paging all derive from it. (Note: some UI strings still hardcode "/ 05" paging text from when there were 6 docs; there are now 8, 00–07.)
- **Markdown pipeline** (`renderMarkdown` in `content.ts`, using `marked`): a custom renderer (a) turns ```` ```mermaid ```` blocks into `<div class="mermaid">` for client-side rendering by `components/MermaidRenderer.tsx`, (b) rewrites `.md` links to app routes via `FILE_TO_ROUTE`, (c) injects heading `id`s with a CJK-preserving GitHub-style `slugify` so in-page `#anchor` links work.
- **Auth**: `middleware.ts` + `lib/basicAuth.mjs` enforce HTTP Basic Auth from `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`. It **fails closed in production** (returns 500 if the env vars are missing) and **fails open in dev** (`NODE_ENV !== "production"` passes through). `basicAuth.mjs` is plain JS (not TS) because middleware and the Node test runner both import it; it uses constant-time comparison.

## company/ architecture

- **Tailwind CSS v4 with CSS-in-config** — there is **no `tailwind.config` file**. Theme tokens live in the `@theme` block of `app/globals.css` (colors like `primary-main`, `cobalt`, `clay`, `gold-*`; `--container-content`). Add/change design tokens there, not in a config file.
- Fonts: Outfit (display, via `next/font/google`) + Pretendard (body, jsDelivr CDN in `layout.tsx`).
- **`lib/site.ts`** = single source for company facts (name, 사업자등록번호, address, `SITE_URL`) consumed by metadata, `sitemap.ts`, `robots.ts`, and `components/organization-schema.tsx` (JSON-LD). **`lib/nav.ts`** = single source for header/footer menu + the language switcher (only KO active; EN/JA/VI/NE are design-only placeholders).
- Interactive pieces are client components: `site-header.tsx` (scroll transition + mobile menu), `hero-slideshow.tsx`, `contact-form.tsx` (**no backend yet** — `onSubmit` only shows a notice).
- Unconfirmed content is intentionally left as `입력 예정` placeholders — the project rule is **do not invent metrics/credentials** for this newly-founded (2026-06) company. See the "공개 전 확정/연동 TODO" section in `company/README.md` before filling contact info, logos, or images.

## Gotchas

- **`.claude/launch.json`** starts `company` on port 3007 via a relative `--prefix company` (resolved from the repo root), so browser-preview works from any checkout. It needs `company/node_modules` present first (`cd company && npm install`).
- `.gitignore` ignores `.claude/` broadly, but `.claude/launch.json` is force-tracked.
- `AGENTS.md` is an empty Cowork stub — no real instructions there.
