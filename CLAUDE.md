# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # install dependencies
npm run dev          # local dev server (wrangler dev)
npm run deploy       # deploy to Cloudflare Workers (runs verify first)
npm run verify       # run all pre-deploy checks (i18n + migrations)
npm run verify:i18n        # check translation completeness in src/i18n.js
npm run verify:migrations  # static-check migration SQL files
```

Before deploying manually, copy client-side library files first (this is normally done by the GitHub Actions workflow or `deploy.sh`):
```bash
./copy-libs.sh       # copies leaflet, gsap, es-module-shims to public/lib/
```

Apply D1 migrations:
```bash
npx wrangler d1 execute LIVESTOCK_DB --file=./migrations/<file>.sql
```

## Architecture

This is a **Cloudflare Workers** app — a single Worker (`src/index.js`) that serves both the API and static assets.

### Request routing

`src/index.js` uses `itty-router` with three layers in order:
1. **API routes** (`/api/*`) — handled by route handlers
2. **Static assets** — fetched from the `ASSETS` binding (serves `public/`)
3. **SPA fallback** — unmatched paths serve `index.html`

All responses pass through `withCors()` which adds CORS headers and, for HTML responses, a full CSP header set.

### Backend modules

- **`src/handlers.js`** — all API handler functions: `handleGetReports`, `handleCreateReport`, `handleUpdateReport`, `handleGetComments`, `handleCreateComment`. Media uploads go to R2 (`LIVESTOCK_MEDIA` binding) and are served via `media.pigmap.org`. JPEG files have EXIF stripped before upload for privacy.
- **`src/durable_objects.js`** — `LivestockReport` Durable Object using the **WebSocket Hibernation API** (connections survive Worker restarts). The single global instance is keyed `'global-reports'`. Receives broadcast POSTs from handlers and fans out to all connected WebSocket clients.
- **`src/i18n.js`** — flat translation map for 17 languages. Both `languageNames` and `translations` must stay in sync — `scripts/check_i18n.js` enforces this.

### Frontend (`public/`)

Vanilla JS, no build step. Key files:
- `main.js` — app entry, map init (Leaflet), WebSocket client, report lifecycle
- `modals.js` — report/comment submission forms
- `map-layers.js` — tile layer switching logic
- `notifications.js` — toast-style UI notifications
- `public/i18n/` — JSON files used by the frontend (separate from `src/i18n.js` which is used by the Worker)

### Database (D1 / SQLite)

Migrations in `migrations/` are applied in filename order. Current schema:
- `reports` — core sighting data (id, type, count, comment, lat/lng, timestamp, icon)
- `media` — R2 media references per report
- `edit_tokens` — 7-day tokens returned at report creation time, required for updates
- `comments` — per-report comments
- `comment_media` — media attachments on comments

The cron handler (`scheduled` export, runs hourly) deletes expired edit tokens and reports older than 30 days.

### Pre-deploy verification gate

`wrangler.toml` sets `build = { command = "npm run verify" }`. Cloudflare Workers Builds runs this before every deploy. GitHub Actions is **not used** for CI checks — runner provisioning is blocked at the account level; all verification runs on Cloudflare.

### Adding a new language

1. Add the language code + name to `languageNames` in `src/i18n.js`
2. Add a translations entry with the same keys as `en` in `translations`
3. Add a `public/i18n/<code>.json` file for the frontend
4. Run `npm run verify:i18n` to confirm

### Adding a new migration

1. Create `migrations/<NNN>_description.sql` (sequential numbering)
2. Add expected tables/columns to the `expected` object in `scripts/verify_migrations.js`
3. Run `npm run verify:migrations` locally before deploying
