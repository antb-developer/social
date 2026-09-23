import { supabaseAdmin } from "../config/supabase";

export async function createPaymentProof(input: {
  orderId: string;
  imageUrl: string;
  utr: string;
  amountPaise: number;
}) {
  const { data, error } = await supabaseAdmin
    .from("payment_proofs")
    .insert({
      order_id: input.orderId,
      image_url: input.imageUrl,
      utr: input.utr,
      amount_paise: input.amountPaise,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function findProofsByOrder(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from("payment_proofs")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function findProofById(id: string) {
  const { data, error } = await supabaseAdmin.from("payment_proofs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProofReview(id: string, review: "approved" | "rejected", reviewedBy: string) {
  const { error } = await supabaseAdmin
    .from("payment_proofs")
    .update({ review, reviewed_by: reviewedBy })
    .eq("id", id);
  if (error) throw error;
}
