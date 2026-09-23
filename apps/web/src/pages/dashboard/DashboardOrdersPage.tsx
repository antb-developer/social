import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Breadcrumb } from "../../components/admin/Breadcrumb";
import { Badge } from "../../components/admin/ui/Badge";
import { ComponentCard } from "../../components/admin/ui/ComponentCard";
import { Input } from "../../components/admin/ui/Input";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/admin/ui/Table";
import { SearchIcon } from "../../components/admin/icons";
import { EnableNotificationsButton } from "../../components/EnableNotificationsButton";
import { useSellerOrdersRealtime } from "../../hooks/useSellerOrdersRealtime";
import { apiFetch } from "../../lib/apiClient";

type Order = {
  id: string;
  order_no: string;
  status: string;
  total_paise: number;
  proof_uploaded: boolean;
  created_at: string;
};

type Seller = { id: string };

const TABS = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Pending Payment", value: "pending_payment" },
  { label: "Paid", value: "paid" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
] as const;

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

export function DashboardOrdersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("new");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const sellerQuery = useQuery({
    queryKey: ["seller-settings"],
    queryFn: () => apiFetch<Seller>("/api/seller/settings"),
  });

  const ordersQueryKey = ["seller-orders", search, from, to];
  const ordersQuery = useQuery({
    queryKey: ordersQueryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const qs = params.toString();
      return apiFetch<Order[]>(`/api/seller/orders${qs ? `?${qs}` : ""}`);
    },
  });

  useSellerOrdersRealtime(sellerQuery.data?.id, () => {
    queryClient.invalidateQueries({ queryKey: ordersQueryKey });
  });

  const orders = ordersQuery.data ?? [];

  const counts = useMemo(() => {
    const tally: Record<string, number> = { all: orders.length };
    for (const order of orders) {
      tally[order.status] = (tally[order.status] ?? 0) + 1;
    }
    return tally;
  }, [orders]);

  const visibleOrders = useMemo(() => {
    if (activeTab === "all") {
      return [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    const filtered = orders.filter((o) => o.status === activeTab);
    if (activeTab === "pending_payment") {
      return [...filtered].sort((a, b) => {
        if (a.proof_uploaded !== b.proof_uploaded) return a.proof_uploaded ? -1 : 1;
        return b.created_at.localeCompare(a.created_at);
      });
    }
    return filtered;
  }, [orders, activeTab]);

  return (
    <div>
      <Breadcrumb
        title="Orders"
        description="Track and action every order from your store."
        action={<EnableNotificationsButton />}
      />

      <ComponentCard bodyClassName="p-0">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search order no, phone or name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="sm:w-44" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="sm:w-44" />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === tab.value
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab.label} ({counts[tab.value] ?? 0})
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                  Order
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                  Status
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                  Total
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                  Placed
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100">
              {ordersQuery.isLoading && (
                <TableRow>
                  <TableCell className="px-5 py-5 text-sm text-gray-500">Loading orders...</TableCell>
                </TableRow>
              )}
              {!ordersQuery.isLoading && visibleOrders.length === 0 && (
                <TableRow>
                  <TableCell className="px-5 py-5 text-sm text-gray-500">No orders in this tab.</TableCell>
                </TableRow>
              )}
              {visibleOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-gray-50">
                  <TableCell className="px-5 py-4 text-start">
                    <Link to={`/dashboard/orders/${order.id}`} className="block">
                      <span className="text-theme-sm font-medium text-gray-800">{order.order_no}</span>
                      {order.status === "pending_payment" && order.proof_uploaded && (
                        <span className="mt-1.5 block w-fit rounded-full bg-warning-50 px-2.5 py-1 text-xs font-medium text-warning-700">
                          Proof uploaded
                        </span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-start">
                    <Badge size="sm" color={STATUS_BADGE[order.status] ?? "light"}>
                      {order.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-start text-theme-sm font-medium text-gray-800">
                    {formatRupees(order.total_paise)}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ComponentCard>
    </div>
  );
}
