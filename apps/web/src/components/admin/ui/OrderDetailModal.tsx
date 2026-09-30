import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "../../../lib/apiClient";
import { Badge } from "./Badge";
import { Modal } from "./Modal";

type OrderDetail = {
  id: string;
  order_no: string;
  status: string;
  total_paise: number;
  proof_uploaded: boolean;
  created_at: string;
  updated_at: string;
  seller: { id: string; name: string; slug: string } | null;
  customer: { id: string; name: string | null; phone: string } | null;
  items: { id: string; name_snapshot: string; price_snapshot_paise: number; qty: number }[];
};

const STATUS_BADGE: Record<string, "info" | "warning" | "success" | "primary" | "error" | "light"> = {
  new: "info",
  pending_payment: "warning",
  paid: "success",
  shipped: "primary",
  delivered: "success",
  cancelled: "error",
};

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function OrderDetailModal({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const orderQuery = useQuery({
    queryKey: ["superadmin-order-detail", orderId],
    queryFn: () => apiFetch<OrderDetail>(`/api/superadmin/orders/${orderId}`),
    enabled: Boolean(orderId),
  });

  const order = orderQuery.data;

  return (
    <Modal isOpen={Boolean(orderId)} onClose={onClose} className="max-w-lg p-6">
      {orderQuery.isLoading && <p className="text-sm text-gray-500">Loading order...</p>}
      {orderQuery.isError && <p className="text-sm text-error-600">Couldn't load this order.</p>}
      {order && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-800">{order.order_no}</h3>
            <Badge size="sm" color={STATUS_BADGE[order.status] ?? "light"}>
              {order.status.replace("_", " ")}
            </Badge>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-gray-500">Store</dt>
              <dd className="text-gray-800">
                {order.seller ? (
                  <Link to={`/superadmin/stores/${order.seller.id}`} className="hover:underline" onClick={onClose}>
                    {order.seller.name}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Customer</dt>
              <dd className="text-gray-800">
                {order.customer ? (
                  <Link
                    to={`/superadmin/customers/${order.customer.id}`}
                    className="hover:underline"
                    onClick={onClose}
                  >
                    {order.customer.name ?? order.customer.phone}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Total</dt>
              <dd className="font-medium text-gray-800">{formatRupees(order.total_paise)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Placed</dt>
              <dd className="text-gray-800">{new Date(order.created_at).toLocaleString()}</dd>
            </div>
          </dl>

          <div>
            <p className="mb-2 text-xs font-medium text-gray-500">Items</p>
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
              {order.items.length === 0 && <li className="p-3 text-sm text-gray-500">No items.</li>}
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between p-3 text-sm">
                  <span className="text-gray-700">
                    {item.name_snapshot} <span className="text-gray-400">× {item.qty}</span>
                  </span>
                  <span className="font-medium text-gray-800">
                    {formatRupees(item.price_snapshot_paise * item.qty)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Modal>
  );
}
