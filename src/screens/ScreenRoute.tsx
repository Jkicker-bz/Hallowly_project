import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLibrary } from "../context/LibraryContext";
import { isBackendConfigured } from "../lib/supabase";
import { Loader } from "../components/Loader";
import { ErrorBoundary } from "./ErrorBoundary";
import { Screen } from "./Screen";
import { wire } from "./wire";

type Loader = () => Promise<unknown>;
const html = import.meta.glob("./html/*.html", { query: "?raw", import: "default" }) as Record<string, Loader>;
const css = import.meta.glob("./css/*.css") as Record<string, Loader>;

/** Renders a design screen at its clean URL (/library, /setlists, ...). Unknown paths show the 404 screen. */
export function ScreenRoute({ name: fixed }: { name?: string }) {
  const params = useParams();
  const wanted = fixed ?? params.name ?? "";
  const name = html[`./html/${wanted}.html`] ? wanted : "404";
  // Markup is stored with the screen it belongs to, so a navigation never briefly pairs one screen's wiring with another's HTML.
  const [loaded, setLoaded] = useState<{ name: string; html: string } | null>(null);
  const auth = useAuth();
  const lib = useLibrary();
  const nav = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    let live = true;
    Promise.all([html[`./html/${name}.html`](), css[`./css/${name}.css`]()]).then(([m]) => { if (live) setLoaded({ name, html: m as string }); });
    return () => { live = false; };
  }, [name]);

  useEffect(() => { // warm the most-used screens while idle
    const idle = window.requestIdleCallback ?? ((f: () => void) => setTimeout(f, 800));
    idle(() => ["dashboard", "library", "setlists", "song-detail"].forEach((n) => { html[`./html/${n}.html`]?.(); css[`./css/${n}.css`]?.(); }));
  }, []);

  if (wanted === "org-select") return <Navigate to={auth.signedIn ? "/dashboard" : "/login"} replace />; // single church for now
  if (wanted === "public") return <Navigate to="/library" replace />; // the library is already the public view
  if (!loaded || loaded.name !== name || (wire[name] && lib.status === "loading")) return <Loader />;
  const w = wire[name];
  return <ErrorBoundary key={name}><Screen key={name} cls={`pg-${name}`} html={loaded.html} hydrate={w && ((root, signal) => w(root, { auth, lib, nav, theme, backend: isBackendConfigured }, signal))} /></ErrorBoundary>;
}
