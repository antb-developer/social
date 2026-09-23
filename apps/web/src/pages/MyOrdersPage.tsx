import { useState } from "react";
import { Link } from "react-router-dom";
import { Breadcrumb } from "../components/admin/Breadcrumb";
import { Badge } from "../components/admin/ui/Badge";
import { ComponentCard } from "../components/admin/ui/ComponentCard";
import { useMyOrders } from "../hooks/useMyOrders";
import { formatRupees } from "../lib/money";
import { orderStatusColor, pill } from "../lib/ui";

const TABS: Array<{ label: string; value: string | null }> = [
  { label: "All", value: null },
  { label: "New", value: "new" },
  { label: "Pending Payment", value: "pending_payment" },
  { label: "Paid", value: "paid" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

// Rendered inside CustomerLayout, which already guarantees a signed-in user.
export function MyOrdersPage() {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const ordersQuery = useMyOrders(activeTab);

  return (
    <div>
      <Breadcrumb
        title="My orders"
        description="Every order you've placed, across all stores."
        homeTo="/account"
        homeLabel="Account"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={pill(activeTab === tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ComponentCard className="mt-4" bodyClassName="divide-y divide-gray-100">
        {ordersQuery.isLoading && <p className="p-5 text-sm text-gray-500">Loading orders...</p>}
        {ordersQuery.isError && <p className="p-5 text-sm text-error-600">Could not load your orders.</p>}
        {ordersQuery.data?.length === 0 && <p className="p-5 text-sm text-gray-500">No orders here yet.</p>}
        {ordersQuery.data?.map((order) => (
          <Link
            key={order.id}
            to={`/o/${order.id}`}
            className="flex items-center justify-between gap-3 px-5 py-4 text-sm transition-colors hover:bg-gray-50"
          >
            <div className="min-w-0">
              <p className="font-medium text-gray-900">
                {order.order_no}
                {order.seller && <span className="font-normal text-gray-500"> &middot; {order.seller.name}</span>}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <Badge size="sm" color={orderStatusColor(order.status)}>
                  {order.status.replace("_", " ")}
                </Badge>
                <span className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <span className="shrink-0 font-medium text-gray-900">{formatRupees(order.total_paise)}</span>
          </Link>
        ))}
      </ComponentCard>
    </div>
  );
}
