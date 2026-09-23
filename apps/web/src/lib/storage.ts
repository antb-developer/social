import { apiFetch } from "./apiClient";

// Product images, payment proofs, and signed proof URLs all go through the API
// (service role) rather than straight to Supabase Storage from the browser,
// because the browser only ever holds the dev-OTP bearer token, not a real
// Supabase Auth session — a direct call would fail the storage RLS policies'
// auth.uid() checks.

/** Submits a payment proof (image + UTR) for an order; the API does the storage upload. */
export async function submitPaymentProof(orderId: string, file: File, utr: string): Promise<void> {
  const form = new FormData();
  form.append("image", file);
  form.append("utr", utr);
  await apiFetch(`/api/orders/${orderId}/proof`, { method: "POST", body: form });
}

/** Fetches a short-lived signed URL for a seller to view a pending payment proof. */
export async function getSignedProofUrl(proofId: string): Promise<string> {
  const { url } = await apiFetch<{ url: string }>(`/api/seller/proofs/${proofId}/signed-url`);
  return url;
}

/** Uploads a product image via the API and returns its public URL. */
export async function uploadProductImage(file: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("image", file, filename);
  const { url } = await apiFetch<{ url: string }>("/api/seller/products/images", {
    method: "POST",
    body: form,
  });
  return url;
}
