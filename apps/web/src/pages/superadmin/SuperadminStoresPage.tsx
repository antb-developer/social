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

type Store = {
  id: string;
  name: string;
  slug: string;
  phone: string;
  is_accepting_orders: boolean;
  order_count: number;
  created_at: string;
};

type StoresResponse = { data: Store[]; total: number; page: number; pageSize: number };

const PAGE_SIZE = 20;

export function SuperadminStoresPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const storesQuery = useQuery({
    queryKey: ["superadmin-stores", search, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      return apiFetch<StoresResponse>(`/api/superadmin/stores?${params.toString()}`);
    },
  });

  const stores = storesQuery.data?.data ?? [];

  return (
    <div>
      <Breadcrumb
        title="Stores"
        description="Every store on the platform."
        homeTo="/superadmin/dashboard"
        homeLabel="Superadmin"
      />

      <ComponentCard bodyClassName="p-0">
        <div className="border-b border-gray-100 p-4 sm:p-5">
          <div className="relative max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, slug or phone"
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
                  Store
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                  Contact
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
              {storesQuery.isLoading && (
                <TableRow>
                  <TableCell className="px-5 py-5 text-sm text-gray-500">Loading stores...</TableCell>
                </TableRow>
              )}
              {storesQuery.isError && (
                <TableRow>
                  <TableCell className="px-5 py-5 text-sm text-error-600">Couldn't load stores.</TableCell>
                </TableRow>
              )}
              {!storesQuery.isLoading && !storesQuery.isError && stores.length === 0 && (
                <TableRow>
                  <TableCell className="px-5 py-5 text-sm text-gray-500">No stores found.</TableCell>
                </TableRow>
              )}
              {stores.map((store) => (
                <TableRow key={store.id} className="hover:bg-gray-50">
                  <TableCell className="px-5 py-4 text-start">
                    <Link to={`/superadmin/stores/${store.id}`} className="block">
                      <span className="text-theme-sm font-medium text-gray-800">{store.name}</span>
                      <span className="block text-xs text-gray-500">/s/{store.slug}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600">{store.phone}</TableCell>
                  <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600">{store.order_count}</TableCell>
                  <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500">
                    {new Date(store.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {storesQuery.data && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={storesQuery.data.total} onPageChange={setPage} />
        )}
      </ComponentCard>
    </div>
  );
}
