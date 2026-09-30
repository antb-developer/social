import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Breadcrumb } from "../../components/admin/Breadcrumb";
import { SearchIcon } from "../../components/admin/icons";
import { ComponentCard } from "../../components/admin/ui/ComponentCard";
import { Input } from "../../components/admin/ui/Input";
import { Pagination } from "../../components/admin/ui/Pagination";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/admin/ui/Table";
import { apiFetch } from "../../lib/apiClient";

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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

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

        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100">
              <TableRow>
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
                  <TableCell className="px-5 py-4 text-start">
                    <Link to={`/superadmin/customers/${customer.id}`} className="block">
                      <span className="text-theme-sm font-medium text-gray-800">{customer.name ?? "Unnamed customer"}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600">{customer.phone}</TableCell>
                  <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600">{customer.order_count}</TableCell>
                  <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500">
                    {new Date(customer.created_at).toLocaleDateString()}
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
    </div>
  );
}
