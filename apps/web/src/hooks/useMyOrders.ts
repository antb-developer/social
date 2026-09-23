import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiClient";

export type CustomerOrder = {
  id: string;
  order_no: string;
  status: string;
  total_paise: number;
  created_at: string;
  seller: { id: string; name: string; slug: string; logo_url: string | null } | null;
};

/** The signed-in customer's orders, newest first; pass a status to filter. */
export function useMyOrders(status: string | null) {
  return useQuery({
    queryKey: ["my-orders", status],
    queryFn: () => apiFetch<CustomerOrder[]>(`/api/me/orders${status ? `?status=${status}` : ""}`),
  });
}
