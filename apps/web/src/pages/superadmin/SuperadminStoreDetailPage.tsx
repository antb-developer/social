import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Breadcrumb } from "../../components/admin/Breadcrumb";
import { Badge } from "../../components/admin/ui/Badge";
import { BulkActionsBar } from "../../components/admin/ui/BulkActionsBar";
import { Button } from "../../components/admin/ui/Button";
import { ComponentCard } from "../../components/admin/ui/ComponentCard";
import { ConfirmationModal } from "../../components/admin/ui/ConfirmationModal";
import { Modal } from "../../components/admin/ui/Modal";
import { OrderDetailModal } from "../../components/admin/ui/OrderDetailModal";
import { Pagination } from "../../components/admin/ui/Pagination";
import { RowActions } from "../../components/admin/ui/RowActions";
import { SelectionCheckbox } from "../../components/admin/ui/SelectionCheckbox";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/admin/ui/Table";
import { useModal } from "../../hooks/useModal";
import { useRowSelection } from "../../hooks/useRowSelection";
import { apiFetch, ApiError } from "../../lib/apiClient";
import { getStaticAuthUser, staticAuthToken } from "../../lib/staticAuth";
import { supabase } from "../../lib/supabaseClient";

type Store = {
  id: string;
  name: string;
  slug: string;
  phone: string;
  whatsapp_number: string | null;
  upi_id: string | null;
  upi_name: string | null;
  is_accepting_orders: boolean;
  created_at: string;
};

type Order = { id: string; order_no: string; status: string; total_paise: number; created_at: string };
type OrdersResponse = { data: Order[]; total: number };
type Member = { user_id: string; role: string; phone: string | null; created_at: string };

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

type PendingDelete = { kind: "orders" | "members"; ids: string[] } | null;

