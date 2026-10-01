import { NavLink, Outlet } from "react-router-dom";
import { Logo } from "../Logo";
import { useAuth } from "../../context/AuthContext";

interface TabDef {
  to: string;
  label: string;
  /** Omit to show for every role. */
  leadOnly?: boolean;
}

const TABS: TabDef[] = [
  { to: "/", label: "Home" },
  { to: "/setlists", label: "Setlists" },
  { to: "/library", label: "Library" },
  { to: "/team", label: "Team", leadOnly: true },
  { to: "/settings", label: "Settings" },
];

/**
 * The shell every screen lives inside. Notice what does NOT branch here:
 * the shell itself is identical for both roles — same header, same tab
 * bar mechanics. Only the *set of tabs* changes (Team is Lead-only), which
 * keeps the Database/Logic vs Service/Spirit split a content decision,
 * not two different apps to maintain.
 */
export function AppShell() {
  const { user, isLead } = useAuth();
  const visibleTabs = TABS.filter((t) => !t.leadOnly || isLead);

  return (
    <div className="hw-app">
      <header className="hw-app-header">
        <span className="hw-wordmark"><Logo /> Hallowly</span>
        <span className="hw-role-badge">{isLead ? "TEAM LEAD" : "TEAM MEMBER"} · {user?.name}</span>
      </header>

      <main className="hw-app-content">
        <Outlet />
      </main>

      <nav className="hw-tabbar">
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/"}
            className={({ isActive }) => "hw-tab" + (isActive ? " active" : "")}
          >
            <span className="hw-tab-dot" />
            {tab.label.toUpperCase()}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
