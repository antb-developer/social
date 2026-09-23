# Seller Order Desk

A store link, an order pipeline, and an order-level message thread — for small
Indian Instagram/WhatsApp sellers who currently track orders by scrolling
chats.

## Tech stack

- **Frontend** (`apps/web`): React 18 + Vite + TypeScript, React Router,
  TanStack Query, Tailwind CSS. Mobile-first PWA (manifest + service worker)
  with Web Push.
- **Backend** (`apps/api`): Node.js + Express + TypeScript, MVC structure
  (`routes → controllers → services → repositories`), Zod validation.
- **Database/Auth/Storage/Realtime**: Supabase (Postgres, Auth, Storage,
  Realtime), Row Level Security on every table.
- **Notifications**: Web Push (VAPID).

## Monorepo structure

```
apps/api/          Express API
apps/web/           React PWA (customer storefront + seller dashboard)
supabase/
  migrations/       Schema, RLS, Storage buckets, Realtime publication
  config.toml       Local Supabase CLI config (auth/storage/realtime)
```

## Prerequisites

- Node.js 22+ and npm
- A [Supabase](https://supabase.com) project — either:
  - **Local**: [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
    + Docker Desktop (`supabase start`), or
  - **Hosted**: a project created at supabase.com

## Setup

### 1. Install dependencies

```bash
npm install
```

This is an npm workspace — one install at the repo root covers both
`apps/api` and `apps/web`.

### 2. Set up the Supabase project

**Local (recommended for development):**

```bash
supabase start
```

This applies `supabase/config.toml`, which enables phone+OTP auth and
configures `auth.sms.test_otp` so the demo seller/customer numbers from the
seed script accept a fixed `123456` code without needing real SMS (see
[Local dev OTP](#local-dev-otp-devotpmode) below). `supabase start` prints
the local API URL, anon key, and service role key — you'll need these for
the env vars in the next step.

**Hosted:** create a project at supabase.com and grab the URL/keys from
*Project Settings → API*. For a hosted dev/staging project, add the same
`[auth.sms.test_otp]` entries via the dashboard (*Authentication → Providers
→ Phone*) if you want `DEV_OTP_MODE` to work without a real SMS provider —
otherwise you'll need a configured SMS provider (see
[Enabling real SMS OTP](#enabling-real-sms-otp-after-dlt-registration)).

Either way, apply the schema:

```bash
# Local: migrations apply automatically on `supabase start`.
# Hosted: link the project, then push migrations.
supabase link --project-ref <your-project-ref>
supabase db push
```

This runs, in order:

1. `0001_init.sql` — tables, enums, the `order_no` (`ORD-1024`) generator
2. `0002_rls.sql` — Row Level Security policies for every table
3. `0003_storage.sql` — `product-images` (public) and `payment-proofs`
   (private) Storage buckets + their RLS policies
4. `0004_realtime.sql` — adds `orders`/`order_messages` to the
   `supabase_realtime` publication (needed for the live-updating order
   thread and dashboard board)
5. `0005_seller_profile.sql` — adds the optional `description` and `address`
   columns shown on the public storefront

### 3. Environment variables

Copy the two `.env.example` files and fill them in:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

**`apps/api/.env`**

| Var | Description |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | From your Supabase project settings |
| `DEV_OTP_MODE` | `true` in local/dev — see [Local dev OTP](#local-dev-otp-devotpmode) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | `npx web-push generate-vapid-keys`; `VAPID_SUBJECT` is a `mailto:` contact |
| `PORT`, `NODE_ENV` | Server port and environment |

**`apps/web/.env`**

| Var | Description |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Same Supabase project, anon key only |
| `VITE_API_BASE_URL` | Where `apps/api` is running (e.g. `http://localhost:4000`) |
| `VITE_DEV_OTP_MODE` | Mirrors the API's flag — shows/prefills the `123456` hint in the login UI |
| `VITE_VAPID_PUBLIC_KEY` | The **public** half of the same VAPID key pair as the API |

### 4. Seed demo data (optional)

```bash
npm run seed --workspace apps/api
```

Creates one demo seller (`demo-store`, phone `+919990001111`), 8 products (2
out of stock), the default templates, and one order in each status. Also
provisions the superadmin identity (see the Superadmin section below) so
`/superadmin` is reachable locally without waiting for a first login.
Idempotent — safe to re-run.

## Running locally

```bash
npm run dev:api    # apps/api on :4000
npm run dev:web    # apps/web on :5173 (separate terminal)
```

Storefront: `http://localhost:5173/s/demo-store`
Seller dashboard: `http://localhost:5173/seller/login`
Superadmin: `http://localhost:5173/superadmin` (username `superadmin`,
password `Superadmin@123` by default — see the Superadmin section below;
already-authenticated superadmin sessions land straight on `/superadmin/dashboard`)

## Testing

```bash
npm run test --workspace apps/api    # 178 unit/integration tests (vitest)
npm run test --workspace apps/web    # 26 unit tests (vitest)
npm run test:e2e --workspace apps/web  # Playwright happy-path E2E
```

The E2E test (`apps/web/e2e/happy-path.spec.ts`) drives the real UI through
the full order → payment request → proof → approve → ship → deliver flow in
a real browser, but with every network call intercepted by an in-memory
mock rather than hitting a real API/Supabase — see the comment at the top
of that file for why and what it does/doesn't verify. To exercise the real
stack end-to-end, point the app at a running `apps/api` + local Supabase
instead (manual QA, or adapt the spec to hit real servers with seeded data).

## Superadmin

Platform-staff-only area for cross-store visibility and store lifecycle
operations, with its own login — a single fixed username+password, not tied
to the phone+OTP flow the rest of the app uses:

- **`POST /api/superadmin/login`** (public, rate limited) — checks the
  username/password against `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD`
  env vars (default `superadmin` / `Superadmin@123` — **set real values via
  env before deploying anywhere reachable**). On success it provisions (or
  reuses) one fixed `auth.users` identity and a matching `superadmins` row,
  then returns a signed, 12h-expiring bearer token
  (`superadminTokenService.ts`, HMAC'd with `SUPERADMIN_TOKEN_SECRET` — also
  set a real value in production). This token is independent of
  `DEV_OTP_MODE` and of Supabase sessions; `requireAuth` recognizes it
  directly (`apps/api/src/middleware/auth.ts`), and `requireSuperadmin`
  still re-checks the `superadmins` table on every request after that.
- Frontend: `/superadmin` is the login page
  (`SuperadminLoginPage.tsx`). The token lives in `localStorage` via
  `lib/superadminAuth.ts` and is attached to every API call ahead of the
  customer/seller auth (`lib/apiClient.ts`). An already-logged-in superadmin
  visiting `/superadmin` is redirected straight to `/superadmin/dashboard`;
  a stale/invalid token is cleared automatically, dropping back to the login
  form. `/superadmin/dashboard`, `/stores`, `/stores/:id`, `/orders` are
  gated by `RequireSuperadmin`, which bounces anyone without a valid token
  back to `/superadmin`. Signing out anywhere in the app (`AuthContext.signOut`)
  also clears the superadmin token.
- `/superadmin/dashboard` — store/order totals across the platform.
- `/superadmin/stores` — searchable, paginated store list.
- `/superadmin/stores/:id` — store details, its orders and members, plus the
  three destructive actions below.
- `/superadmin/orders` — every order across every store, filterable by
  store/status/date/search.

Destructive actions all require a typed confirmation phrase and are rate
limited (`superadminDestructiveRateLimiter`, 10 requests / 5 min):

- **Download backup** (`POST /api/superadmin/stores/:id/backup`) — streams a
  ZIP with one JSON file per table (store, members, products, templates,
  customers, orders, order items, messages, payment proof metadata with
  signed URLs, status history).
- **Delete all orders** (`DELETE /api/superadmin/stores/:id/orders`, body
  `{ "confirm": "DELETE ORDERS" }`) — deletes the store's orders (and
  everything that cascades from them) via the `superadmin_delete_store_orders`
  SQL function; leaves products, customers and the store itself untouched.
- **Delete store** (`DELETE /api/superadmin/stores/:id`, body
  `{ "confirm": "DELETE STORE <slug>" }`) — deletes the store via
  `superadmin_delete_store`, relying on the `on delete cascade` chains from
  `sellers` already in the schema.

Every action that views or changes a store is written to
`superadmin_audit_logs` (`store_viewed`, `backup_created`, `orders_deleted`,
`store_deleted`) via `recordSuperadminAudit`.

## Deployment

### API

```bash
docker build -f apps/api/Dockerfile -t seller-order-desk-api .
docker run -p 4000:4000 --env-file apps/api/.env seller-order-desk-api
```

Multi-stage build; run it from the repo root (build context needs the whole
workspace). Set the same env vars as local, pointing at your production
Supabase project.

### Web

`apps/web` builds to a static bundle (`npm run build --workspace apps/web`
→ `apps/web/dist`) — deploy it to any static host (Vercel, Netlify,
Cloudflare Pages, etc.) with the `VITE_*` env vars set at build time. Make
sure the host serves `index.html` for unknown paths (SPA fallback) and
serves `apps/web/public/*` (icons, `manifest.webmanifest`, `sw.js`) as-is.

**Known follow-up:** the production JS bundle is ~500KB
(`vite build` warns about this) — no route-based code-splitting yet. Worth
addressing before shipping to genuinely low-end Android devices, per the
mobile-first requirement.

### Supabase (production)

- `supabase db push` against the production project to apply migrations.
- Set real VAPID keys (not the dev ones).
- **Do not** carry `[auth.sms.test_otp]` into a production project — see
  below.
- The placeholder app icons (`apps/web/public/icon-192.png`/`icon-512.png`,
  rasterized from the Vite scaffold's default favicon) should be replaced
  with real brand assets before a public launch.

## Local dev OTP (`DEV_OTP_MODE`)

Real SMS delivery requires an
[Indian DLT](https://www.google.com/search?q=DLT+registration+SMS+India)-registered
sender ID/template, which usually isn't ready during development. Two flags
work together to unblock local work in the meantime:

- `VITE_DEV_OTP_MODE=true` (frontend): shows a "Dev mode: use OTP 123456"
  hint and pre-fills the code field.
- `apps/api/.env`'s `DEV_OTP_MODE` is informational only right now — OTP
  requests never go through the Express API (the frontend calls Supabase's
  phone auth directly), so there's nothing in the backend to gate. The code
  actually has to be accepted by Supabase, which is controlled by
  **`supabase/config.toml`'s `[auth.sms.test_otp]`** (local) or the
  dashboard's equivalent (hosted dev projects) — see [Setup](#2-set-up-the-supabase-project)
  above. Only the phone numbers listed there accept the fixed code; anyone
  else still needs a real SMS provider configured.

## Enabling real SMS OTP after DLT registration

Once your DLT registration (sender ID + templates) is approved:

1. Pick an SMS provider Supabase supports (Twilio, MessageBird, Vonage,
   TextLocal, or a generic webhook) — see
   [Supabase's Phone Login docs](https://supabase.com/docs/guides/auth/phone-login).
2. **Hosted project:** *Authentication → Providers → Phone* in the Supabase
   dashboard — enable it and enter your provider's credentials (account
   SID/auth token for Twilio, etc.) and your DLT-approved sender ID/template.
   **Local:** the equivalent is `supabase/config.toml`'s
   `[auth.sms.<provider>]` block (e.g. `[auth.sms.twilio]`, already stubbed
   in this repo's config with `enabled = false`) — fill in credentials via
   `env(...)` references, never hardcoded.
3. Remove (or leave empty) `[auth.sms.test_otp]` in
   `supabase/config.toml`/the dashboard — those numbers must stop
   auto-accepting `123456` once real SMS is live.
4. Set `DEV_OTP_MODE=false` / `VITE_DEV_OTP_MODE=false` in both `.env`
   files so the UI stops showing the dev hint.
5. Test with a real phone number end-to-end before rolling out broadly —
   DLT template mismatches are a common source of silently-dropped SMS.