export function SuperadminStoreDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [ordersPage, setOrdersPage] = useState(1);
  const [viewOrderId, setViewOrderId] = useState<string | null>(null);
  const [viewMember, setViewMember] = useState<Member | null>(null);

  const backupModal = useModal();
  const deleteOrdersModal = useModal();
  const deleteStoreModal = useModal();
  const rowDeleteModal = useModal();
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const storeQuery = useQuery({
    queryKey: ["superadmin-store", id],
    queryFn: () => apiFetch<Store>(`/api/superadmin/stores/${id}`),
    enabled: Boolean(id),
  });

  const ordersQuery = useQuery({
    queryKey: ["superadmin-store-orders", id, ordersPage],
    queryFn: () =>
      apiFetch<OrdersResponse>(`/api/superadmin/stores/${id}/orders?page=${ordersPage}&pageSize=${PAGE_SIZE}`),
    enabled: Boolean(id),
  });

  const usersQuery = useQuery({
    queryKey: ["superadmin-store-users", id],
    queryFn: () => apiFetch<Member[]>(`/api/superadmin/stores/${id}/users`),
    enabled: Boolean(id),
  });

  const orders = ordersQuery.data?.data ?? [];
  const orderSelection = useRowSelection(orders.map((o) => o.id));
  const members = usersQuery.data ?? [];
  const memberSelection = useRowSelection(members.map((m) => m.user_id));

  useEffect(() => {
    orderSelection.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersPage]);

  const backupMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/superadmin/stores/${id}/backup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${await getAuthToken()}` },
      });
      if (!res.ok) throw new Error("Backup failed");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="(.+)"/.exec(disposition);
      const filename = match?.[1] ?? `store-backup-${storeQuery.data?.slug ?? id}.zip`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      backupModal.closeModal();
      setActionError(null);
    },
    onError: () => setActionError("Couldn't generate the backup. Please try again."),
  });

  const deleteOrdersMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ deletedCount: number }>(`/api/superadmin/stores/${id}/orders`, {
        method: "DELETE",
        body: JSON.stringify({ confirm: "DELETE ORDERS" }),
      }),
    onSuccess: () => {
      deleteOrdersModal.closeModal();
      setActionError(null);
      orderSelection.clear();
      queryClient.invalidateQueries({ queryKey: ["superadmin-store-orders", id] });
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "Couldn't delete orders."),
  });

  const deleteStoreMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/superadmin/stores/${id}`, {
        method: "DELETE",
        body: JSON.stringify({ confirm: `DELETE STORE ${storeQuery.data?.slug}` }),
      }),
    onSuccess: () => {
      deleteStoreModal.closeModal();
      navigate("/superadmin/stores");
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "Couldn't delete the store."),
  });

  const deleteOrderRowsMutation = useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch<{ deletedCount: number }>("/api/superadmin/orders", {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      }),
    onSuccess: () => {
      rowDeleteModal.closeModal();
      setPendingDelete(null);
      orderSelection.clear();
      queryClient.invalidateQueries({ queryKey: ["superadmin-store-orders", id] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-store", id] });
    },
  });

  const deleteMembersMutation = useMutation({
    mutationFn: (userIds: string[]) =>
      apiFetch<{ deletedCount: number }>(`/api/superadmin/stores/${id}/members`, {
        method: "DELETE",
        body: JSON.stringify({ userIds }),
      }),
    onSuccess: () => {
      rowDeleteModal.closeModal();
      setPendingDelete(null);
      memberSelection.clear();
      queryClient.invalidateQueries({ queryKey: ["superadmin-store-users", id] });
    },
  });

  function requestRowDelete(kind: "orders" | "members", ids: string[]) {
    setPendingDelete({ kind, ids });
    rowDeleteModal.openModal();
  }

  function confirmRowDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "orders") {
      deleteOrderRowsMutation.mutate(pendingDelete.ids);
    } else {
      deleteMembersMutation.mutate(pendingDelete.ids);
    }
  }

  const rowDeleteMutation = pendingDelete?.kind === "members" ? deleteMembersMutation : deleteOrderRowsMutation;

  if (storeQuery.isLoading) {
    return <p className="p-4 text-sm text-gray-500">Loading store...</p>;
  }
  if (storeQuery.isError || !storeQuery.data) {
    return <p className="p-4 text-sm text-error-600">Couldn't load this store.</p>;
  }

  const store = storeQuery.data;

  return (
    <div>
      <Breadcrumb
        title={store.name}
        description={`/s/${store.slug}`}
        homeTo="/superadmin/dashboard"
        homeLabel="Superadmin"
      />

      <div className="space-y-6">
        <ComponentCard title="Store details">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-gray-500">Name</dt>
              <dd className="text-sm text-gray-800">{store.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Slug</dt>
              <dd className="text-sm text-gray-800">{store.slug}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Phone</dt>
              <dd className="text-sm text-gray-800">{store.phone}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">WhatsApp</dt>
              <dd className="text-sm text-gray-800">{store.whatsapp_number ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">UPI</dt>
              <dd className="text-sm text-gray-800">
                {store.upi_id ? `${store.upi_id}${store.upi_name ? ` (${store.upi_name})` : ""}` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Accepting orders</dt>
              <dd>
                <Badge size="sm" color={store.is_accepting_orders ? "success" : "light"}>
                  {store.is_accepting_orders ? "Yes" : "No"}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Created</dt>
              <dd className="text-sm text-gray-800">{new Date(store.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        </ComponentCard>

        <ComponentCard title="Orders" bodyClassName="p-0">
          <BulkActionsBar
            count={orderSelection.count}
            itemLabel="order"
            onDelete={() => requestRowDelete("orders", orderSelection.selectedIds)}
          />
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100">
                <TableRow>
                  <TableCell isHeader className="w-10 px-5 py-3">
                    <SelectionCheckbox
                      checked={orderSelection.allSelected}
                      indeterminate={orderSelection.isIndeterminate}
                      onChange={orderSelection.toggleAll}
                      ariaLabel="Select all orders"
                    />
                  </TableCell>
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
                    <TableCell className="px-5 py-5 text-sm text-gray-500">No orders for this store.</TableCell>
                  </TableRow>
                )}
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="px-5 py-4">
                      <SelectionCheckbox
                        checked={orderSelection.selected.has(order.id)}
                        onChange={() => orderSelection.toggle(order.id)}
                        ariaLabel={`Select ${order.order_no}`}
                      />
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm font-medium text-gray-800">
                      {order.order_no}
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
                      <RowActions
                        onView={() => setViewOrderId(order.id)}
                        onDelete={() => requestRowDelete("orders", [order.id])}
                      />
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

        <ComponentCard title="Users" bodyClassName="p-0">
          <BulkActionsBar
            count={memberSelection.count}
            itemLabel="member"
            onDelete={() => requestRowDelete("members", memberSelection.selectedIds)}
          />
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100">
                <TableRow>
                  <TableCell isHeader className="w-10 px-5 py-3">
                    <SelectionCheckbox
                      checked={memberSelection.allSelected}
                      indeterminate={memberSelection.isIndeterminate}
                      onChange={memberSelection.toggleAll}
                      ariaLabel="Select all members"
                    />
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                    Phone
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                    Role
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                    Since
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-end text-theme-xs font-medium text-gray-500">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100">
                {usersQuery.isLoading && (
                  <TableRow>
                    <TableCell className="px-5 py-5 text-sm text-gray-500">Loading users...</TableCell>
                  </TableRow>
                )}
                {usersQuery.isError && (
                  <TableRow>
                    <TableCell className="px-5 py-5 text-sm text-error-600">Couldn't load users.</TableCell>
                  </TableRow>
                )}
                {!usersQuery.isLoading && !usersQuery.isError && members.length === 0 && (
                  <TableRow>
                    <TableCell className="px-5 py-5 text-sm text-gray-500">No members.</TableCell>
                  </TableRow>
                )}
                {members.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell className="px-5 py-4">
                      <SelectionCheckbox
                        checked={memberSelection.selected.has(member.user_id)}
                        onChange={() => memberSelection.toggle(member.user_id)}
                        ariaLabel={`Select ${member.phone ?? member.user_id}`}
                      />
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-800">
                      {member.phone ?? member.user_id}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      <Badge size="sm" color={member.role === "owner" ? "primary" : "light"}>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500">
                      {new Date(member.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-end">
                      <RowActions
                        onView={() => setViewMember(member)}
                        onDelete={() => requestRowDelete("members", [member.user_id])}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ComponentCard>

        <ComponentCard title="Danger zone" desc="These actions require typed confirmation and can't be undone.">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={backupModal.openModal}>
              Download backup
            </Button>
            <Button variant="danger" onClick={deleteOrdersModal.openModal}>
              Delete all orders
            </Button>
            <Button variant="danger" onClick={deleteStoreModal.openModal}>
              Delete store
            </Button>
          </div>
        </ComponentCard>
      </div>

      <OrderDetailModal orderId={viewOrderId} onClose={() => setViewOrderId(null)} />

      <Modal isOpen={Boolean(viewMember)} onClose={() => setViewMember(null)} className="max-w-sm p-6">
        {viewMember && (
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-800">{viewMember.phone ?? "Member"}</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-gray-500">Role</dt>
                <dd>
                  <Badge size="sm" color={viewMember.role === "owner" ? "primary" : "light"}>
                    {viewMember.role}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">User ID</dt>
                <dd className="break-all text-gray-800">{viewMember.user_id}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Member since</dt>
                <dd className="text-gray-800">{new Date(viewMember.created_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>

      <ConfirmationModal
        isOpen={backupModal.isOpen}
        onClose={backupModal.closeModal}
        onConfirm={() => backupMutation.mutate()}
        title="Create a store backup"
        description="Create a complete backup of this store before continuing? This downloads a ZIP with the store's data, orders, products, templates and message history."
        confirmLabel="Create backup"
        loading={backupMutation.isPending}
        error={actionError}
      />

      <ConfirmationModal
        isOpen={deleteOrdersModal.isOpen}
        onClose={deleteOrdersModal.closeModal}
        onConfirm={() => deleteOrdersMutation.mutate()}
        title="Delete all orders"
        description="This will permanently delete all orders, messages, payment proofs and order history for this store. Products, customers and the store itself are not affected."
        variant="destructive"
        requireTypedConfirmation="DELETE ORDERS"
        confirmLabel="Delete orders"
        loading={deleteOrdersMutation.isPending}
        error={actionError}
      />

      <ConfirmationModal
        isOpen={deleteStoreModal.isOpen}
        onClose={deleteStoreModal.closeModal}
        onConfirm={() => deleteStoreMutation.mutate()}
        title="Delete store"
        description="This permanently deletes the store and all its associated data — members, products, templates, orders and message history. This cannot be undone."
        variant="destructive"
        requireTypedConfirmation={`DELETE STORE ${store.slug}`}
        confirmLabel="Delete store"
        loading={deleteStoreMutation.isPending}
        error={actionError}
      />

      <ConfirmationModal
        isOpen={rowDeleteModal.isOpen}
        onClose={() => {
          rowDeleteModal.closeModal();
          setPendingDelete(null);
        }}
        onConfirm={confirmRowDelete}
        title={
          pendingDelete?.kind === "members"
            ? pendingDelete.ids.length > 1
              ? "Remove members"
              : "Remove member"
            : pendingDelete && pendingDelete.ids.length > 1
              ? "Delete orders"
              : "Delete order"
        }
        description={
          pendingDelete?.kind === "members"
            ? `This removes ${pendingDelete.ids.length > 1 ? `${pendingDelete.ids.length} members` : "this member"} from the store. They will lose access to the seller dashboard.`
            : `This permanently deletes ${pendingDelete && pendingDelete.ids.length > 1 ? `${pendingDelete.ids.length} orders` : "this order"}, including messages, payment proofs and status history. This cannot be undone.`
        }
        variant="destructive"
        confirmLabel={pendingDelete?.kind === "members" ? "Remove" : "Delete"}
        loading={rowDeleteMutation.isPending}
        error={rowDeleteMutation.error instanceof ApiError ? rowDeleteMutation.error.message : rowDeleteMutation.error ? "Couldn't complete this action." : null}
      />
    </div>
  );
}

// Mirrors apiClient's token resolution (static-OTP dev bypass first, else a
// real Supabase session) — needed here because the backup download uses a
// raw fetch instead of apiFetch, so it can read the response as a blob.
async function getAuthToken(): Promise<string | undefined> {
  const staticUser = getStaticAuthUser();
  if (staticUser) return staticAuthToken(staticUser);

  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}
