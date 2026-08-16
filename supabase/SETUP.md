# Supabase setup

Leonard runs these steps — they need account credentials and are the parts worth understanding
firsthand. Roughly 15 minutes.

## 1. Create the project

1. Sign up at https://supabase.com (free tier, no card).
2. **New project.** Name it `sumisura`.
3. Pick a **database password** and put it in your password manager. You will rarely need it —
   the app never uses it — but it is not recoverable, only resettable.
4. **Region**: Singapore (`ap-southeast-1`) is closest to Indonesia. If the dashboard assigns
   one for you — Tokyo, for instance — take it. Tokyo costs roughly 50 ms more per round-trip
   from Jakarta, and sync runs in the background, so the tailor never waits on it. Not worth
   recreating the project over.
5. Wait ~2 minutes for provisioning.

## 2. Create the tables and security rules

1. Dashboard → **SQL Editor** → **New query**.
2. Paste the entire contents of [`schema.sql`](schema.sql).
3. **Run.**

Expect "Success. No rows returned". Re-running is safe.

## 3. Copy the two connection values

Dashboard → **Project Settings** → **API Keys**:

| Value | Looks like | Where it goes |
|---|---|---|
| Project URL | `https://abcdefgh.supabase.co` | `.env` → `VITE_SUPABASE_URL` |
| **Publishable** key | `sb_publishable_...` | `.env` → `VITE_SUPABASE_ANON_KEY` |

Supabase renamed these keys. **Publishable** is what older docs call **`anon public`** — same
key, same purpose. Older projects show it as a long `eyJ...` string instead; either works.

Our variable is named `VITE_SUPABASE_ANON_KEY` whichever label you see. Renaming it would mean
touching the code, the workflow and the GitHub secrets for no behavioural gain.

> ⚠️ **Never use the `secret` key** (`sb_secret_...`, formerly `service_role`). It sits on the
> same page and looks similar. That key bypasses every security rule in `schema.sql`, and
> anything shipped to a browser is public. The publishable key is *designed* to be public and
> grants nothing on its own — every request is still judged against the caller's login.

## 4. Turn on email login

Dashboard → **Authentication** → **Providers** → **Email**:

- **Enable email provider**: on
- **Confirm email**: on
- **Secure email change**: on

Then **Authentication → URL Configuration**:

- **Site URL**: `https://liauwleonard.github.io/sumisura/`
- **Redirect URLs**: add both
  - `https://liauwleonard.github.io/sumisura/`
  - `http://localhost:5173/sumisura/`

The login link only works if the address it returns to is on this list. Without the localhost
entry you cannot test login while developing.

---

## Proving the isolation actually works

Worth doing once, so the privacy claim is something you have seen rather than been told.

After the app has sign-in (end of Phase 3):

1. Sign in as yourself, create a customer called `Isolation Test`.
2. Open a **private window**, sign in with a *different* email address.
3. That second account sees an empty app. No customers, no orders.
4. Back in the dashboard: **Table Editor → customers** — you see *both* rows, because the
   dashboard uses the admin key.

Step 4 is the honest caveat from `decisions.md`: users are private from each other, not from
you as project owner. Same as any app you would host yourself.

### Checking the rules are on

Dashboard → SQL Editor:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public';
```

Every row must show `rowsecurity = true`. If any table shows `false`, its data is readable by
any logged-in user of the project — stop and re-run `schema.sql`.

---

## Free tier limits, and what they mean here

| Limit | Free tier | For this shop |
|---|---|---|
| Database | 500 MB | Text only — a lifetime of orders is a few MB |
| Auth users | 50,000 | One tailor, maybe an assistant |
| Login emails | ~4 per hour (shared SMTP) | Fine: logging in is rare, sessions last for months |
| Pausing | after ~7 days with no requests | Daily shop use never triggers it |

The email rate limit is the only one that could ever bite, and only while testing several
accounts in quick succession. If it becomes a real problem, connecting a custom SMTP provider
in Authentication → Settings removes it.
