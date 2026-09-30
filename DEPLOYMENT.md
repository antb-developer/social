# Deployment Plan — Seller Order Desk

Three independent pieces to ship: **Supabase** (already live), **apps/api**
(Express, needs a host that runs a persistent Node process), **apps/web**
(static Vite build, served by nginx on a DigitalOcean droplet).

- **Web → DigitalOcean droplet**, automatic: `.github/workflows/deploy-web.yml`
  builds `apps/web` and rsyncs `dist/` to the droplet on every push to `main`
  that touches `apps/web/**`. nginx config lives in `deploy/nginx.conf`.
- **API → Railway**, manual: deployed by hand, not wired to auto-deploy on push.

## Current state (checked 2026-09-23)

- **Supabase**: live project (`lotvdodkvtynqanghdln`), all 7 migrations
  applied (0001–0007, confirmed via `psql` this session). Auth is in
  `DEV_OTP_MODE` — real SMS OTP needs [DLT
  registration](https://www.google.com/search?q=DLT+registration+SMS+India)
  first (see README's "Local dev OTP" section). VAPID keys are unset.
- **apps/api**: Express + TS, builds via `tsc`, has a working multi-stage
  `Dockerfile` (build from repo root: `docker build -f apps/api/Dockerfile .`).
  `cors()` is wide open (no origin restriction) — fine for now, tighten
  before this is public-facing with real user data.
- **apps/web**: Vite + React, static build (`npm run build --workspace
  apps/web` → `apps/web/dist`), needs `VITE_*` env vars baked in **at build
  time**, SPA fallback routing, and `apps/web/public/*` (manifest, service
  worker, icons) served as-is.
- **Git**: `origin` is `github.com/antb-developer/shoe-shop.git`. `origin/main`
  has one placeholder commit ("first") — none of this work has been pushed
  yet. All of it lives on the local-only branch `feature/seller-order-desk`.

## Prerequisites

- [ ] A GitHub account with push access to `origin` (or a new repo, if you'd
      rather not reuse `shoe-shop`)
- [ ] A Railway account for the API
- [ ] A DigitalOcean droplet (Ubuntu + nginx) for the web app, with an SSH
      key the GitHub Action can use
- [ ] Nothing needed for Supabase — already provisioned

---

## Step 1 — Push code to GitHub

```bash
git checkout feature/seller-order-desk
git push -u origin feature/seller-order-desk
```

Then merge to `main` (`gh pr create --base main --head feature/seller-order-desk`)
— the web deploy workflow only runs on pushes to `main` (or manually via
**Actions → Deploy web → Run workflow**).

## Step 2 — Deploy the API (Railway, manual)

1. Create a Railway service for the API. Deploys are triggered manually
   (not on push to `main`).
2. Deploy from the **repo root** (`railway up`). `railway.json` at the root
   pins the build to `apps/api/Dockerfile` and sets the health check to
   `/api/health` — the Dockerfile's `COPY` paths assume a repo-root build context.
3. Environment variables (Settings → Variables) — copy from
   `apps/api/.env.example`, using **production** values:

   | Var | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `SUPABASE_URL` | `https://lotvdodkvtynqanghdln.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | from Supabase → Project Settings → API |
   | `SUPABASE_ANON_KEY` | from Supabase → Project Settings → API |
   | `DEV_OTP_MODE` | see "Open decision: OTP mode" below |
   | `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | generate: `npx web-push generate-vapid-keys` |
   | `VAPID_SUBJECT` | `mailto:you@yourdomain.com` |
   | `SUPERADMIN_USERNAME` | pick a real one, not `superadmin` |
   | `SUPERADMIN_PASSWORD` | a real strong password, not `Superadmin@123` |
   | `SUPERADMIN_TOKEN_SECRET` | random secret — `openssl rand -hex 32` |
   | `PORT` | leave unset; Railway injects its own and the app reads `process.env.PORT` |
   | `CORS_ORIGIN` | the droplet's web origin, e.g. `https://your-domain.com` (see Step 4) |

   **Do not deploy with the default superadmin credentials or token secret
   — they're public knowledge now (in this chat and in `.env.example`).**
4. Deploy manually. Railway gives you a `*.up.railway.app` URL — note it, `apps/web`
   needs it as `VITE_API_BASE_URL`.
5. Health check: `curl https://<your-api>.up.railway.app/api/health` → `{"ok":true}`.

Redeploy by hand after API changes land on `main`.

## Step 3 — Deploy the web app (DigitalOcean droplet)

**One-time droplet setup:**

1. Install nginx, create the web root: `sudo mkdir -p /var/www/app` and make
   it writable by the deploy user.
2. Copy `deploy/nginx.conf` to `/etc/nginx/sites-available/app`, replace
   `SERVER_NAME`, symlink into `sites-enabled`, `sudo nginx -t && sudo systemctl reload nginx`.
   The config already handles the SPA fallback (`try_files $uri /index.html`)
   and no-cache headers for `sw.js` / `manifest.webmanifest`.
3. HTTPS (needed for the service worker / push): `sudo certbot --nginx`.

**GitHub repo settings** (Settings → Secrets and variables → Actions):

| Kind | Name | Value |
|---|---|---|
| Secret | `DROPLET_HOST` | droplet IP / hostname |
| Secret | `DROPLET_USER` | SSH user that owns `/var/www/app` |
| Secret | `DROPLET_SSH_KEY` | private key for that user |
| Variable | `VITE_SUPABASE_URL` | same as API's `SUPABASE_URL` |
| Variable | `VITE_SUPABASE_ANON_KEY` | same as API's `SUPABASE_ANON_KEY` |
| Variable | `VITE_API_BASE_URL` | the Railway URL from Step 2 |
| Variable | `VITE_DEV_OTP_MODE` | matches the API's `DEV_OTP_MODE` |
| Variable | `VITE_VAPID_PUBLIC_KEY` | the **public** VAPID key from Step 2 |

`VITE_*` values are baked in at build time — set them before the first run.

**Deploy:** push to `main` (changes under `apps/web/**`), or run
**Actions → Deploy web** manually.

## Step 4 — Wire CORS to the real web origin

Set `CORS_ORIGIN` on the Railway service to the droplet's web origin
(comma-separated for more than one). Unset = open to any origin.

## Step 5 — Production hardening checklist

- [ ] `SUPERADMIN_USERNAME`/`SUPERADMIN_PASSWORD`/`SUPERADMIN_TOKEN_SECRET`
      set to real values (Step 2) — **not** the defaults from this session
- [ ] Real VAPID key pair generated and set on both API and web
- [ ] CORS restricted to the real web origin (Step 4)
- [ ] `supabase/config.toml`'s `[auth.sms.test_otp]` block confirmed **not**
      relevant to the hosted project (test OTPs are a local-CLI-only config,
      not something `db push`/manual SQL carries to production — just
      flagging it as a thing to never introduce there)
- [ ] Placeholder PWA icons (`apps/web/public/icon-192.png`/`icon-512.png`)
      swapped for real brand assets before a public launch
- [ ] Decide the OTP-mode question below before telling real customers about this

## Open decisions (your call, not blocking the rest of the plan)

**OTP mode in production.** Real phone OTP needs DLT registration, which
per the README isn't done yet. Until it is, production has two options:
keep `DEV_OTP_MODE=true` (anyone can log in with OTP `123456` for *any*
phone number — fine for a private beta/demo, not for real customers with
real money moving through payment proofs), or gate the whole site behind
something else (password, IP allowlist, unlisted URL) until DLT is ready.
Flag which one you want and I'll help wire it up.

**Domain.** Web: point an A record at the droplet IP and set it as
`server_name` in nginx. API: Railway's free `*.up.railway.app` subdomain,
or a custom domain via Railway → Settings → Domains (CNAME).

**Scaling the rate limiter.** `express-rate-limit`'s default store is
in-memory, per-process. Fine on a single Railway instance; if you ever
scale the API to multiple instances, the rate limits stop being accurate
across them (each instance counts separately) — would need a shared store
(Redis) at that point. Not a concern for a first deploy.

---

## Ongoing workflow, once this is set up

```
git checkout -b my-change
# ... make changes ...
git push -u origin my-change
gh pr create
# merge → main auto-deploys web to the droplet (GitHub Action)
# API changes → redeploy manually on Railway
```
