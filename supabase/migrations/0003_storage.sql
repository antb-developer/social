-- Storage buckets for product images (public) and payment proofs (private).
-- Object paths:
--   product-images/<seller_id>/<filename>
--   payment-proofs/<order_id>/<filename>

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- product-images: publicly readable; only members of the owning seller can
-- write/delete within their own <seller_id>/ folder.

create policy product_images_public_read on storage.objects
  for select
  using (bucket_id = 'product-images');

create policy product_images_seller_write on storage.objects
  for insert
  with check (
    bucket_id = 'product-images'
    and is_seller_member(((storage.foldername(name))[1])::uuid)
  );

create policy product_images_seller_update on storage.objects
  for update
  using (
    bucket_id = 'product-images'
    and is_seller_member(((storage.foldername(name))[1])::uuid)
  );

create policy product_images_seller_delete on storage.objects
  for delete
  using (
    bucket_id = 'product-images'
    and is_seller_member(((storage.foldername(name))[1])::uuid)
  );

-- payment-proofs: private. The customer who owns the order can upload into
-- its <order_id>/ folder; only that order's participants (the same customer
-- or a member of the seller) can read — always via a signed URL, since the
-- bucket itself is private.

create policy payment_proofs_customer_insert on storage.objects
  for insert
  with check (
    bucket_id = 'payment-proofs'
    and exists (
      select 1 from orders o
      where o.id = ((storage.foldername(name))[1])::uuid
        and o.customer_id = auth.uid()
    )
  );

create policy payment_proofs_participant_read on storage.objects
  for select
  using (
    bucket_id = 'payment-proofs'
    and is_order_participant(((storage.foldername(name))[1])::uuid)
  );
