import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/apiClient";

export function RequireSeller() {
  const { user, loading: authLoading } = useAuth();

  const settingsQuery = useQuery({
    queryKey: ["seller-settings-check"],
    queryFn: () => apiFetch("/api/seller/settings"),
    enabled: Boolean(user),
    retry: false,
  });

  if (authLoading || (user && settingsQuery.isLoading)) {
    return <div className="p-4 text-sm text-gray-500">Loading...</div>;
  }

  if (!user || settingsQuery.isError) {
    return <Navigate to="/login?role=store" replace />;
  }

  return <Outlet />;
}
