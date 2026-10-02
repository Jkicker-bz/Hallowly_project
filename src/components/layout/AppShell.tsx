import { Link, NavLink, Outlet } from "react-router-dom";
import { Logo } from "../Logo";
import { isBackendConfigured } from "../../lib/supabase";
import { useLibrary } from "../../context/LibraryContext";
import { useAuth } from "../../context/AuthContext";

interface TabDef {
  to: string;
  label: string;
  /** Omit to show for every role. */
  icon: string;
  leadOnly?: boolean;
}

const TABS: TabDef[] = [
  { to: "/manage", label: "Home", icon: "⬡" },
  { to: "/manage/setlists", label: "Setlists", icon: "≡" },
  { to: "/manage/library", label: "Library", icon: "◈" },
  { to: "/manage/team", label: "Team", icon: "⊞", leadOnly: true },
  { to: "/manage/settings", label: "Settings", icon: "◇" },
];

/**
 * The shell every screen lives inside. Notice what does NOT branch here:
 * the shell itself is identical for both roles — same header, same tab
 * bar mechanics. Only the *set of tabs* changes (Team is Lead-only), which
 * keeps the Database/Logic vs Service/Spirit split a content decision,
 * not two different apps to maintain.
 */
export function AppShell() {
  const { user, isLead, signOut } = useAuth();
  const { status, songs, readOnly } = useLibrary();
  const visibleTabs = TABS.filter((t) => !t.leadOnly || isLead);

  return (
    <div className="hw-app">
      <header className="hw-app-header">
        <span className="hw-wordmark"><Logo /> Hallowly</span>
        {user ? (
          <span className="hw-role-badge">
            {isLead ? "TEAM LEAD" : "TEAM MEMBER"} · {user.name}
            {isBackendConfigured && <> · <button className="hw-mini" style={{ padding: "1px 6px" }} onClick={signOut}>sign out</button></>}
          </span>
        ) : (
          <Link className="hw-role-badge" style={{ textDecoration: "none" }} to="/login">Sign in</Link>
        )}
      </header>

      <main className="hw-app-content">
        {readOnly && status === "error" && <p className="hw-card-meta" role="alert">Couldn't reach the database. Check your connection.</p>}
        {readOnly && status === "ready" && songs.length === 0 && <p className="hw-card-meta" role="status">Connected, but no songs came back. Check your Row Level Security read policies.</p>}
        <Outlet />
      </main>

      <nav className="hw-tabbar">
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/manage"}
            className={({ isActive }) => "hw-tab" + (isActive ? " active" : "")}
          >
            <span className="hw-tab-icon" aria-hidden="true">{tab.icon}</span>
            {tab.label.toUpperCase()}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
