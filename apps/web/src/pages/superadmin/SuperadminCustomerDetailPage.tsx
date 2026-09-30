import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Breadcrumb } from "../../components/admin/Breadcrumb";
import { Badge } from "../../components/admin/ui/Badge";
import { BulkActionsBar } from "../../components/admin/ui/BulkActionsBar";
import { Button } from "../../components/admin/ui/Button";
import { ComponentCard } from "../../components/admin/ui/ComponentCard";
import { ConfirmationModal } from "../../components/admin/ui/ConfirmationModal";
import { OrderDetailModal } from "../../components/admin/ui/OrderDetailModal";
import { Pagination } from "../../components/admin/ui/Pagination";
import { RowActions } from "../../components/admin/ui/RowActions";
import { SelectionCheckbox } from "../../components/admin/ui/SelectionCheckbox";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/admin/ui/Table";
import { useModal } from "../../hooks/useModal";
import { useRowSelection } from "../../hooks/useRowSelection";
import { apiFetch, ApiError } from "../../lib/apiClient";

type Customer = { id: string; name: string | null; phone: string; created_at: string };

type Order = {
  id: string;
  order_no: string;
  status: string;
  total_paise: number;
  created_at: string;
  seller: { id: string; name: string; slug: string } | null;
};
type OrdersResponse = { data: Order[]; total: number };

const PAGE_SIZE = 10;

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

