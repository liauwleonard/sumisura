# Changelog

All notable changes to this project. Newest first.

## [Unreleased]

### 2026-08-16 — Phase 3a/3b: Supabase schema and magic-link login
- `supabase/schema.sql` — five tables mirroring the local model, RLS on all of them,
  `is_shop_member()` as the single membership check, and a trigger giving each new account its
  own shop. `change_log` is insert-and-read only: no update or delete policy exists for it.
- `supabase/SETUP.md` — the steps Leonard runs, plus how to *prove* isolation works with a
  second account, and what the free-tier limits mean for one shop.
- `@supabase/supabase-js`, `src/lib/supabase.ts`, `src/auth/AuthProvider.tsx`,
  `src/screens/SignIn.tsx`. Magic link only — no passwords.
- `shouldCreateUser: false` on sign-in: accounts are created from the dashboard, so a scraped
  anon key cannot register users or burn the email quota.
- **The cloud is optional.** With no credentials configured the app behaves exactly as before —
  local-only, no login, fully usable — and Settings shows "Local device only — not synced".
  This keeps the published site working between auth shipping and secrets being added, and
  means a missing config can never lock the tailor out of his own measurements.
- `.gitignore` now covers `.env*` (keeping `.env.example`). Previously only `.env` was ignored,
  so a `.env.local` holding real credentials was committable.
- Workflow passes the two `VITE_*` values from repo secrets; unset secrets still build fine.
- Verified both paths: no config → app runs local-only with the correct Settings state;
  placeholder config → sign-in screen gates the app. A real magic-link round-trip is still
  unverified and needs the live project.
- Bundle grew ~220 KB (precache 374 → 595 KiB) from the Supabase client. Acceptable for a PWA
  that caches once; worth lazy-loading if it ever becomes noticeable on first install.

### 2026-08-16 — Live on GitHub Pages · English is now the default language
- **Deployed and verified** at https://liauwleonard.github.io/sumisura/ — service worker
  activated and scoped to `/sumisura/`, precache populated, manifest correct, all three icons
  200, Apple meta tags present, served over HTTPS. Walked the real flow on the live site:
  created a customer, opened order #1, added a jacket, mannequin rendered with all labels.
- **English is the default language** (`DEFAULT_LANG` in `src/i18n/index.ts`). Also switched
  `<html lang>`, the meta description, and the manifest `lang`/`description` to English.
- Language and unit are now persisted **only when explicitly chosen**, not written on mount.
  Previously the default was saved to localStorage on first load, which would have frozen
  Bahasa in place for anyone who had already opened the site — they would never have seen this
  change. An explicit choice still survives reloads.
- `INSTALL.md` is still Bahasa-first, since it is written for the tailor rather than the app.

### 2026-08-16 — Pages must be enabled by hand
- Run #3 compiled successfully (the `src/data` fix worked) but failed at `configure-pages` with
  `Get Pages site failed … Not Found` — no Pages site existed on the repo.
- Run #4 tried `enablement: true` so the workflow could create the site itself. That failed with
  `Create Pages site failed. Error: Resource not accessible by integration` — the workflow token
  is not permitted to create a Pages site on this repo, despite the workflow declaring
  `pages: write`. Removed the option rather than leave config that cannot work.
- **Pages is therefore enabled once, manually:** Settings → Pages → Source → *GitHub Actions*.
- Pages **must** use the GitHub Actions source, not "deploy from a branch". The workflow
  publishes a built artifact; a branch source would serve the raw repo, whose root `index.html`
  points at `/src/main.tsx` and would not run.

### 2026-08-16 — Fixed CI build: three source files were never committed
- **`src/data/` was being ignored by git.** The scaffold's `.gitignore` had an unanchored
  `data/` rule, which matches `data/` at *any* depth — so `src/data/measurements.ts`,
  `src/data/mannequin.ts` and `src/data/cutStyles.ts` were silently excluded from every commit.
  The GitHub Actions build failed with `Cannot find module '../data/measurements'`.
  Local builds passed because the files were on disk.
- Anchored the rule to `/data/` (the top-level scaffold folder only) and committed the three
  missing files.
- Bumped the workflow to `actions/checkout@v5`, `actions/setup-node@v5` and Node 22 — the run
  warned that Node 20 actions are deprecated.
- Verified properly this time: extracted the committed tree to a clean directory and ran
  `npm ci && npm run build` there — the exact CI sequence. Builds clean.

### 2026-08-16 — Build fix (would have failed CI) + header polish
- **Fixed a build failure that only appears on a clean checkout.** Dexie 4 and
  `dexie-react-hooks` declare no `types` condition in their package `exports` maps, so
  `moduleResolution: "bundler"` resolved their JS but no declarations — and fell back to
  type-checking the raw `.ts` sources shipped inside `dexie-react-hooks`. Every `db.*` call
  degraded to `any` and ~20 errors surfaced. Added `paths` in `tsconfig.json` pointing at the
  real `.d.ts` files (types only — Vite resolves the runtime modules itself).
  Local incremental builds had been skipping the check and hiding this; `npm ci && npm run build`
  in GitHub Actions would have failed.
