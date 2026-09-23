import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router-dom";
import { useSuperadminToken } from "../../hooks/useSuperadminToken";
import { apiFetch } from "../../lib/apiClient";

export function RequireSuperadmin() {
  const token = useSuperadminToken();

  const accessQuery = useQuery({
    queryKey: ["superadmin-access-check", token],
    queryFn: () => apiFetch("/api/superadmin/dashboard"),
    enabled: Boolean(token),
    retry: false,
  });

  if (token && accessQuery.isLoading) {
    return <div className="p-4 text-sm text-gray-500">Loading...</div>;
  }

  // No token, or a token whose access check failed — /superadmin itself
  // handles both (login form, or an access-denied message with a way to
  // sign out and try again), so just send it there.
  if (!token || accessQuery.isError) {
    return <Navigate to="/superadmin" replace />;
  }

  return <Outlet />;
}
