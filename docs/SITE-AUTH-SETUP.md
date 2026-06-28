# Site auth — operator setup

How to turn on **email + password + org-code** sign-up for the static site at
`re-forge.theadaply.com`. There is no server: the SPA on GitHub Pages talks to
**Supabase Auth** directly, a 6-digit email code verifies the account, and a
database trigger turns a verified sign-up into a **named, org-scoped**
`reforge.app_users` row.

This page is the start-to-finish runbook. The full design rationale is in
[`specs/site-auth.md`](../specs/site-auth.md); the admin/minting detail is in
[`scripts/README-auth.md`](../scripts/README-auth.md).

## What you need

- The **Supabase project** the backend already uses (same project ref).
- **SQL access as `postgres`** (the Supabase SQL editor runs as `postgres` by
  default) — or the owner/service `DATABASE_URL`.
- Earlier migrations `0001`–`0013` already applied (this builds on
  `orgs`, `app_users`, `org_join_codes`, and the `0002` RLS policies).
- A local checkout for the one admin command (`uv`, no app server needed).

Do the steps in order. Steps 1–4 are one-time project setup; step 5 is the deploy
credential; step 6 mints the first invite; step 7 is what a teammate does.

## 1. Apply the migration

Apply [`db/migrations/0014_site_auth.sql`](../db/migrations/0014_site_auth.sql)
**as `postgres`** (it creates `SECURITY DEFINER` functions that must be owned by a
`BYPASSRLS` role, and a trigger on `auth.users`). Easiest path: paste the file into
the Supabase **SQL Editor** and run it. It is additive and idempotent, so re-running
is safe.

> The migration is **engine**, not public catalog. Its canonical home is the
> private `reforge-features/db/migrations/` sequence; it is staged here only because
> this is where the site-auth track was built. Do not publish it (or
> `mint-org-code.py`) as part of the open-source catalog.

It creates three objects (`validate_org_code`, the `handle_supabase_auth_signup`
trigger, and an extended `current_org`) plus read grants for the signed-in role.
See `scripts/README-auth.md` for what each one does.

Then **expose the `reforge` schema to PostgREST** so the SPA can reach the RPC and
the org-scoped reads. In the dashboard: **Project Settings → API → Exposed schemas**
→ add `reforge` (keep `public`). Equivalent SQL:

```sql
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, reforge';
notify pgrst, 'reload config';
```

## 2. Enable email + password, disable everything else

**Authentication → Sign In / Providers**:

- Enable the **Email** provider.
- Turn **Confirm email ON** (sign-up must be verified).
- Leave **all other providers** (Google, GitHub, …) **disabled** — email + password
  only, no social, no magic link.
- Confirm **Email OTP Length = `6`** and a sane **Email OTP Expiration**
  (e.g. `3600` seconds).

Keep **sign-ups enabled** (Supabase has no per-org gate — the **org code** is the
gate). Optionally tighten **Authentication → Rate Limits → Email** to throttle abuse.

## 3. Make the confirmation email send the 6-digit code

This is the one easy-to-miss step. By default the *Confirm signup* email sends a
magic **link**; we need it to send the **token** instead.

**Authentication → Emails → Templates → "Confirm signup"** — replace the body so it
shows `{{ .Token }}`:

```html
<h2>Confirm your signup</h2>
<p>Your re-forge verification code is:</p>
<p style="font-size:24px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
<p>It expires shortly. If you didn't request this, ignore this email.</p>
```

`{{ .Token }}` is the 6-digit code the SPA's `verifyOtp({ type: 'signup' })` expects.
(Do **not** use `{{ .ConfirmationURL }}` — that is the magic-link variable.)

## 4. Set the Site URL

**Authentication → URL Configuration → Site URL**: `https://re-forge.theadaply.com`.
No redirect URLs are needed (there is no magic-link / OAuth callback).

## 5. Put the public credentials in the SPA

