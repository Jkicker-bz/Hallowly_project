import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLibrary } from "../context/LibraryContext";
import { Logo } from "./Logo";

const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/** One navigation for the whole app: a left sidebar on desktop, a bottom tab bar on phones. */
export function AppFrame({ children }: { children: ReactNode }) {
  const { user, isLead, signedIn } = useAuth();
  const { songs, setlists } = useLibrary();
  const path = useLocation().pathname;
  const home = isLead ? "/dashboard" : "/member";
  const items = [
    { to: home, label: "Home", icon: "⬡", on: path === "/dashboard" || path === "/member" },
    { to: "/library", label: "Song Library", icon: "◈", badge: songs.length, on: /^\/(library|song|chord-editor|add-song)/.test(path) },
    { to: "/setlists", label: "Set Lists", icon: "≡", badge: setlists.length, on: /^\/(setlists|create-setlist)/.test(path) },
    { to: "/singers", label: "Singers", icon: "◎", on: path === "/singers" },
    ...(isLead ? [{ to: "/team", label: "Team", icon: "⊞", on: path === "/team" }] : []),
    { to: "/settings", label: "Settings", icon: "◇", on: path === "/settings" },
  ];
  return (
    <div className="shell">
      <nav className="shell-nav" aria-label="Main">
        <Link to="/" className="shell-brand"><Logo size={30} /><span>HALLOWLY</span></Link>
        <div className="shell-items">
          {items.map((i) => (
            <Link key={i.to} to={i.to} className={"shell-item" + (i.on ? " on" : "")} aria-current={i.on ? "page" : undefined}>
              <span className="shell-ico" aria-hidden="true">{i.icon}</span>
              <span className="shell-lbl">{i.label}</span>
              {"badge" in i && i.badge ? <em>{i.badge}</em> : null}
            </Link>
          ))}
        </div>
        {signedIn && user ? (
          <div className="shell-user"><span className="shell-av">{initials(user.name)}</span><span><b>{user.name}</b><small>{isLead ? "Worship Lead" : "Team Member"}</small></span></div>
        ) : (
          <Link to="/login" className="shell-item"><span className="shell-lbl">Sign in</span></Link>
        )}
      </nav>
      <div className="shell-main">{children}</div>
    </div>
  );
}
