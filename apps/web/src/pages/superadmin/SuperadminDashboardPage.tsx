import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Breadcrumb } from "../../components/admin/Breadcrumb";
import { ComponentCard } from "../../components/admin/ui/ComponentCard";
import { apiFetch } from "../../lib/apiClient";

type DashboardStats = { storeCount: number; orderCount: number };

export function SuperadminDashboardPage() {
  const statsQuery = useQuery({
    queryKey: ["superadmin-dashboard"],
    queryFn: () => apiFetch<DashboardStats>("/api/superadmin/dashboard"),
  });

  return (
    <div>
      <Breadcrumb
        title="Superadmin"
        description="Platform-wide overview across every store."
        homeTo="/superadmin/dashboard"
        homeLabel="Superadmin"
      />

      {statsQuery.isLoading && <p className="text-sm text-gray-500">Loading...</p>}
      {statsQuery.isError && <p className="text-sm text-error-600">Couldn't load dashboard stats.</p>}

      {statsQuery.data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ComponentCard>
            <p className="text-sm text-gray-500">Total stores</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{statsQuery.data.storeCount}</p>
            <Link to="/superadmin/stores" className="mt-3 inline-block text-sm font-medium text-brand-500 hover:text-brand-600">
              View all stores &rarr;
            </Link>
          </ComponentCard>
          <ComponentCard>
            <p className="text-sm text-gray-500">Total orders</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{statsQuery.data.orderCount}</p>
            <Link to="/superadmin/orders" className="mt-3 inline-block text-sm font-medium text-brand-500 hover:text-brand-600">
              View all orders &rarr;
            </Link>
          </ComponentCard>
        </div>
      )}
    </div>
  );
}
