# Seller Order Desk — Build Plan

Monorepo layout decision: npm workspaces at `social/` root.
- `apps/web` — React 18 + Vite + TS frontend (PWA)
- `apps/api` — Node + Express + TS backend (MVC: routes → controllers → services → repositories)
- `supabase/` — SQL migrations, RLS policies, seed script

## 0. Setup
- [x] Scaffold monorepo structure (npm workspaces: apps/web, apps/api, supabase/)

## 1. DB migration SQL + RLS policies + seed
- [x] Write initial schema migration (all tables, enums)
- [x] Write RLS policies for all tables
- [x] Write seed script (demo seller, 8 products, sample orders in every status)

## 2. API (MVC)
- [x] Scaffold Express+TS API project (tsconfig, folder structure, error handling, env config)
- [x] Auth middleware (verify Supabase JWT) + seller/staff role middleware
- [x] Order status-transition service + unit tests
- [x] Order total computation service + unit tests
- [x] Public store endpoints (GET /api/stores/:slug, GET /api/stores/:slug/products)
- [x] Customer order endpoints (POST /api/orders, GET /api/me/orders, GET /api/orders/:id)
- [x] Customer message + proof endpoints (POST /api/orders/:id/messages, POST /api/orders/:id/proof)
- [x] Seller order endpoints (GET /api/seller/orders, GET /api/seller/orders/:id, POST messages, PATCH status)
- [x] Seller proof review endpoint (POST /api/seller/proofs/:id/review)
- [x] Seller products CRUD endpoints
- [x] Seller templates CRUD endpoints
- [x] Seller settings + members endpoints (GET/PATCH settings, POST members)
- [x] Push subscribe endpoint
- [x] Rate limiting on order creation and OTP requests
- [x] Dockerfile + .env.example for API

## 3. Customer storefront
- [x] Scaffold Vite+React+TS frontend project (routing, Tailwind, TanStack Query, base layout)
- [x] Customer phone+OTP auth (with DEV_OTP_MODE)
- [x] Storefront page /s/:slug (product grid, out-of-stock, not-accepting-orders banner)
- [x] Cart page /s/:slug/cart (localStorage cart, place order, OTP gate)
- [x] Order confirmation + WhatsApp notify button
- [x] Order detail/thread page /o/:orderId (status timeline, message kinds incl. payment QR + proof upload + form rendering)
- [x] My orders page /my-orders with filter tabs

## 4. Seller dashboard
- [x] Seller signup/login (phone+otp, store name + slug generation)
- [x] Dashboard orders list /dashboard/orders (filter tabs w/ counts, search, date filter, proof badge sort)
- [x] Dashboard order detail /dashboard/orders/:id (thread, template picker, status actions, proof review, WhatsApp share)
- [x] Dashboard products CRUD /dashboard/products (image compression, in-stock toggle, drag-reorder)
- [x] Dashboard templates CRUD /dashboard/templates (form-field builder)
- [x] Dashboard settings /dashboard/settings (profile, slug, UPI, WhatsApp, accept-orders toggle, team members, share QR)

## 5. Realtime + Push + PWA
- [x] Supabase Realtime subscriptions on order_messages/orders (thread + board live update)
- [x] Web Push server integration (VAPID) + notification triggers for sellers
- [x] Web Push client integration + notification triggers for customers, click-to-open
- [x] PWA manifest + service worker

## 6. Wrap-up
- [x] E2E happy-path test (order → payment request → proof → approve → ship → deliver)
- [x] README (setup, env vars, deploy notes, DLT SMS OTP enablement)

## Blockers
(none yet)
