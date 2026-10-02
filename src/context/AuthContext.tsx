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
  /** Finish sign-in with the code from the email (works across apps/devices). */
  verifyCode: (email: string, code: string) => Promise<string | null>;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  /** Demo-only role switch (hidden when a backend is connected). */
  signInAs: (role: Role) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const TEAM: Team = { id: "team-1", name: "Iglesia Calvario Succotz", defaultAccent: "amethyst" };
const demo = (role: Role): User => ({ id: "demo", name: role === "lead" ? "Jordan" : "Sam", role, teamId: TEAM.id });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(isBackendConfigured ? null : demo("lead"));

  useEffect(() => {
    if (!supabase) return;
    const sb = supabase;
    // onAuthStateChange also fires INITIAL_SESSION, so no separate getSession() call is needed.
    const { data: sub } = sb.auth.onAuthStateChange((event, s) => {
      if (event === "TOKEN_REFRESHED") return; // same person, nothing to reload
      if (event === "PASSWORD_RECOVERY") setTimeout(() => { const p = window.prompt("Choose a new password (8+ characters)"); if (p && p.length >= 8) sb.auth.updateUser({ password: p }); }, 0);
      // Deferred: awaiting Supabase calls inside this callback can deadlock the client.
      setTimeout(async () => {
        const u = s?.user;
        const email = u?.email;
        if (!u || !email) return setUser(null);
        const { data } = await sb.rpc("my_profile");
        const p = Array.isArray(data) ? data[0] : null;
        setUser({ id: u.id, name: p?.full_name ?? email.split("@")[0], role: p?.role === "Lead" ? "lead" : "member", teamId: TEAM.id });
      }, 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    team: user ? TEAM : null,
    isLead: user?.role === "lead",
    signedIn: user !== null,
    signInWithEmail: async (email) => {
      if (!supabase) return "Backend not configured.";
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/` } });
      return error ? error.message : null;
    },
    verifyCode: async (email, code) => {
      if (!supabase) return "Backend not configured.";
      const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
      return error ? error.message : null;
    },
    signInWithPassword: async (email, password) => {
      if (!supabase) return "Backend not configured.";
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? error.message : null;
    },
    resetPassword: async (email) => {
      if (!supabase) return "Backend not configured.";
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/` });
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
