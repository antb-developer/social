import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Breadcrumb } from "../../components/admin/Breadcrumb";
import { SearchIcon } from "../../components/admin/icons";
import { BulkActionsBar } from "../../components/admin/ui/BulkActionsBar";
import { ComponentCard } from "../../components/admin/ui/ComponentCard";
import { ConfirmationModal } from "../../components/admin/ui/ConfirmationModal";
import { Input } from "../../components/admin/ui/Input";
import { Pagination } from "../../components/admin/ui/Pagination";
import { RowActions } from "../../components/admin/ui/RowActions";
import { SelectionCheckbox } from "../../components/admin/ui/SelectionCheckbox";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/admin/ui/Table";
import { useModal } from "../../hooks/useModal";
import { useRowSelection } from "../../hooks/useRowSelection";
import { apiFetch, ApiError } from "../../lib/apiClient";

type Customer = {
  id: string;
  name: string | null;
  phone: string;
  order_count: number;
  created_at: string;
};

type CustomersResponse = { data: Customer[]; total: number; page: number; pageSize: number };

const PAGE_SIZE = 20;

export function SuperadminCustomersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const deleteModal = useModal();

  const customersQuery = useQuery({
    queryKey: ["superadmin-customers", search, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      return apiFetch<CustomersResponse>(`/api/superadmin/customers?${params.toString()}`);
    },
  });

  const customers = customersQuery.data?.data ?? [];
  const selection = useRowSelection(customers.map((c) => c.id));

  useEffect(() => {
    selection.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch<{ deletedCount: number }>("/api/superadmin/customers", {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      }),
    onSuccess: () => {
      deleteModal.closeModal();
      setPendingDeleteIds(null);
      selection.clear();
      queryClient.invalidateQueries({ queryKey: ["superadmin-customers"] });
    },
  });

  function requestDelete(ids: string[]) {
    setPendingDeleteIds(ids);
    deleteModal.openModal();
  }

  return (
    <div>
      <Breadcrumb
        title="Customers"
        description="Every customer on the platform."
        homeTo="/superadmin/dashboard"
        homeLabel="Superadmin"
      />

      <ComponentCard bodyClassName="p-0">
        <div className="border-b border-gray-100 p-4 sm:p-5">
          <div className="relative max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name or phone"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>

        <BulkActionsBar
          count={selection.count}
          itemLabel="customer"
          onDelete={() => requestDelete(selection.selectedIds)}
        />

        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100">
              <TableRow>
                <TableCell isHeader className="w-10 px-5 py-3">
                  <SelectionCheckbox
                    checked={selection.allSelected}
                    indeterminate={selection.isIndeterminate}
                    onChange={selection.toggleAll}
                    ariaLabel="Select all customers"
                  />
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                  Customer
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                  Phone
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                  Orders
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                  Created
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-end text-theme-xs font-medium text-gray-500">
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100">
              {customersQuery.isLoading && (
                <TableRow>
                  <TableCell className="px-5 py-5 text-sm text-gray-500">Loading customers...</TableCell>
                </TableRow>
              )}
              {customersQuery.isError && (
                <TableRow>
                  <TableCell className="px-5 py-5 text-sm text-error-600">Couldn't load customers.</TableCell>
                </TableRow>
              )}
              {!customersQuery.isLoading && !customersQuery.isError && customers.length === 0 && (
                <TableRow>
                  <TableCell className="px-5 py-5 text-sm text-gray-500">No customers found.</TableCell>
                </TableRow>
              )}
              {customers.map((customer) => (
                <TableRow key={customer.id} className="hover:bg-gray-50">
                  <TableCell className="px-5 py-4">
                    <SelectionCheckbox
                      checked={selection.selected.has(customer.id)}
                      onChange={() => selection.toggle(customer.id)}
                      ariaLabel={`Select ${customer.name ?? customer.phone}`}
                    />
                  </TableCell>
                  <TableCell className="px-5 py-4 text-start">
                    <button
                      type="button"
                      onClick={() => navigate(`/superadmin/customers/${customer.id}`)}
                      className="block text-start"
                    >
                      <span className="text-theme-sm font-medium text-gray-800">
                        {customer.name ?? "Unnamed customer"}
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600">{customer.phone}</TableCell>
                  <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600">{customer.order_count}</TableCell>
                  <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500">
                    {new Date(customer.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-end">
                    <RowActions
                      onView={() => navigate(`/superadmin/customers/${customer.id}`)}
                      onDelete={() => requestDelete([customer.id])}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {customersQuery.data && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={customersQuery.data.total} onPageChange={setPage} />
        )}
      </ComponentCard>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => {
          deleteModal.closeModal();
          setPendingDeleteIds(null);
        }}
        onConfirm={() => pendingDeleteIds && deleteMutation.mutate(pendingDeleteIds)}
        title={pendingDeleteIds && pendingDeleteIds.length > 1 ? "Delete customers" : "Delete customer"}
        description={`This permanently deletes ${
          pendingDeleteIds && pendingDeleteIds.length > 1 ? `${pendingDeleteIds.length} customers` : "this customer"
        } and all of their orders, messages and payment proofs. Their login is kept, so they can sign in again as a new customer. This cannot be undone.`}
        variant="destructive"
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        error={
          deleteMutation.error instanceof ApiError ? deleteMutation.error.message : deleteMutation.error ? "Couldn't delete." : null
        }
      />
    </div>
  );
}
