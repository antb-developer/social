# Build Prompt: Seller Order Desk (React + Node)

You are a senior full-stack engineer. Build a production-ready MVP web app for small Indian Instagram/WhatsApp sellers. It replaces "tracking orders by scrolling chats" with a store link, an order pipeline, and an order-level message thread.

If an existing React + Node + Supabase codebase is provided, EXTEND it and follow its existing MVC conventions. Do not scaffold a new app in that case.

## Tech stack
- Frontend: React 18 + Vite + TypeScript, React Router, TanStack Query, Tailwind CSS. Mobile-first PWA with a manifest, service worker and Web Push.
- Backend: Node.js + Express + TypeScript, MVC structure (routes → controllers → services → repositories), Zod validation.
- Database/Auth/Storage: Supabase (Postgres, Auth, Storage, Realtime). Use Row Level Security on every table.
- Notifications: Web Push (VAPID) for sellers and customers.
- Deployment-ready: .env.example, Dockerfile for the API, README with setup steps.

## Users & auth
- **Seller**: phone + otp signup. On signup, pick a store name; generate a unique, editable slug (lowercase letters, digits and hyphens; reserved words blocked).
- **Seller staff**: the owner can add members by phone or username with role `owner | staff`. Staff can manage orders and products but cannot manage settings or billing.
- **Customer**: login with Indian mobile number + OTP (Supabase phone auth). Include a `DEV_OTP_MODE` env flag that accepts OTP `123456`, because DLT-registered SMS may not be ready yet. Ask for the name once on first login.

## Data model (Postgres)
- `sellers` (id, name, slug unique, phone, whatsapp_number, upi_id, upi_name, logo_url, is_accepting_orders, created_at)
- `seller_members` (seller_id, user_id, role)
- `products` (id, seller_id, name, description, price_paise int, images text[], in_stock bool, is_active bool, sort_order, created_at)
- `customers` (id = auth user id, phone unique, name, created_at)
- `orders` (id uuid, order_no human-readable per seller e.g. "ORD-1024", seller_id, customer_id, status, total_paise, address jsonb null, proof_uploaded bool, created_at, updated_at)
  - status enum: `new | pending_payment | paid | shipped | delivered | cancelled`
- `order_items` (order_id, product_id, name_snapshot, price_snapshot_paise, qty)
- `templates` (id, seller_id, kind `text | payment_request | form_request`, title, body, fields jsonb, created_at)
  - For `form_request`, fields are an array of { key, label, type: text|textarea|phone|pincode|select, options?, required }.
  - Seed defaults on signup: "Payment details" (payment_request) and "Shipping address" (form_request with name, phone, address line, city, state, pincode).
- `order_messages` (id, order_id, sender `seller | customer | system`, kind `text | payment_request | form_request | form_response | payment_proof | status_change`, payload jsonb, created_at)
- `payment_proofs` (id, order_id, image_url, utr text NOT NULL, amount_paise, review `pending | approved | rejected`, reviewed_by, created_at)
- `order_status_history` (order_id, from_status, to_status, changed_by, note, created_at)
- `push_subscriptions` (user_id, endpoint, keys jsonb)

Store all money as integer paise.

## Customer flows
1. `/s/:slug`: storefront with seller header, product grid, out-of-stock products shown greyed out, sticky cart bar. Show a "not accepting orders" banner when the seller has turned orders off.
2. `/s/:slug/cart`: adjust quantities, then place the order. OTP login is required at this step, not for browsing. The cart persists in localStorage until the order is placed.
3. After the order is placed: redirect to `/o/:orderId` and show a button **"Notify seller on WhatsApp"** that opens `wa.me/<seller>?text=` with the order number and link prefilled.
4. `/o/:orderId`: order summary, status timeline, and a message thread rendered by kind:
   - `payment_request`: shows the UPI ID, a QR code generated from `upi://pay?pa=&pn=&am=&tn=<order_no>`, a "Pay with UPI app" deep link, and an "Upload payment proof" button. The proof form requires the image plus a UTR (12 digits).
   - `form_request`: renders an inline form; submitting it creates a `form_response`. If the form is the address form, also save the result to `orders.address`.
   - `text`: plain bubble; the customer can reply with text.