- Removed the scaffold's Python leftovers: `.venv` (broken — its console-script shebangs still
  pointed at the pre-rename path) and `requirements.txt`. This project has no Python.
- Header: tagline moved under the name and set in title case — "Sumisura / Made to Measure",
  "Sumisura / Jahit Sesuai Ukuran".

### 2026-08-16 — Named the app: Sumisura
- Project renamed from the working title `tailor-app` to **Sumisura**, from the Italian
  *su misura* (made to measure).
- Renamed: folder, `package.json`, Vite `base` (`/sumisura/`), manifest name/short_name,
  page title, iOS app title, and the workspace launch configs.
- Header now reads "Sumisura · Made to measure / Jahit sesuai ukuran" via a new `tagline` key.
- **The IndexedDB database was renamed** `tailor-app` → `sumisura`. Any data created during
  earlier testing is not carried over — this was done now, before real use, precisely so it
  never has to happen later.
- Rebuilt and re-verified: service worker scoped to `/sumisura/`, manifest and icons served,
  and with the server stopped the app still loaded from cache.

### 2026-08-16 — Phase 2: installable PWA
- `vite-plugin-pwa` with a generated service worker; 15 entries precached (~374 KiB).
- App icons generated by `scripts/make-icons.mjs` — a small hand-rolled PNG encoder, so no
  native image dependency enters the build. Run it after editing `public/icon.svg`.
- Web manifest: standalone display, amber theme, maskable icon, `start_url`/`scope` at the
  Pages base path.
- iOS meta tags in `index.html` (`apple-mobile-web-app-*`, `apple-touch-icon`) — Safari ignores
  the web manifest when deciding install behaviour.
- **Update prompt** (`src/components/UpdatePrompt.tsx`) rather than `autoUpdate`: a silent
  reload could discard unsaved measurements. Tailor saves first, then taps update.
- GitHub Actions workflow to build and publish to Pages.
- `INSTALL.md` — bilingual install guide for iPad / iPhone / MacBook, including a warning that
  data is single-device until Phase 3.
- Verified against the production build: service worker active, manifest and icons served,
  and with the server **stopped** the app still loaded, created an order, and kept it across
  a reload.

### 2026-08-15 — Two status indicators + payment references
- Orders list now shows **two separate indicators** per order: payment state (read-only) and
  completion status (a dropdown, changeable without opening the order).
- Payment state is derived via `paymentStatusOf()` in `src/types.ts` — price vs payments, never
  stored — so it can only move by editing money in Order → Balance. Orders with no price show
  "Not priced" rather than a misleading "Unpaid".
- Status changes made from the list still route through `saveOrder`, so they appear in the
  change log like any other edit.
- Payments gained a **reference number** field (`Payment.ref`) for bank reconciliation, with the
  hint text explaining what it is for.
- Change-log payment diffs now record a summary (`2000000 (BCA/TRF/20260815/7781)`) instead of a
  bare total, so an edited reference is auditable.
- Change-log rows render readable labels instead of raw field keys (`Total price`, `Deposit`,
  `Chest`, `Jacket · Fit`).
- Verified in the browser: set order #1 to Ready from the list, priced it at 5,000,000 with a
  2,000,000 deposit → chip flipped to Partial, receivable 3,000,000, and the log shows
  `Deposit: — → 2000000 (BCA/TRF/20260815/7781)` and `Status: measured → ready`.

### 2026-08-15 — Phase 1 built
- Vite + React + TS + Tailwind app scaffolded; `npm run dev` on port 5173.
- Dexie store (`src/db/db.ts`) with shops, customers, orders, changeLog. Every row carries
  `shopId`, `updatedAt`, `deletedAt` so Phase 3's Postgres mirror is a straight copy.
- Change-log engine (`src/db/changelog.ts`): saves diff old vs stored and write one row per
  changed field. Saving is explicit (button + on step change), not per keystroke, so the log
  stays readable.
- SVG mannequin (`src/data/mannequin.ts`, `src/components/Mannequin.tsx`): arms out, legs apart,
  front/back views, lines filtered by active garment, two-way tap-to-focus with the input list.
- Search-or-create customer step with live search and phone-collision check.
- Prefill from a customer's most recent orders with field-level fallback and
  `dari pesanan #N · date` tags; "Ukur ulang" clears everything.
- Material, per-garment cut style with "Other →" free text, balance with auto receivable.
- Full EN/ID dictionaries, cm/inch toggle (both pulled forward from Phase 4).
- Verified end to end in the browser: created two orders, confirmed prefill carried
  Leher 40 / Dada 100 from order #1, and the log recorded `98 → 100`.
- Fixed during verification: long Indonesian labels clipped off the mannequin's left edge —
  viewBox widened to `-130 0 660 620` to add label gutters.

### 2026-08-15
- Project scaffolded.
- Architecture and scope agreed and signed off — see `decisions.md`.
- `PLAN.md` filled in with four phases: local app → PWA → sync + multi-user → polish.
- `CLAUDE.md` and `README.md` written.
- Scope cut: no photos anywhere (customer or fabric).
