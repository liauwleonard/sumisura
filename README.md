# Sumisura

*From the Italian **su misura** — made to measure.*

A notebook replacement for a suit tailor. Installs on iPad, MacBook, and iPhone; works offline;
syncs across all three. Free to host and free to run.

## Why

He keeps measurements in a paper notebook and mixes up whose notes are whose. This app makes the
customer the durable unit, keeps a full history of every measurement change, and pulls a returning
customer's details forward into their next order automatically.

## What it does

- **Orders** — customer, measurements, material, cut style, balance. One order can hold several
  garments (jacket + trousers + waistcoat) sharing one measurement set.
- **Measurements** — entered against an SVG mannequin with arms out and legs apart; arrows point to
  the field you're filling. Front and back views. cm or inch.
- **Change log** — measurements stay editable forever, and nothing is overwritten silently. Every
  edit records old value, new value, when, and who.
- **Prefill** — a returning customer's details, measurements, and cut style carry over from their
  last order, tagged with where they came from.
- **Balance** — total, deposits, auto-computed receivable. No accounting.
- **Bilingual** — Bahasa Indonesia and English.

## Privacy

Each tailor logs in with their own account and sees only their own data. Isolation is enforced by
the database (Row Level Security), not by the app, so it can't be bypassed from a browser.

Customers never log in — a customer is a record the tailor types, not an account.

## Status

Phase 2 built and verified locally (2026-08-16) — installable PWA, works fully offline.
**Not yet deployed:** the GitHub repo still needs to be created and pushed.
Next after that: Phase 3 — login and cross-device sync.

See [PLAN.md](PLAN.md) for the roadmap, [decisions.md](decisions.md) for the reasoning, and
[INSTALL.md](INSTALL.md) for the tailor-facing install guide.

## Run it

```bash
npm install && npm run dev
```

Then open http://localhost:5173/sumisura/

Production build: `npm run build && npm run preview` → http://localhost:4173/sumisura/
(the service worker only runs in the production build).

Regenerate app icons after editing `public/icon.svg`:

```bash
node scripts/make-icons.mjs
```

## Stack

Vite · React · TypeScript · Tailwind · Dexie (IndexedDB) · vite-plugin-pwa · Supabase (Phase 3) ·
GitHub Pages

## Repo layout

| Path | What |
|---|---|
| `PLAN.md` | Roadmap and phase checklists |
| `decisions.md` | Why things are the way they are |
| `CHANGELOG.md` | What changed, newest first |
| `CLAUDE.md` | Agent-facing project guide |
| `src/` | App source (Phase 1) |

The scaffold's `data/`, `queries/`, `notebooks/`, `outputs/` folders and the Python venv are unused
here — this is a TypeScript project.
