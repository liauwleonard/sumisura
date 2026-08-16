# Sumisura — project guide

Agent-facing guide, loaded every session. (`README.md` is the human overview.)

**Read first each session:** `PLAN.md` (roadmap + status), `CHANGELOG.md` (what changed, newest
first), `decisions.md` (why). A few reads and you're oriented — no need to re-explore the whole tree.

## What this is
An offline-first PWA for a suit tailor to replace his paper notebook. Order-centric: each order
holds the customer, their measurements, material, cut style, and balance. Installs on iPad,
MacBook, and iPhone; hosted free on GitHub Pages; syncs across devices with each user's data
walled off from every other user's.

## Key context
- **The problem being solved:** he mixes up whose notes are whose in the notebook. The app's job is
  to make a customer the durable unit and never lose or confuse a measurement.
- **Order-centric flow, customer-backed data.** He thinks "new order = new page", so the UI starts
  at the order. Underneath, a search-or-create step binds it to one `customers` row — this is what
  prevents three "Pak Budi" records.
- **Measurements are snapshotted per order, and never overwritten.** Every edit writes a
  `change_log` row (field, old, new, when, who, optional reason). An order cut in March keeps
  March's numbers forever even after a September re-measure.
- **Prefill from the latest order** is a core feature: customer details, measurements, and cut
  style carry over; material and balance do not. Prefilled fields are tagged with their source
  order and date until edited.
- **No photos anywhere.** Explicitly cut — measurements and notes only.
- **Customers never log in.** Only the tailor (and a future assistant) have accounts. A customer is
  a data record, not an auth user.
- **Local-first architecture.** The app always reads/writes IndexedDB; cloud sync runs in the
  background. Shop wifi dying must not block work.
- **`shop_id` scoping exists from day 1** even though he's solo, so adding an assistant later is a
  rule change, not a rewrite.

## Stack
| Layer | Choice |
|---|---|
| Build | Vite + React + TypeScript |
| Local DB | Dexie (IndexedDB) |
| Styling | Tailwind |
| PWA | vite-plugin-pwa |
| Cloud (Phase 3) | Supabase — auth (magic link), Postgres, Row Level Security |
| i18n | Plain JSON dictionaries, EN + ID. Default Bahasa |
| Hosting | GitHub Pages |

The Supabase anon key ships in public client code by design — **privacy is enforced by RLS on the
server**, never by client-side checks.

## File-map — where things live
- `PLAN.md`      — roadmap, phases, current status
- `decisions.md` — why things are the way they are
- `CHANGELOG.md` — what changed, newest first
- `src/types.ts` — the whole data model in one file; start here
- `src/db/db.ts` — Dexie schema and id/number helpers
- `src/db/changelog.ts` — **diff engine**: `saveOrder` / `saveCustomer` write the change log
- `src/data/measurements.ts` — field keys per garment, cm/inch conversion
- `src/data/mannequin.ts` — body geometry and every measurement line's coordinates
- `src/data/cutStyles.ts` — cut-style dropdown options
- `src/lib/prefill.ts` — carry-forward from a customer's previous orders
- `src/i18n/` — EN + ID dictionaries; **all display labels live here**
- `src/components/Mannequin.tsx` — the SVG figure
- `src/screens/OrderEditor.tsx` — the 4-step tab shell
- `src/screens/steps/` — Customer / Measurement / MaterialCut / Balance
- `data/`, `queries/`, `notebooks/`, `outputs/` — from the standard scaffold, unused for this project

Note: the scaffold ships a Python `.venv` and `requirements.txt` by default. This project is
TypeScript — they can be ignored or removed.

## Gotchas
- **Payment status is derived, never stored.** `paymentStatusOf()` in `src/types.ts` computes it
  from price vs payments on every read. Do not add a stored status field — the label would drift
  out of sync with the numbers. Completion status *is* stored and is editable from the orders list.
- **Saving is explicit** (Save button, and automatically on step change). Do not switch to
  per-keystroke autosave: the change log would fill with `9 → 96 → 98` noise instead of one clean
  entry per editing session.
- **Mannequin labels need gutters.** The viewBox is `-130 0 660 620`; the body only occupies
  x 40–360. Indonesian labels are long and clip against a body-tight viewBox.
- **Adding a measurement field** means: add the key to `FIELDS_BY_GARMENT`, add `m_<key>` to both
  dictionaries, and add a line to `LINES` if it should appear on the figure.
- **Never switch the PWA to `autoUpdate`.** A silent reload can discard unsaved measurements.
  The prompt in `src/components/UpdatePrompt.tsx` is deliberate.
- **Icons are generated, not committed by hand.** Edit `public/icon.svg`, mirror the change in
  `scripts/make-icons.mjs` constants, then `node scripts/make-icons.mjs`.
- **`base` is `/sumisura/`** in `vite.config.ts` and must match the GitHub repo name. Change one,
  change the other, and update `start_url`/`scope` in the manifest with it.
- **Don't remove the `paths` entries in `tsconfig.json`.** Dexie 4 and `dexie-react-hooks` ship no
  `types` condition in their package `exports`, so without them every `db.*` call silently becomes
  `any` and the build breaks on a clean checkout.
- **`tsc -b` caches aggressively.** After renames or dependency changes, verify with a real clean
  build (`rm -f tsconfig.tsbuildinfo && npm run build`) — that is what CI runs.
- **`src/data/` is real source and must stay tracked.** `.gitignore` uses `/data/` (anchored) for
  exactly this reason: an unanchored `data/` also matches `src/data/` and silently kept the
  measurement, mannequin and cut-style definitions out of the repo. If a build fails with
  "Cannot find module '../data/…'", check `git ls-files src/data/` first.
- **GitHub Pages source must be "GitHub Actions"**, not a branch. The workflow uploads a built
  artifact; a branch source would publish the raw repo, which has no built `dist`.
- **Verify CI-shaped failures the CI way:**
  `git archive $(git write-tree) | tar -x -C <tmp> && cd <tmp> && npm ci && npm run build`.
  Building in the working tree can pass on files that were never committed.

## Conventions
- Units: cm default, inch toggle. Store canonical in cm.
- Never hard-delete. Soft-delete only — sync and history depend on it.
- Measurement field keys are stable identifiers (`chest`, `sleeve_length`); display names come from
  the i18n dictionary so renaming a label never breaks stored data.
- Every dropdown in Cut Style has an "Other →" free-text escape hatch.

## How to run
`npm install && npm run dev` → http://localhost:5173/sumisura/ (the `base` in `vite.config.ts`
is set for GitHub Pages, so the dev server also serves under that path).
A `sumisura` entry exists in the workspace `.claude/launch.json` for one-command preview.

## Workflow
Plan → Act → Review → Document. **One slice/task per conversation, then `/clear`** — a fresh session
catches up from the docs above cheaply. Keep PLAN / CHANGELOG / decisions current as you go.
