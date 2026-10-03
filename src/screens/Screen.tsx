import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./pg.css";

/** Renders one ported design screen; internal links navigate client-side. */
export function Screen({ cls, html, hydrate }: { cls: string; html: string; hydrate?: (root: HTMLElement, signal: AbortSignal) => void }) {
  const nav = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  // Re-runs on every render so wired screens follow live data; listeners are torn down each time.
  useEffect(() => {
    if (!hydrate || !ref.current) return;
    const ac = new AbortController();
    try { hydrate(ref.current, ac.signal); } catch (e) { console.error("Screen wiring failed", e); }
    return () => ac.abort();
  });
  return (
    <div
      ref={ref}
      className={`pg ${cls}`}
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={(e) => {
        const href = (e.target as HTMLElement).closest("a")?.getAttribute("href");
        if (href?.startsWith("/")) { e.preventDefault(); nav(href); }
      }}
    />
  );
}
