SUPERADMIN — DELIVERABLES & ORDER OF WORK

1. Superadmin database & authorization
   [x] Add superadmin role/permission model
   [x] Add server-side superadmin authorization middleware
   [x] Ensure seller/staff/customer users cannot access superadmin APIs
   [x] Add superadmin audit log for sensitive actions
   [x] Define confirmation requirements for destructive operations

2. Superadmin dashboard
   [x] Create /superadmin/dashboard
   [x] Show total number of stores
   [x] Show total number of orders
   [x] Show basic summary cards
   [x] Add loading, empty and error states
   [x] Add navigation to Stores and Orders

3. Stores management
   [x] Create /superadmin/stores
   [x] List all stores
   [x] Show store name, slug, owner/contact, order count, created date
   [x] Add store search
   [x] Add pagination
   [x] Add store detail navigation
   [x] Add loading, empty and error states

4. Store detail
   [x] Create /superadmin/stores/:id
   [x] Section: Store Details
   [x] Show store name, slug, phone, WhatsApp, UPI details
   [x] Show accepting-orders status
   [x] Show created date
   [x] Section: Orders
   [x] Show store orders with pagination
   [x] Section: Users
   [x] Show owner and staff members
   [x] Show member roles
   [x] Add Store Backup button
   [x] Add Delete All Orders button
   [x] Add Delete Store button
   [x] Require confirmation for every destructive/action button

5. Superadmin orders
   [x] Create /superadmin/orders
   [x] Show all orders across all stores
   [x] Filter by Store
   [x] Search by order number
   [x] Search by customer name/phone
   [x] Filter by date range
   [x] Show order status
   [x] Show store name
   [x] Show order total
   [x] Show created date
   [x] Add pagination
   [x] Add loading, empty and error states

6. Store backup
   [x] Create server-side backup endpoint
   [x] Export store information
   [x] Export store members/users
   [x] Export products
   [x] Export templates
   [x] Export customers associated with the store
   [x] Export orders
   [x] Export order items
   [x] Export order messages
   [x] Export payment proofs metadata
   [x] Export order status history
   [x] Export backup as downloadable ZIP/JSON package
   [x] Do not expose private storage files directly
   [x] Generate signed URLs where required
   [x] Record backup action in audit log
   [x] Show backup progress/loading state
   [x] Require confirmation before backup generation

7. Delete all store orders
   [x] Create DELETE /api/superadmin/stores/:id/orders
   [x] Delete order-related records safely
   [x] Handle order items
   [x] Handle order messages
   [x] Handle payment proofs
   [x] Handle order status history
   [x] Preserve referential integrity
   [x] Do not delete products/customers/store itself
   [x] Require explicit confirmation in UI
   [x] Require typed confirmation such as DELETE ORDERS
   [x] Record action in superadmin audit log
   [x] Return updated order count

8. Delete store
   [x] Create DELETE /api/superadmin/stores/:id
   [x] Require explicit confirmation
   [x] Require typed confirmation such as DELETE STORE <slug>
   [x] Delete dependent store data safely
   [x] Delete store members
   [x] Delete products
   [x] Delete templates
   [x] Delete orders and all dependent records
   [x] Delete/cleanup store storage files where applicable
   [x] Prevent accidental deletion of another store
   [x] Record deletion in audit log
   [x] Return success/failure result

9. Superadmin API
   [x] GET /api/superadmin/dashboard
   [x] GET /api/superadmin/stores
   [x] GET /api/superadmin/stores/:id
   [x] GET /api/superadmin/stores/:id/orders
   [x] GET /api/superadmin/stores/:id/users
   [x] GET /api/superadmin/orders
   [x] POST /api/superadmin/stores/:id/backup
   [x] DELETE /api/superadmin/stores/:id/orders
   [x] DELETE /api/superadmin/stores/:id
   [x] Add Zod validation to all relevant inputs
   [x] Add pagination limits
   [x] Add server-side authorization to every endpoint

10. Security & audit
   [x] Superadmin-only middleware on every superadmin route
   [x] Never trust frontend role checks
   [x] Log backup operations
   [x] Log delete-all-orders operations
   [x] Log store deletion
   [ ] Log failed destructive-action attempts where appropriate — not done; only successful actions are audited (store_viewed/backup_created/orders_deleted/store_deleted). 403s from requireSuperadmin are not currently written to superadmin_audit_logs.
   [x] Store actor user ID, action, target store ID, timestamp
   [x] Add rate limiting to destructive endpoints
   [x] Use database transactions for destructive operations
   [x] Ensure backups cannot be generated for unauthorized stores

11. UI confirmation system
   [x] Create reusable ConfirmationModal
   [x] Normal actions use simple confirmation
   [x] Destructive actions use strong warning
   [x] Delete Orders requires typed confirmation
   [x] Delete Store requires typed confirmation
   [x] Disable action button while request is processing
   [x] Show success/error result after action
   [x] Refresh affected dashboard/store/order counts

12. Testing
   [x] Test superadmin authorization
   [x] Test non-superadmin access is rejected
   [x] Test store filtering
   [x] Test order filtering
   [x] Test delete-all-orders transaction
   [x] Test store deletion transaction
   [x] Test backup generation
   [x] Test audit logging
   [x] Test confirmation-required destructive flows
   [ ] Add e2e flow:
       login → dashboard → stores → store detail →
       backup → delete all orders → verify zero orders
       — not done; apps/api has 15 route-level tests covering the above
       (authz, scoping, filters, confirmation gating, audit calls) with
       Supabase mocked, but no Playwright e2e spec was added for this flow.




Recommended superadmin routes
  /superadmin
  /superadmin/dashboard
  /superadmin/stores
  /superadmin/stores/:id
  /superadmin/orders



Api
  /api/superadmin/dashboard

  /api/superadmin/stores
  /api/superadmin/stores/:id
  /api/superadmin/stores/:id/orders
  /api/superadmin/stores/:id/users

  /api/superadmin/orders

  /api/superadmin/stores/:id/backup
  /api/superadmin/stores/:id/orders
  /api/superadmin/stores/:id


  Download Backup
         ↓
  Confirmation:
  "Create a complete backup of this store before continuing?"

  [Cancel] [Create Backup]


  Delete All Orders
         ↓
  Confirmation:
  "This will permanently delete all orders, messages,
  payment proofs and order history for this store."

  Type: DELETE ORDERS

  [Cancel] [Delete Orders]


  Delete Store
         ↓
  Confirmation:
  "This permanently deletes the store and its associated data."

  Type: DELETE STORE abc-fashion

  [Cancel] [Delete Store]



  superadmin_audit_logs
- id
- actor_user_id
- action
- target_type
- target_id
- seller_id nullable
- metadata jsonb
- created_at


Actions could include:
  store_viewed
  backup_created
  orders_deleted
  store_deleted



  store-backup-abc-fashion-2026-09-22.zip

  store.json
  members.json
  products.json
  templates.json
  customers.json
  orders.json
  order_items.json
  order_messages.json
  payment_proofs.json
  order_status_history.json