5. `/my-orders`: all of the customer's orders across sellers, with filter tabs: All, New, Pending Payment, Paid, Shipped, Delivered, Cancelled.

## Seller flows
1. `/dashboard/orders`: filter tabs with counts (New, Pending Payment, Paid, Shipped, Delivered, Cancelled), search by order no, phone or name, and a date filter. Orders with `proof_uploaded` and a pending review show a highlighted **"Proof uploaded"** badge and sort to the top of the Pending Payment tab.
2. `/dashboard/orders/:id`: order details plus the same thread. The composer has:
   - A "Send template" picker, which inserts a payment_request, form_request or text template. The payment request automatically fills in the order total.
   - A free text reply box.
   - Status action buttons that only allow valid transitions: new→pending_payment|cancelled, pending_payment→paid|cancelled, paid→shipped|cancelled, shipped→delivered.
   - Proof review: shows the proof image, UTR and amount, with an "I verified this in my bank app" checkbox that must be ticked before **Approve** (sets status to paid) or **Reject** (asks the customer to re-upload).
   - After any seller action, a "Share on WhatsApp" button opens a wa.me link to the customer with a short message plus the order link.
   Every status change writes to `order_status_history` and adds a `system` message to the thread.
3. `/dashboard/products`: CRUD with image upload (compress on the client to ≤300KB), an in-stock toggle, and drag-to-reorder.
4. `/dashboard/templates`: CRUD for templates, including a simple form-field builder.
5. `/dashboard/settings`: store profile, slug, UPI ID/name, WhatsApp number, accept-orders toggle, team members, and a copy/share store link with a QR code.

## Realtime & notifications
- Use Supabase Realtime on `order_messages` and `orders` so the thread and board update live.
- Send Web Push to all seller members for: new order, customer message, proof uploaded, form submitted.
- Send Web Push to the customer for: seller message, payment/form request, status change.
- Clicking a notification opens the relevant order.

## API (Express, JWT from Supabase verified via middleware)
- Public: `GET /api/stores/:slug`, `GET /api/stores/:slug/products`
- Customer: `POST /api/orders`, `GET /api/me/orders?status=`, `GET /api/orders/:id`, `POST /api/orders/:id/messages`, `POST /api/orders/:id/proof`
- Seller: `GET /api/seller/orders?status=&q=&from=&to=`, `GET /api/seller/orders/:id`, `POST /api/seller/orders/:id/messages`, `PATCH /api/seller/orders/:id/status`, `POST /api/seller/proofs/:id/review`, CRUD for `/api/seller/products` and `/api/seller/templates`, `GET/PATCH /api/seller/settings`, `POST /api/seller/members`
- `POST /api/push/subscribe`

The server re-computes the order total from the database; never trust client prices. Enforce the status transitions on the server. Rate-limit order creation and OTP requests.

## Non-functional
- Mobile-first UI, usable on low-end Android at 360px width, Hindi/Punjabi-ready (i18n keys, English first).
- Images go in Supabase Storage in per-seller folders; payment proofs go in a private bucket served through signed URLs.
- Show loading, empty and error states everywhere.
- Seed script: one demo seller with 8 products and sample orders in every status.
- Tests: unit tests for the status-transition and order-total services; one e2e happy path (order → payment request → proof → approve → ship → deliver).

## Deliverables & order of work
1. DB migration SQL + RLS policies + seed
2. API with the MVC structure
3. Customer storefront, cart and order thread
4. Seller dashboard
5. Realtime + Web Push + PWA
6. README (setup, env vars, deploy notes, how to enable real SMS OTP after DLT registration)

Before coding, briefly confirm the folder structure and schema, then build step by step.


## Loop rules (read every iteration)
- Keep progress in PLAN.md at the project root. If it doesn't exist, create it
  as a checklist from "Deliverables & order of work", broken into small tasks.
- Each iteration: read PLAN.md, pick the FIRST unchecked task, implement it,
  run build/tests, fix errors, tick it off, and git commit.
- Do only one task per iteration.
- If stuck on a task for 3 iterations, write the blocker in PLAN.md and move on.
- When every task is ticked and the build and tests pass, output <promise>DONE</promise>.
