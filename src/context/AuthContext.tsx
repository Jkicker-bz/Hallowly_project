// Real Supabase sign-in (magic link). Role comes from the `leads` table via the
// my_profile() database function, matched on the signed-in email.
// With no backend configured it falls back to a demo Lead so local dev still works.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role, Team, User } from "../types/user";
import { supabase, isBackendConfigured } from "../lib/supabase";

interface AuthContextValue {
  user: User | null;
  team: Team | null;
  isLead: boolean;
  signedIn: boolean;
  signInWithEmail: (email: string) => Promise<string | null>;
  /** Demo-only role switch (hidden when a backend is connected). */
  signInAs: (role: Role) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const TEAM: Team = { id: "team-1", name: "Worship Team", defaultAccent: "amethyst" };
const demo = (role: Role): User => ({ id: "demo", name: role === "lead" ? "Jordan" : "Sam", role, teamId: TEAM.id });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(isBackendConfigured ? null : demo("lead"));

  useEffect(() => {
    if (!supabase) return;
    const sb = supabase;
    const load = async (email?: string, id?: string) => {
      if (!email || !id) return setUser(null);
      const { data } = await sb.rpc("my_profile");
      const p = Array.isArray(data) ? data[0] : null;
      setUser({ id, name: p?.full_name ?? email.split("@")[0], role: p?.role === "Lead" ? "lead" : "member", teamId: TEAM.id });
    };
    sb.auth.getSession().then(({ data }) => load(data.session?.user.email, data.session?.user.id));
    // Defer: awaiting Supabase calls inside this callback can deadlock the client.
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => { setTimeout(() => load(s?.user.email, s?.user.id), 0); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    team: user ? TEAM : null,
    isLead: user?.role === "lead",
    signedIn: user !== null,
    signInWithEmail: async (email) => {
      if (!supabase) return "Backend not configured.";
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
      return error ? error.message : null;
    },
    signInAs: (role) => setUser(demo(role)),
    signOut: () => { supabase?.auth.signOut(); setUser(isBackendConfigured ? null : demo("lead")); },
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
