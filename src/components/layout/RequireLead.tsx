import type { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";

/**
 * Wraps a Database/Logic-persona screen. Members hitting a Lead-only route
 * (e.g. by a shared link) see an explanation, not a broken page.
 */
export function RequireLead({ children }: { children: ReactNode }) {
  const { isLead } = useAuth();

  if (!isLead) {
    return (
      <div className="hw-card">
        <div className="hw-card-title">This space is for team leads</div>
        <div className="hw-card-meta">
          Ask your worship lead for access if you think this is a mistake.
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