export function SuperadminCustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [ordersPage, setOrdersPage] = useState(1);
  const [viewOrderId, setViewOrderId] = useState<string | null>(null);

  const deleteOrdersModal = useModal();
  const deleteCustomerModal = useModal();
  const rowDeleteModal = useModal();
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const customerQuery = useQuery({
    queryKey: ["superadmin-customer", id],
    queryFn: () => apiFetch<Customer>(`/api/superadmin/customers/${id}`),
    enabled: Boolean(id),
  });

  const ordersQuery = useQuery({
    queryKey: ["superadmin-customer-orders", id, ordersPage],
    queryFn: () =>
      apiFetch<OrdersResponse>(`/api/superadmin/customers/${id}/orders?page=${ordersPage}&pageSize=${PAGE_SIZE}`),
    enabled: Boolean(id),
  });

  const orders = ordersQuery.data?.data ?? [];
  const selection = useRowSelection(orders.map((o) => o.id));

  useEffect(() => {
    selection.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersPage]);

  const deleteOrdersMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ deletedCount: number }>(`/api/superadmin/customers/${id}/orders`, {
        method: "DELETE",
        body: JSON.stringify({ confirm: "DELETE ORDERS" }),
      }),
    onSuccess: () => {
      deleteOrdersModal.closeModal();
      setActionError(null);
      setOrdersPage(1);
      selection.clear();
      queryClient.invalidateQueries({ queryKey: ["superadmin-customer-orders", id] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-customers"] });
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "Couldn't delete orders."),
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/superadmin/customers/${id}`, {
        method: "DELETE",
        body: JSON.stringify({ confirm: `DELETE CUSTOMER ${customerQuery.data?.phone}` }),
      }),
    onSuccess: () => {
      deleteCustomerModal.closeModal();
      queryClient.invalidateQueries({ queryKey: ["superadmin-customers"] });
      navigate("/superadmin/customers");
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "Couldn't delete the customer."),
  });

  const deleteOrderRowsMutation = useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch<{ deletedCount: number }>("/api/superadmin/orders", {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      }),
    onSuccess: () => {
      rowDeleteModal.closeModal();
      setPendingDeleteIds(null);
      selection.clear();
      queryClient.invalidateQueries({ queryKey: ["superadmin-customer-orders", id] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-customers"] });
    },
  });

  function requestRowDelete(ids: string[]) {
    setPendingDeleteIds(ids);
    rowDeleteModal.openModal();
  }

  if (customerQuery.isLoading) {
    return <p className="p-4 text-sm text-gray-500">Loading customer...</p>;
  }
  if (customerQuery.isError || !customerQuery.data) {
    return <p className="p-4 text-sm text-error-600">Couldn't load this customer.</p>;
  }

  const customer = customerQuery.data;

  return (
    <div>
      <Breadcrumb
        title={customer.name ?? "Unnamed customer"}
        description={customer.phone}
        homeTo="/superadmin/dashboard"
        homeLabel="Superadmin"
      />

      <div className="space-y-6">
        <ComponentCard title="Customer details">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-gray-500">Name</dt>
              <dd className="text-sm text-gray-800">{customer.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Phone</dt>
              <dd className="text-sm text-gray-800">{customer.phone}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Joined</dt>
              <dd className="text-sm text-gray-800">{new Date(customer.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        </ComponentCard>

        <ComponentCard title="Orders" bodyClassName="p-0">
          <BulkActionsBar count={selection.count} itemLabel="order" onDelete={() => requestRowDelete(selection.selectedIds)} />
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100">
                <TableRow>
                  <TableCell isHeader className="w-10 px-5 py-3">
                    <SelectionCheckbox
                      checked={selection.allSelected}
                      indeterminate={selection.isIndeterminate}
                      onChange={selection.toggleAll}
                      ariaLabel="Select all orders"
                    />
                  </TableCell>
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
                  <TableCell isHeader className="px-5 py-3 text-end text-theme-xs font-medium text-gray-500">
                    Actions
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
                    <TableCell className="px-5 py-5 text-sm text-gray-500">No orders for this customer.</TableCell>
                  </TableRow>
                )}
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="px-5 py-4">
                      <SelectionCheckbox
                        checked={selection.selected.has(order.id)}
                        onChange={() => selection.toggle(order.id)}
                        ariaLabel={`Select ${order.order_no}`}
                      />
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm font-medium text-gray-800">
                      {order.order_no}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600">
                      {order.seller ? (
                        <Link to={`/superadmin/stores/${order.seller.id}`} className="hover:underline">
                          {order.seller.name}
                        </Link>
                      ) : (
                        "—"
                      )}
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
                    <TableCell className="px-5 py-4 text-end">
                      <RowActions onView={() => setViewOrderId(order.id)} onDelete={() => requestRowDelete([order.id])} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {ordersQuery.data && (
            <Pagination
              page={ordersPage}
              pageSize={PAGE_SIZE}
              total={ordersQuery.data.total}
              onPageChange={setOrdersPage}
            />
          )}
        </ComponentCard>

        <ComponentCard title="Danger zone" desc="These actions require typed confirmation and can't be undone.">
          <div className="flex flex-wrap gap-3">
            <Button variant="danger" onClick={deleteOrdersModal.openModal}>
              Delete all orders
            </Button>
            <Button variant="danger" onClick={deleteCustomerModal.openModal}>
              Delete customer
            </Button>
          </div>
        </ComponentCard>
      </div>

      <OrderDetailModal orderId={viewOrderId} onClose={() => setViewOrderId(null)} />

      <ConfirmationModal
        isOpen={deleteOrdersModal.isOpen}
        onClose={deleteOrdersModal.closeModal}
        onConfirm={() => deleteOrdersMutation.mutate()}
        title="Delete all orders"
        description="This will permanently delete all of this customer's orders across every store, including messages, payment proofs and order history. The customer profile is not affected."
        variant="destructive"
        requireTypedConfirmation="DELETE ORDERS"
        confirmLabel="Delete orders"
        loading={deleteOrdersMutation.isPending}
        error={actionError}
      />

      <ConfirmationModal
        isOpen={deleteCustomerModal.isOpen}
        onClose={deleteCustomerModal.closeModal}
        onConfirm={() => deleteCustomerMutation.mutate()}
        title="Delete customer"
        description="This permanently deletes the customer profile and all of their orders, messages and payment proofs across every store. Their login is kept, so they can sign in again as a new customer. This cannot be undone."
        variant="destructive"
        requireTypedConfirmation={`DELETE CUSTOMER ${customer.phone}`}
        confirmLabel="Delete customer"
        loading={deleteCustomerMutation.isPending}
        error={actionError}
      />

      <ConfirmationModal
        isOpen={rowDeleteModal.isOpen}
        onClose={() => {
          rowDeleteModal.closeModal();
          setPendingDeleteIds(null);
        }}
        onConfirm={() => pendingDeleteIds && deleteOrderRowsMutation.mutate(pendingDeleteIds)}
        title={pendingDeleteIds && pendingDeleteIds.length > 1 ? "Delete orders" : "Delete order"}
        description={`This permanently deletes ${
          pendingDeleteIds && pendingDeleteIds.length > 1 ? `${pendingDeleteIds.length} orders` : "this order"
        }, including messages, payment proofs and status history. This cannot be undone.`}
        variant="destructive"
        confirmLabel="Delete"
        loading={deleteOrderRowsMutation.isPending}
        error={
          deleteOrderRowsMutation.error instanceof ApiError
            ? deleteOrderRowsMutation.error.message
            : deleteOrderRowsMutation.error
              ? "Couldn't delete."
              : null
        }
      />
    </div>
  );
}
