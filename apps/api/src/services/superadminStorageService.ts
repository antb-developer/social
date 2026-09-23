import { supabaseAdmin } from "../config/supabase";

const PRODUCT_IMAGE_BUCKET = "product-images";
const PAYMENT_PROOF_BUCKET = "payment-proofs";

// Both buckets are flat under their top-level folder (product-images/<seller_id>/...,
// payment-proofs/<order_id>/...), so a single list() call finds everything to remove.
async function removeAllUnderPrefix(bucket: string, prefix: string) {
  const { data, error } = await supabaseAdmin.storage.from(bucket).list(prefix);
  if (error) throw error;
  if (!data || data.length === 0) return;

  const paths = data.map((entry) => `${prefix}/${entry.name}`);
  const { error: removeError } = await supabaseAdmin.storage.from(bucket).remove(paths);
  if (removeError) throw removeError;
}

/**
 * Deleting the seller row cascades every DB row away, but Storage objects
 * aren't part of that cascade — they have to be cleaned up separately, after
 * the DB delete has already committed. orderIds must be collected from the
 * DB *before* that delete runs, since the payment-proofs bucket is keyed by
 * order id and the orders will be gone by the time this runs.
 */
export async function purgeStoreStorage(sellerId: string, orderIds: string[]) {
  await removeAllUnderPrefix(PRODUCT_IMAGE_BUCKET, sellerId);
  await Promise.all(orderIds.map((orderId) => removeAllUnderPrefix(PAYMENT_PROOF_BUCKET, orderId)));
}
