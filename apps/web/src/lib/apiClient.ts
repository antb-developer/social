import { getStaticAuthUser, staticAuthToken } from "./staticAuth";
import { getSuperadminToken } from "./superadminAuth";
import { supabase } from "./supabaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  // A superadmin token (from the dedicated username+password login) takes
  // priority when present, then the TEMPORARY static-OTP dev bypass — see
  // lib/staticAuth.ts — then a real Supabase session.
  const superadminToken = getSuperadminToken();
  const staticUser = getStaticAuthUser();
  let token: string | undefined;
  if (superadminToken) {
    token = superadminToken;
  } else if (staticUser) {
    token = staticAuthToken(staticUser);
  } else {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  }

  const isFormData = init.body instanceof FormData;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      res.status,
      body?.error?.code ?? "unknown_error",
      body?.error?.message ?? `Request failed with status ${res.status}`
    );
  }

  if (res.status === 204) {
    return null as T;
  }
  return res.json() as Promise<T>;
}
