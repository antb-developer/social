import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Breadcrumb } from "../../components/admin/Breadcrumb";
import { Badge } from "../../components/admin/ui/Badge";
import { ComponentCard } from "../../components/admin/ui/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/admin/ui/Table";
import { useMe } from "../../hooks/useMe";
import { useMyOrders, type CustomerOrder } from "../../hooks/useMyOrders";
import { formatRupees } from "../../lib/money";
import { orderStatusColor } from "../../lib/ui";

const RECENT_ORDERS = 5;
const RECENT_STORES = 6;

type ConnectedStore = NonNullable<CustomerOrder["seller"]> & { orderCount: number; lastOrderAt: string };

/** Stores the customer has ordered from, most recently used first. */
function connectedStores(orders: CustomerOrder[]): ConnectedStore[] {
  const byId = new Map<string, ConnectedStore>();
  for (const order of orders) {
    if (!order.seller) continue;
    const existing = byId.get(order.seller.id);
    if (existing) {
      existing.orderCount += 1;
    } else {
      byId.set(order.seller.id, { ...order.seller, orderCount: 1, lastOrderAt: order.created_at });
    }
  }
  return [...byId.values()].slice(0, RECENT_STORES);
}

const HEAD = "px-5 py-3 text-start text-theme-xs font-medium text-gray-500";

export function AccountHomePage() {
  const meQuery = useMe();
  const ordersQuery = useMyOrders(null);

  // The API returns orders newest first.
  const recentOrders = (ordersQuery.data ?? []).slice(0, RECENT_ORDERS);
  const stores = useMemo(() => connectedStores(ordersQuery.data ?? []), [ordersQuery.data]);
  const firstName = meQuery.data?.name?.split(" ")[0];

  return (
    <div>
      <Breadcrumb
        title={firstName ? `Welcome back, ${firstName}` : "Overview"}
        description="Your latest orders and the stores you've ordered from."
        homeTo="/account"
        homeLabel="Account"
      />

      <ComponentCard
        title="Recent orders"
        bodyClassName="p-0"
        headerAction={
          <Link to="/my-orders" className="text-sm font-medium text-brand-500 hover:text-brand-600">
            View all
          </Link>
        }
      >
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100">
              <TableRow>
                <TableCell isHeader className={HEAD}>
                  Order
                </TableCell>
                <TableCell isHeader className={`${HEAD} hidden sm:table-cell`}>
                  Store
                </TableCell>
                <TableCell isHeader className={HEAD}>
                  Status
                </TableCell>
                <TableCell isHeader className={HEAD}>
                  Total
                </TableCell>
                <TableCell isHeader className={`${HEAD} hidden md:table-cell`}>
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
                  <TableCell className="px-5 py-5 text-sm text-error-600">Could not load your orders.</TableCell>
                </TableRow>
              )}
              {ordersQuery.isSuccess && recentOrders.length === 0 && (
                <TableRow>
                  <TableCell className="px-5 py-5 text-sm text-gray-500">
                    No orders yet. Open a store link to place your first one.
                  </TableCell>
                </TableRow>
              )}
              {recentOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-gray-50">
                  <TableCell className="px-5 py-4 text-start text-theme-sm">
                    <Link to={`/o/${order.id}`} className="whitespace-nowrap font-medium text-gray-800">
                      {order.order_no}
                    </Link>
                    <span className="block text-theme-xs text-gray-500 sm:hidden">{order.seller?.name}</span>
                  </TableCell>
                  <TableCell className="hidden px-5 py-4 text-start text-theme-sm text-gray-600 sm:table-cell">
                    {order.seller?.name ?? "-"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-start">
                    <Badge size="sm" color={orderStatusColor(order.status)}>
                      {order.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-5 py-4 text-start text-theme-sm text-gray-600">
                    {formatRupees(order.total_paise)}
                  </TableCell>
                  <TableCell className="hidden px-5 py-4 text-start text-theme-sm text-gray-500 md:table-cell">
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ComponentCard>

      <ComponentCard title="Your stores" desc="Stores you've ordered from, most recent first." className="mt-6">
        {ordersQuery.isLoading && <p className="text-sm text-gray-500">Loading stores...</p>}
        {ordersQuery.isError && <p className="text-sm text-error-600">Could not load your stores.</p>}
        {ordersQuery.isSuccess && stores.length === 0 && (
          <p className="text-sm text-gray-500">Stores you order from will show up here.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {stores.map((store) => (
            <Link
              key={store.id}
              to={`/s/${store.slug}`}
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-3.5 transition-colors hover:bg-gray-50"
            >
              {store.logo_url ? (
                <img src={store.logo_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-500">
                  {store.name.trim().slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-gray-800">{store.name}</span>
                <span className="block text-xs text-gray-500">
                  {store.orderCount} {store.orderCount === 1 ? "order" : "orders"} &middot; last{" "}
                  {new Date(store.lastOrderAt).toLocaleDateString()}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </ComponentCard>
    </div>
  );
}