The SPA reads two **non-secret** values at runtime from
[`showcase/public/site-config.json`](../showcase/public/site-config.json) (fetched,
not bundled — so you fill them at deploy with no rebuild):

```json
{
  "SUPABASE_URL": "https://YOUR_PROJECT_REF.supabase.co",
  "SUPABASE_ANON_KEY": "REPLACE_WITH_PUBLIC_ANON_KEY"
}
```

From **Project Settings → API**:

- **Project URL** → `SUPABASE_URL`.
- Project API keys → the **`anon` `public`** key (a JWT starting `eyJ…`) →
  `SUPABASE_ANON_KEY`.

The anon key is **public by design** — Row-Level Security, not key secrecy, protects
the data. **Never** put the `service_role` key, `DATABASE_URL`, or
`REFORGE_MASTER_KEK` in this file or anywhere else in `showcase/`.

## 6. Mint the first org code

Sign-up **requires** a valid, unused org code. Because the very first org has no
admin yet, create the org and its first (admin) code together with
[`scripts/mint-org-code.py`](../scripts/mint-org-code.py). It reads the owner/service
`DATABASE_URL` from `~/.reforge/db.env` and prints the plaintext code **once**
(stored only as a sha256 hash):

```bash
# bootstrap: create the org AND mint its first admin code in one step
uv run --with 'psycopg[binary]' scripts/mint-org-code.py --create-org "Acme" --role admin
```

Hand the printed `rfj_…` code to the first teammate. For everyone after that, mint a
single-use member code against the existing org:

```bash
uv run --with 'psycopg[binary]' scripts/mint-org-code.py --org-name "Acme"
```

Flags: `--role member|admin` (never `owner`), `--max-uses N` (default `1`) or
`--unlimited`, `--expires-in-days D`, `--label`. Full detail and the
promote-founder-to-owner SQL are in `scripts/README-auth.md`.

## 7. How a teammate signs up

Once the dashboard is merged in and the site is deployed:

1. Open the site → **Create an account**.
2. Enter the **org code** (`rfj_…`), their **name**, **email**, and a **password**
   (8+ chars). A bad or used code is rejected immediately (the `validate_org_code`
   pre-check) — before any email is sent.
3. They receive a **6-digit code** by email → enter it → **Verify & continue**.
   That verify fires the trigger, which consumes the org code and creates their
   named, org-scoped `reforge.app_users` row.
4. They land on the dashboard, scoped by RLS to their org. Next time they just
   **Sign in** with email + password.

Confirm it worked (one query, as `postgres`):

```sql
select display_name, email, role, org_id, supabase_uid
  from reforge.app_users
 order by created_at desc
 limit 5;
```

The new teammate should appear with the right `display_name`, `org_id`, and `role`,
and the code's `uses` should have incremented by exactly 1.

## Security boundaries (do not cross)

- The **anon public key** is the only Supabase credential the SPA needs. Never put
  `DATABASE_URL`, `REFORGE_MASTER_KEK`, or the **`service_role`** key in `showcase/`.
- The org code is the only sign-up gate. It is 256-bit (`rfj_` + 32 url-safe bytes)
  and stored only as a sha256 hash — not enumerable, not brute-forceable through
  `validate_org_code`.
- A confirmed user **always** maps to exactly one org (the trigger is fail-closed —
  no org code, no account). `org_keys` (wrapped DEKs) and `events` (the hash-chained
  audit log) are **never** granted to the client.

## Validation (after merging into the unified SPA)

The auth module lives entirely under `showcase/src/auth/` and is wired in at merge
time (`AuthProvider` → `SessionGuard` → `Dashboard`; see `specs/site-auth.md`
"Wiring"). After merge, with credentials filled:

```bash
cd showcase
npm install      # pulls @supabase/supabase-js, updates package-lock.json
npm run lint     # eslint over src/ (incl. the auth components)
npm run build    # vite production build
```
