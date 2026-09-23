import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Breadcrumb } from "../../components/admin/Breadcrumb";
import { SearchIcon } from "../../components/admin/icons";
import { Badge } from "../../components/admin/ui/Badge";
import { ComponentCard } from "../../components/admin/ui/ComponentCard";
import { Input } from "../../components/admin/ui/Input";
import { Pagination } from "../../components/admin/ui/Pagination";
import { Select } from "../../components/admin/ui/Select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/admin/ui/Table";
import { apiFetch } from "../../lib/apiClient";

type Order = {
  id: string;
  order_no: string;
  status: string;
  total_paise: number;
  created_at: string;
  seller: { id: string; name: string; slug: string } | null;
};

type OrdersResponse = { data: Order[]; total: number; page: number; pageSize: number };
type Store = { id: string; name: string; slug: string };
type StoresResponse = { data: Store[]; total: number };

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "pending_payment", label: "Pending payment" },
  { value: "paid", label: "Paid" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

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

export function SuperadminOrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const storesQuery = useQuery({
    queryKey: ["superadmin-orders-store-filter"],
    queryFn: () => apiFetch<StoresResponse>("/api/superadmin/stores?pageSize=100"),
  });
  const storeOptions = [
    { value: "", label: "All stores" },
    ...(storesQuery.data?.data.map((s) => ({ value: s.id, label: s.name })) ?? []),
  ];

  const ordersQuery = useQuery({
    queryKey: ["superadmin-orders", search, status, sellerId, from, to, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (status) params.set("status", status);
      if (sellerId) params.set("sellerId", sellerId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      return apiFetch<OrdersResponse>(`/api/superadmin/orders?${params.toString()}`);
    },
  });

  const orders = ordersQuery.data?.data ?? [];

  function resetToFirstPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  return (
    <div>
      <Breadcrumb
        title="Orders"
        description="Every order across every store."
        homeTo="/superadmin/dashboard"
        homeLabel="Superadmin"
      />

      <ComponentCard bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:p-5">
          <div className="relative flex-1 sm:min-w-[220px]">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search order no, customer name or phone"
              value={search}
              onChange={(e) => resetToFirstPage(setSearch)(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            options={storeOptions}
            value={sellerId}
            onChange={(e) => resetToFirstPage(setSellerId)(e.target.value)}
            className="sm:w-48"
          />
          <Select
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => resetToFirstPage(setStatus)(e.target.value)}
            className="sm:w-48"
          />
          <Input type="date" value={from} onChange={(e) => resetToFirstPage(setFrom)(e.target.value)} className="sm:w-44" />
          <Input type="date" value={to} onChange={(e) => resetToFirstPage(setTo)(e.target.value)} className="sm:w-44" />
        </div>

        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                  Order
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                  Store
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
              {ordersQuery.isError && (
                <TableRow>
                  <TableCell className="px-5 py-5 text-sm text-error-600">Couldn't load orders.</TableCell>
                </TableRow>
              )}
              {!ordersQuery.isLoading && !ordersQuery.isError && orders.length === 0 && (
                <TableRow>
                  <TableCell className="px-5 py-5 text-sm text-gray-500">No orders found.</TableCell>
                </TableRow>
              )}
              {orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-gray-50">
                  <TableCell className="px-5 py-4 text-start text-theme-sm font-medium text-gray-800">
                    {order.order_no}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600">
                    {order.seller?.name ?? "—"}
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

        {ordersQuery.data && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={ordersQuery.data.total} onPageChange={setPage} />
        )}
      </ComponentCard>
    </div>
  );
}
