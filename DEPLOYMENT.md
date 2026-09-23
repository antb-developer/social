# Deployment Plan — Seller Order Desk

Three independent pieces to ship: **Supabase** (already live), **apps/api**
(Express, needs a host that runs a persistent Node process), **apps/web**
(static Vite build, needs a static host). Recommended path below is
git-based push-to-deploy for both app pieces — connect each to this repo,
and every push to `main` redeploys automatically. Everything here is a
recommendation, not a requirement; swap any piece for whatever you already
have accounts/infra for.

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
- [ ] A Railway (or Render/Fly.io) account for the API
- [ ] A Vercel (or Netlify/Cloudflare Pages) account for the web app
- [ ] Nothing needed for Supabase — already provisioned

---

## Step 1 — Push code to GitHub

```bash
git checkout feature/seller-order-desk
git push -u origin feature/seller-order-desk
```

Then either:
- **Merge to `main`** now (`gh pr create --base main --head feature/seller-order-desk`,
  merge it) if you want `main` to be what auto-deploys, or
- **Deploy straight from the feature branch** and merge later — both
  Railway and Vercel let you pick any branch as the production branch, so
  this isn't blocking.

I'd default to merging to `main` first (matches what both hosts assume by
default and keeps the deploy config simple) — say if you'd rather deploy
from the feature branch instead.

## Step 2 — Deploy the API (Railway)

1. New Project → **Deploy from GitHub repo** → pick this repo.
2. Railway auto-detects the `Dockerfile`. If it tries to build from
   `apps/api/` as the root instead of the monorepo root, set **Root
   Directory** to `/` (repo root) and **Dockerfile Path** to
   `apps/api/Dockerfile` — the Dockerfile's `COPY` paths assume a repo-root
   build context.
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

   **Do not deploy with the default superadmin credentials or token secret
   — they're public knowledge now (in this chat and in `.env.example`).**
4. Deploy. Railway gives you a `*.up.railway.app` URL — note it, `apps/web`
   needs it as `VITE_API_BASE_URL`.
5. Health check: `curl https://<your-api>.up.railway.app/api/health` → `{"ok":true}`.

*(Render or Fly.io work the same way — GitHub-connected service, same
Dockerfile, same env vars. Railway's just the least config for a first
deploy.)*

## Step 3 — Deploy the web app (Vercel)

1. New Project → import this GitHub repo.
2. Framework preset: **Vite**. Root Directory: `apps/web`.
3. Build command: `npm run build` (inherits from `apps/web/package.json`).
   Output directory: `dist`.
4. Environment variables (all `VITE_*` ones are baked in at build time, so
   set them *before* the first deploy):

   | Var | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | same as API's `SUPABASE_URL` |
   | `VITE_SUPABASE_ANON_KEY` | same as API's `SUPABASE_ANON_KEY` |
   | `VITE_API_BASE_URL` | the Railway URL from Step 2 |
   | `VITE_DEV_OTP_MODE` | matches the API's `DEV_OTP_MODE` |
   | `VITE_VAPID_PUBLIC_KEY` | the **public** VAPID key from Step 2 |

5. SPA fallback: Vercel's Vite preset handles this automatically (rewrites
   unknown paths to `index.html`). If you use a different host, add that
   rewrite rule explicitly.
6. Deploy. You get a `*.vercel.app` URL.

*(Netlify/Cloudflare Pages: same idea — root `apps/web`, build command
`npm run build`, publish dir `dist`, same env vars, and you'll need to add
the SPA fallback rewrite explicitly on Netlify: a `_redirects` file with
`/* /index.html 200`.)*

## Step 4 — Wire CORS to the real web origin

Right now `apps/api/src/app.ts` does `app.use(cors())` — open to any
origin. Once you know the production web URL (Vercel domain or your custom
domain), tighten it:

```ts
app.use(cors({ origin: "https://your-web-domain.com" }));
```

I can make this change (and read it from an env var so previews still work)
whenever you're ready — didn't want to do it blind without knowing the
final domain.

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

**Domain.** Plan above uses the free `*.up.railway.app` / `*.vercel.app`
subdomains. If you have (or want) a custom domain, both hosts support it
directly in their dashboards (Railway: Settings → Domains; Vercel: Settings
→ Domains) — DNS is usually a CNAME, a few minutes to propagate.

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
# merge → main auto-redeploys both Railway and Vercel
```

Both Railway and Vercel also give you preview deployments per-branch/PR if
you want to test before merging — worth turning on once the initial deploy
is working.
