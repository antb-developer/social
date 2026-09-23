import { useEffect, useState } from "react";
import { getSuperadminToken, SUPERADMIN_TOKEN_CHANGED_EVENT } from "../lib/superadminAuth";

/** Reactive read of the superadmin token — updates on login/logout within the same tab. */
export function useSuperadminToken(): string | null {
  const [token, setToken] = useState(() => getSuperadminToken());

  useEffect(() => {
    function onChange() {
      setToken(getSuperadminToken());
    }
    window.addEventListener(SUPERADMIN_TOKEN_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(SUPERADMIN_TOKEN_CHANGED_EVENT, onChange);
  }, []);

  return token;
}
