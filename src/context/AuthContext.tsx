// ---------------------------------------------------------------------------
// Every screen reads "who is signed in" from this context, never from a
// prop chain. Right now `signIn` just sets mock local state; when a real
// backend exists, only the inside of this file changes — nothing that
// calls useAuth() needs to know or care.
// ---------------------------------------------------------------------------

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Role, Team, User } from "../types/user";

interface AuthContextValue {
  user: User | null;
  team: Team | null;
  isLead: boolean;
  /** Mock sign-in for foundation/demo purposes — swap for real auth later. */
  signInAs: (role: Role) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const MOCK_TEAM: Team = {
  id: "team-1",
  name: "Riverside Worship",
  defaultAccent: "amethyst",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>({
    id: "user-1",
    name: "Jordan",
    role: "lead",
    teamId: MOCK_TEAM.id,
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      team: user ? MOCK_TEAM : null,
      isLead: user?.role === "lead",
      signInAs: (role) =>
        setUser({ id: "user-1", name: role === "lead" ? "Jordan" : "Sam", role, teamId: MOCK_TEAM.id }),
      signOut: () => setUser(null),
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
