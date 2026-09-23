import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { clearStaticAuthUser, STATIC_AUTH_CHANGED_EVENT, getStaticAuthUser } from "../lib/staticAuth";
import { clearSuperadminToken } from "../lib/superadminAuth";
import { supabase } from "../lib/supabaseClient";

type AuthUser = { id: string; phone: string | null };

type AuthContextValue = {
  session: Session | null;
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // TEMPORARY: static-OTP dev bypass — see lib/staticAuth.ts. Takes priority
  // over a real Supabase session when present.
  const [staticUser, setStaticUser] = useState(() => getStaticAuthUser());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    function onStaticAuthChanged() {
      setStaticUser(getStaticAuthUser());
    }
    window.addEventListener(STATIC_AUTH_CHANGED_EVENT, onStaticAuthChanged);

    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener(STATIC_AUTH_CHANGED_EVENT, onStaticAuthChanged);
    };
  }, []);

  const user: AuthUser | null = staticUser
    ? { id: staticUser.userId, phone: staticUser.phone }
    : session?.user
      ? { id: session.user.id, phone: session.user.phone ?? null }
      : null;

  async function signOut() {
    clearStaticAuthUser();
    clearSuperadminToken();
    await supabase.auth.signOut();
  }

  return <AuthContext.Provider value={{ session, user, loading, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
