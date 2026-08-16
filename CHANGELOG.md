# Changelog

All notable changes to this project. Newest first.

## [Unreleased]

### 2026-08-16 — Per-garment pricing, discount, money formatting, customer sorting
- **Prices per garment.** `OrderItem.price` is optional; the Balance tab lists each garment in
  the order with its own price, then Subtotal → Discount → Total.
- **Discount** (`Order.discount`) applies to the order, not to a garment.
- `Order.price` stays the single stored total and the one source of truth for receivables,
  revenue and sync. `recalculatedTotal()` re-derives it whenever an item price or the discount
  changes — and **falls back to the existing total when no garment is priced**, so lump-sum
  orders, including every order made before this existed, keep their value instead of silently
  collapsing to zero. Orders with no garments still take a single total, as before.
- **Thousand separators while typing** (`MoneyInput`): `5.000.000` in Indonesian, `5,000,000`
  in English. Only digits are kept, so a separator can never end up in the stored number.
- **Customers tab**: total value per customer beside the outstanding chip, and sorting by name,
  phone, total value or receivable.
- Change log records the discount and each garment's price; log labels handle garment-scoped
  keys generically, so "jacket.price" reads as "Jacket · Total price".
- Verified end to end: 5,000,000 + 2,500,000 + 1,500,000 → subtotal 9,000,000; discount
  1,000,000 → total 8,000,000; deposit 3,000,000 → receivable 5,000,000, status Partial. Sorting
  by value and by receivable both order correctly.

### 2026-08-16 — Phase 3c: the sync engine
- `src/sync/mapping.ts` — camelCase ↔ snake_case translation in matched pairs. Isolated because
  a mistake here is silent: a misspelled column does not throw, the value just arrives as
  `undefined` and a measurement quietly disappears.
- `src/sync/sync.ts` — push then pull, per shop.
  - **Push** sends rows whose `updatedAt` is newer than the watermark. The watermark advances to
    the newest row actually sent, not to "now", so a row edited mid-request is caught next pass.
  - **Pull** fetches rows changed since the watermark and merges last-write-wins: an incoming
    row only replaces a local one if it is genuinely newer.
  - Pulls reach back **60 s before** the watermark. Device clocks are not aligned, and a row
    written a few seconds "in the past" by another device would otherwise be skipped forever.
    Re-applying a row is harmless — the merge is idempotent.
  - The change log uses its own watermark and `ignoreDuplicates`, which becomes
    `INSERT … ON CONFLICT DO NOTHING` and needs only the insert policy. The schema grants
    `change_log` no update policy at all, so an ordinary upsert would fail.
- `src/sync/SyncProvider.tsx` decides *when*: on sign-in, every 60 s, on tab focus, and when the
  network returns. The last two matter most in a shop, where the iPad sleeps between customers.
  A run in flight blocks another from stacking behind the interval.
- `src/components/SyncStatus.tsx` in Profile: state, "last synced N min ago", and a manual
  "Sync now". Offline is shown as a state, not an error — the local copy is still correct.
- **Verified against the live Supabase project**: every column in all three mappings accepted
  by the real schema (a deliberately wrong column returns `PGRST204`; the real payloads reach
  the security check instead). Those same probes proved **RLS is genuinely enforced** — each
  unauthenticated write was rejected with `42501 new row violates row-level security policy`,
  which the earlier empty-table reads could not establish.
- Signed-out behaviour verified: sync stays `off`, writes no watermarks, logs no errors.
- **Not yet verified: a real two-device round-trip.** That needs a live session on two devices.

### 2026-08-16 — Customer details editable from the Customers tab
- The Customers tab showed details read-only while the order flow let you edit them — the same
  record behaving differently in two places. Extracted `src/components/CustomerFields.tsx` and
  used it in both, so they cannot drift apart.
- Edits from either place save immediately through `saveCustomer`, so they land in the change
  log the same way.
- Confirmed live-login works end to end: emailed link → session → shop resolved → renamed from
  the Profile tab.
- Verified by editing a phone from the Customers tab and reading the row back out of IndexedDB.

### 2026-08-16 — Phone input formatting, and a duplicate-customer bug it exposed
- Phone fields now accept only digits and a leading `+`, and space themselves as you type:
  `+62 999 999 999`, and `0812 3456 7890` for local numbers (Indonesian convention groups
  those in fours, not threes).
- **Fixed: `+62 812 345 678` and `0812 345 678` were treated as different people.** Duplicate
  detection compared raw digits, so the same customer entered in the two common Indonesian
  formats would slip through as two records — precisely the failure this app exists to prevent.
  `phoneKey()` now reduces both to one canonical form before comparing, and search uses it too.
- Guarded phone search against empty digit keys: `''.includes('')` is true, so searching a name
  would otherwise have matched every customer in the book.
- WhatsApp links go through the same canonical form instead of a hand-rolled prefix swap.
- Verified in the browser: typing `0812abc34567890` yields `0812 3456 7890`, and saving a
  customer as `0999 9999 99` when `+62 999 999 999` exists now raises
  "This number already belongs to Phone Test. Same person?".

### 2026-08-16 — Shop identity in the header, Customers tab, Profile screen
- **`ShopProvider`** works out whose shop this is: the account's shop read from Supabase when
  signed in, the on-device shop otherwise. If a signed-in user somehow belongs to no shop it
  falls back to local rather than showing an unexplained empty app.
- **Phase 3d done early — local rows are claimed on sign-in.** Anything created before logging
  in is re-stamped onto the real shop, so existing work isn't stranded and invisible. Edit
  timestamps are left untouched: they record when the work happened, and sync will decide what
  to push from its own watermark.
- **Header shows the shop name**, with "Sumisura · Made to Measure" demoted beneath it — the
  point is knowing which account you are in at a glance, which the product name cannot tell you.
- **Customers tab**: searchable list by name or phone, with order count, last order date and
  total outstanding per customer. Expanding one shows address, notes, Call/WhatsApp buttons and
  their full order history; tapping an order opens it.
- **Profile screen** behind an avatar button: editable shop name, signed-in email, role, sync
  status, sign out. Language and units moved here, so the old Settings tab is gone and the nav
  stays at three items.
- Counts are pluralised properly ("1 order", not "1 orders"); the Indonesian forms are
  deliberately identical since it does not inflect for number.
- Verified in local-only mode with seeded data: header name, rename (header and avatar initial
  both update), Customers list and expansion, Profile. The signed-in path was confirmed
  afterwards on the live site: emailed link → session → shop resolved → renamed from Profile.

### 2026-08-16 — Docs: new Supabase key names, region guidance
- Supabase renamed its API keys: **publishable** (`sb_publishable_...`) is what older docs call
  `anon public`, and **secret** (`sb_secret_...`) replaces `service_role`. Updated
  `.env.example` and `supabase/SETUP.md` to name both, since projects show one or the other.
  The env var stays `VITE_SUPABASE_ANON_KEY` either way.
- Region guidance relaxed: Singapore is nearest, but an auto-assigned Tokyo costs ~50 ms per
  round-trip from Jakarta on a background sync the tailor never waits for. Not worth recreating
  a project over.

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
