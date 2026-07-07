# Marketing site — hosting and the one pending DNS action

The marketing site is **built and waiting**. It goes live the instant one DNS
record is added. This doc is the founder-facing runbook: the exact record to
add, how to verify, and how to retire the old host.

> **Status (2026-07-07).** `re-forge.theadaply.com` currently returns **no DNS
> record at all** (NXDOMAIN) — earlier it served a Vercel **HTTP 402** payment
> error. The GitHub Pages build under `TheAdaply/re-forge` is `status: built`
> and its custom domain is already configured. The only missing piece is the
> DNS record below. Adding it is a **founder action** (DNS is not something the
> dev agents change).

Why it matters: the site is the company's front door, and in 2026 the first
visitor is often an *evaluating coding agent* deciding whether re-forge is safe
to install. A payment-failure or dead front door fails that check at step zero.
This is the lowest-effort, highest-trust-per-unit fix on the board.

---

## 1. How the site is hosted (already set up)

| Property            | Value                                                    |
| ------------------- | -------------------------------------------------------- |
| Repo                | `TheAdaply/re-forge` (this repo)                          |
| Publishing source   | `gh-pages` branch, root (`/`)                            |
| Build type          | GitHub Pages *legacy* (branch build, not Actions)        |
| Content             | The `showcase/` Vite + React production build (`vite build`) |
| Custom domain       | `re-forge.theadaply.com` (already set; `CNAME` file present on `gh-pages`) |
| Pages build status  | `built` (latest build commit `bd9b334`, 2026-06-30)      |
| Enforce HTTPS       | **off** — enable after the cert provisions (step 4)      |

Nothing on the GitHub side needs to change to serve the site: the `CNAME` file
and the Pages custom-domain setting are already in place. **Only DNS is missing.**

There is **no** `TheAdaply/theadaply.github.io` repo and **no** separate
`marketing-site` repo — the site is served by *this* repo's `gh-pages` branch.
`theadaply.github.io` is simply GitHub's Pages ingress hostname (see step 2).

---

## 2. The one-line DNS change (founder action)

DNS for `theadaply.com` is hosted at **GoDaddy** (nameservers
`ns29.domaincontrol.com` / `ns30.domaincontrol.com`). In the GoDaddy DNS
manager for `theadaply.com`, add **one** record:

| Type  | Name (host) | Value / Points to    | TTL           |
| ----- | ----------- | -------------------- | ------------- |
| CNAME | `re-forge`  | `theadaply.github.io` | 600 (or 1 hr) |

That is the whole change. `theadaply.github.io` is the correct target for a
GitHub Pages **subdomain** custom domain even though the content lives in a
project repo — GitHub routes to the right repo using the `CNAME` file. (This is
GitHub's documented subdomain setup:
[Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).)

There is currently **no** `re-forge` record, so this is a clean *add* — nothing
to delete or overwrite first. The `theadaply.com` apex and `www` are unrelated
to this change and can be left alone.

**Fallback (only if a CNAME on the subdomain is ever refused):** instead of the
CNAME, add four `A` records on host `re-forge` to the GitHub Pages addresses
`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
Prefer the CNAME.

---

## 3. Verify it went live

DNS propagation is usually minutes. Then:

```sh
# 1) The record now resolves to GitHub Pages:
dig +short re-forge.theadaply.com          # expect a CNAME to theadaply.github.io -> 185.199.108–111.153

# 2) The site serves the real build (HTTP 200 + the real title):
curl -sSL http://re-forge.theadaply.com/ | grep -i '<title>'
#   expect: re-forge — multi-agent operating procedure for coding agents
```

Pre-flight proof (done 2026-07-07, before DNS): forcing the domain to a GitHub
Pages IP already serves the real build —
`curl --resolve re-forge.theadaply.com:80:185.199.108.153 http://re-forge.theadaply.com/`
returns **HTTP 200** with the production `index.html` (references the hashed
bundle `/assets/index-BzoypaV7.js`). So the content is confirmed real and ready;
only DNS gates it.

---

## 4. Enable HTTPS (after the cert provisions)

Once DNS points at GitHub, GitHub auto-provisions a Let's Encrypt certificate
for `re-forge.theadaply.com` (typically minutes, up to ~1 hour). Until then,
HTTPS to the domain will fail cert validation — this is expected and clears on
its own. When the cert is issued:

- Repo **Settings → Pages → Enforce HTTPS** — turn it **on** (it is currently
  off). This makes `http://` 301-redirect to `https://`.

Optional hardening: **Settings → Pages → verify domain** (add the
`_github-pages-challenge-TheAdaply` TXT record GitHub shows you) to claim the
domain at the org level and prevent subdomain-takeover of the name later. Not
required to serve; recommended.

---

## 5. Retire the legacy Vercel host (hygiene — closes the dead-endpoint family)

The domain used to point at Vercel, where a delinquent (unpaid) account now
returns **HTTP 402 / `DEPLOYMENT_DISABLED`**. Once Pages is confirmed live
(steps 3–4), remove the dead Vercel host so a stale endpoint can never resurface:

1. **Marketing project.** In the founder's Vercel account, the project `re-forge`
   still binds the domain `re-forge.theadaply.com`. Remove that domain from the
   project (Settings → Domains), then delete the project — GitHub Pages fully
   replaces it.
2. **Dead ingest deployment.** Separately, `reforge-ingest.vercel.app` returns
   the same 402 and lives on the *older* Vercel account (not the one holding the
   marketing project). Locate that account and delete/disable that deployment
   too. This is the dead ingest endpoint behind the capture-goes-nowhere issues;
   the capture client has already been repointed off it, so deleting it only
   removes a dead URL.

**Order & safety:** do DNS first (step 2), confirm Pages is live (step 3), *then*
delete on Vercel. There is no downtime window — DNS moves the name straight from
"does not resolve" to GitHub Pages and never points back at Vercel.

---

## Verification log (2026-07-07)

- `re-forge.theadaply.com` — no CNAME and no A record on both `1.1.1.1` and
  `8.8.8.8` (NXDOMAIN for the subdomain).
- `theadaply.com` apex — A `3.33.130.190` / `15.197.148.33` (GoDaddy parking);
  NS `ns29`/`ns30.domaincontrol.com` (GoDaddy). `www` is a CNAME to the apex.
- `TheAdaply/re-forge` Pages API — `status: built`, `cname:
  re-forge.theadaply.com`, source `gh-pages` (root), `https_enforced: false`.
- `gh-pages` `CNAME` file = `re-forge.theadaply.com`; `index.html` is the Vite
  production build (hashed `/assets/*` bundle).
- Force-resolved fetch to `185.199.108.153` / `185.199.109.153` → **HTTP 200**,
  real marketing HTML. HTTPS via force-resolve fails cert validation (cert not
  yet provisioned — expected pre-DNS).
- `reforge-ingest.vercel.app` → **HTTP 402**, `x-vercel-error:
  DEPLOYMENT_DISABLED`.
