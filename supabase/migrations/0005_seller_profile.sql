-- Public store profile shown on the storefront (/s/:slug): a short "about"
-- blurb and a free-text address. Both are optional and edited by the seller
-- in dashboard settings. Idempotent so it is safe to run by hand in the
-- Supabase SQL editor and again via `supabase db push`.
alter table sellers add column if not exists description text;
alter table sellers add column if not exists address text;
notify pgrst, 'reload schema';
