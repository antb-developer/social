import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { BrandLogo } from "../../components/BrandLogo";
import { useSuperadminToken } from "../../hooks/useSuperadminToken";
import { apiFetch, ApiError } from "../../lib/apiClient";
import { clearSuperadminToken, setSuperadminToken } from "../../lib/superadminAuth";
import { button } from "../../lib/ui";

const field =
  "h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10";
const label = "mb-1.5 block text-sm font-medium text-gray-700";

// Superadmin has its own fixed username+password login (POST /api/superadmin/login),
// separate from the phone+OTP flow the rest of the app uses — see lib/superadminAuth.ts
// for how the resulting token is stored and lib/apiClient.ts for how it's attached to requests.
export function SuperadminLoginPage() {
  const token = useSuperadminToken();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Already have a token (from an earlier visit, or just logged in below) —
  // check it's still valid and, if so, go straight to the dashboard.
  const accessQuery = useQuery({
    queryKey: ["superadmin-access-check", token],
    queryFn: () => apiFetch("/api/superadmin/dashboard"),
    enabled: Boolean(token),
    retry: false,
  });

  // A stored token that no longer checks out (revoked, expired, tampered) —
  // clear it so the form below shows instead of a blank/loading page forever.
  useEffect(() => {
    if (token && accessQuery.isError) {
      clearSuperadminToken();
    }
  }, [token, accessQuery.isError]);

  if (token && accessQuery.isSuccess) {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoggingIn(true);
    try {
      const result = await apiFetch<{ token: string }>("/api/superadmin/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setSuperadminToken(result.token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.");
    } finally {
      setLoggingIn(false);
    }
  }

  if (token && accessQuery.isLoading) {
    return <div className="p-4 text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-title-sm font-semibold tracking-tight text-gray-900">Superadmin login</h1>
          <p className="mt-2 text-theme-sm text-gray-500">Platform staff only.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="username" className={label}>
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={field}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className={label}>
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={field}
                required
              />
            </div>
            {error && <p className="text-sm text-error-600">{error}</p>}
            <button type="submit" disabled={loggingIn} className={`w-full ${button.brand} h-11`}>
              {loggingIn ? "Logging in..." : "Log in"}
            </button>
          </form>
        </div>
      </div>

      <aside className="hidden flex-col justify-between bg-brand-950 p-12 text-white lg:flex">
        <BrandLogo light />
        <div>
          <p className="text-title-sm font-semibold tracking-tight">Platform staff only.</p>
          <p className="mt-3 max-w-sm text-theme-sm text-gray-400">
            Cross-store visibility and store lifecycle operations for Order Desk staff.
          </p>
        </div>
        <p className="text-theme-xs text-gray-500">&copy; {new Date().getFullYear()} Order Desk</p>
      </aside>
    </div>
  );
}
