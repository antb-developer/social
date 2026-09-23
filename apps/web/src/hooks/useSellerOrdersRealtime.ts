import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

/** Live-updates the seller's order board when any of their orders change. */
export function useSellerOrdersRealtime(sellerId: string | undefined, onChange: () => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!sellerId) return;

    const channel = supabase
      .channel(`seller-orders-${sellerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `seller_id=eq.${sellerId}` },
        () => onChangeRef.current()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sellerId]);
}
