import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Breadcrumb } from "../../components/admin/Breadcrumb";
import { Badge } from "../../components/admin/ui/Badge";
import { ComponentCard } from "../../components/admin/ui/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/admin/ui/Table";
import { apiFetch } from "../../lib/apiClient";

type Order = {
  id: string;
  order_no: string;
  status: string;
  total_paise: number;
  proof_uploaded: boolean;
  created_at: string;
};

type Product = { id: string; in_stock: boolean };

const STATUS_BADGE: Record<string, { color: "info" | "warning" | "success" | "primary" | "error" | "light" }> = {
  new: { color: "info" },
  pending_payment: { color: "warning" },
  paid: { color: "success" },
  shipped: { color: "primary" },
  delivered: { color: "success" },
  cancelled: { color: "error" },
};

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function DashboardHomePage() {
  const ordersQuery = useQuery({
    queryKey: ["seller-orders", "", "", ""],
    queryFn: () => apiFetch<Order[]>("/api/seller/orders"),
  });

  const productsQuery = useQuery({
    queryKey: ["seller-products"],
    queryFn: () => apiFetch<Product[]>("/api/seller/products"),
  });

  const orders = ordersQuery.data ?? [];
  const products = productsQuery.data ?? [];

  const stats = useMemo(() => {
    const revenue = orders
      .filter((o) => ["paid", "shipped", "delivered"].includes(o.status))
      .reduce((sum, o) => sum + o.total_paise, 0);
    const pendingPayment = orders.filter((o) => o.status === "pending_payment").length;
    return {
      totalOrders: orders.length,
      pendingPayment,
      revenue,
      inStockProducts: products.filter((p) => p.in_stock).length,
    };
  }, [orders, products]);

  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8),
    [orders]
  );

  const cards = [
    { label: "Total orders", value: stats.totalOrders.toString() },
    { label: "Pending payment", value: stats.pendingPayment.toString() },
    { label: "Revenue collected", value: formatRupees(stats.revenue) },
    { label: "Products in stock", value: stats.inStockProducts.toString() },
  ];

  return (
    <div>
      <Breadcrumb title="Dashboard" description="An overview of your store's orders and revenue." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
            <span className="text-sm text-gray-500">{card.label}</span>
            <h4 className="mt-2 text-title-sm font-bold text-gray-800">{card.value}</h4>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <ComponentCard title="Recent orders" bodyClassName="p-0">
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
                {!ordersQuery.isLoading && recentOrders.length === 0 && (
                  <TableRow>
                    <TableCell className="px-5 py-5 text-sm text-gray-500">No orders yet.</TableCell>
                  </TableRow>
                )}
                {recentOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-gray-50">
                    <TableCell className="px-5 py-4 text-start text-theme-sm">
                      <Link to={`/dashboard/orders/${order.id}`} className="font-medium text-gray-800">
                        {order.order_no}
                      </Link>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      <Badge size="sm" color={STATUS_BADGE[order.status]?.color ?? "light"}>
                        {order.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600">
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
    </div>
  );
}
