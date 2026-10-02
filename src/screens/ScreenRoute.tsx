import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLibrary } from "../context/LibraryContext";
import { isBackendConfigured } from "../lib/supabase";
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
  const [markup, setMarkup] = useState<string | null>(null);
  const auth = useAuth();
  const lib = useLibrary();
  const nav = useNavigate();

  useEffect(() => {
    setMarkup(null);
    Promise.all([html[`./html/${name}.html`](), css[`./css/${name}.css`]()]).then(([m]) => setMarkup(m as string));
  }, [name]);

  useEffect(() => { // warm the most-used screens while idle
    const idle = window.requestIdleCallback ?? ((f: () => void) => setTimeout(f, 800));
    idle(() => ["dashboard", "library", "setlists", "song-detail"].forEach((n) => { html[`./html/${n}.html`]?.(); css[`./css/${n}.css`]?.(); }));
  }, []);

  if (markup === null || (wire[name] && lib.status === "loading")) return <div role="status" style={{ padding: 24, color: "#777670" }}>Loading…</div>;
  const w = wire[name];
  return <Screen cls={`pg-${name}`} html={markup} hydrate={w && ((root, signal) => w(root, { auth, lib, nav, backend: isBackendConfigured }, signal))} />;
}
