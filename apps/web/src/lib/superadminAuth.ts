// Storage for the superadmin bearer token issued by POST /api/superadmin/login
// (see SuperadminLoginPage). Independent of both the customer/seller Supabase
// session and the static-OTP dev bypass (staticAuth.ts) — superadmin has its
// own username+password login, not tied to either.

const STORAGE_KEY = "sod:superadmin-token";
export const SUPERADMIN_TOKEN_CHANGED_EVENT = "sod:superadmin-token-changed";

export function getSuperadminToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setSuperadminToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // ignore — worst case the session doesn't persist across a reload
  }
  window.dispatchEvent(new Event(SUPERADMIN_TOKEN_CHANGED_EVENT));
}

export function clearSuperadminToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(SUPERADMIN_TOKEN_CHANGED_EVENT));
}
