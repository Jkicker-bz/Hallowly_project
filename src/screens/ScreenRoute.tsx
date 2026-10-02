import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLibrary } from "../context/LibraryContext";
import { isBackendConfigured } from "../lib/supabase";
import { Screen } from "./Screen";
import { wire } from "./wire";

type Loader = () => Promise<unknown>;
const html = import.meta.glob("./html/*.html", { query: "?raw", import: "default" }) as Record<string, Loader>;
const css = import.meta.glob("./css/*.css") as Record<string, Loader>;
const names = Object.keys(html).map((k) => k.match(/html\/(.*)\.html/)![1]);

/** /ui/:name — each screen (and its CSS) loads only when opened. */
export function ScreenRoute() {
  const { name = "" } = useParams();
  const [markup, setMarkup] = useState<string | null>(null);
  const auth = useAuth();
  const lib = useLibrary();
  const nav = useNavigate();

  useEffect(() => {
    setMarkup(null);
    const h = html[`./html/${name}.html`];
    const c = css[`./css/${name}.css`];
    if (!h || !c) return setMarkup("");
    Promise.all([h(), c()]).then(([m]) => setMarkup(m as string));
  }, [name]);

  if (markup === null) return <div role="status" style={{ padding: 24, color: "#888780" }}>Loading…</div>;
  if (!markup) return name === "404" ? null : <Navigate to="/ui/404" replace />;
  const w = wire[name];
  return <Screen cls={`pg-${name}`} html={markup} hydrate={w && ((root, signal) => w(root, { auth, lib, nav, backend: isBackendConfigured }, signal))} />;
}

/** /ui — index of every screen, for review. */
export function ScreenIndex() {
  return (
    <div style={{ padding: "40px 24px", maxWidth: 520, margin: "0 auto", color: "#FDFDFD", fontFamily: "Montserrat, sans-serif" }}>
      <p style={{ fontSize: 9, letterSpacing: 3, color: "#6B6A65", textTransform: "uppercase" }}>Hallowly · all screens</p>
      <h1 style={{ fontWeight: 300, fontSize: 26, margin: "10px 0 24px" }}>Design screens</h1>
      {names.map((n) => (
        <Link key={n} to={`/ui/${n}`} style={{ display: "block", padding: "14px 0", borderTop: ".5px solid rgba(255,255,255,.07)", color: "#C0C0C0", textDecoration: "none", textTransform: "capitalize" }}>
          {n.replace(/-/g, " ")}
        </Link>
      ))}
    </div>
  );
}
