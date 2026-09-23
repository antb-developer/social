// TEMPORARY: static-OTP dev bypass, standing in for real Supabase phone auth
// while phone auth isn't configured on the Supabase project. See
// hooks/useOtpAuth.ts and hooks/useSellerOtpAuth.ts for the commented-out
// real Supabase OTP calls this replaces, and middleware/auth.ts on the API
// side for the matching backend bypass. Remove all of this once phone auth
// works and switch the hooks back to the real calls.

const STORAGE_KEY = "sod:static-auth";
export const STATIC_AUTH_CHANGED_EVENT = "sod:static-auth-changed";
export const STATIC_OTP_CODE = "1234";

export type StaticAuthUser = {
  userId: string;
  phone: string;
};

export function getStaticAuthUser(): StaticAuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StaticAuthUser) : null;
  } catch {
    return null;
  }
}

export function setStaticAuthUser(user: StaticAuthUser): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(STATIC_AUTH_CHANGED_EVENT));
}

export function clearStaticAuthUser(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(STATIC_AUTH_CHANGED_EVENT));
}

export function staticAuthToken(user: StaticAuthUser): string {
  return `dev:${user.userId}`;
}
