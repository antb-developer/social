import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Breadcrumb } from "../../components/admin/Breadcrumb";
import { Badge } from "../../components/admin/ui/Badge";
import { Button } from "../../components/admin/ui/Button";
import { ComponentCard } from "../../components/admin/ui/ComponentCard";
import { ConfirmationModal } from "../../components/admin/ui/ConfirmationModal";
import { Pagination } from "../../components/admin/ui/Pagination";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/admin/ui/Table";
import { useModal } from "../../hooks/useModal";
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

  const deleteOrdersModal = useModal();
  const deleteCustomerModal = useModal();
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
                {!ordersQuery.isLoading && !ordersQuery.isError && (ordersQuery.data?.data.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell className="px-5 py-5 text-sm text-gray-500">No orders for this customer.</TableCell>
                  </TableRow>
                )}
                {ordersQuery.data?.data.map((order) => (
                  <TableRow key={order.id}>
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
    </div>
  );
}
