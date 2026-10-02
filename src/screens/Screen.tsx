import { useNavigate } from "react-router-dom";
import "./pg.css";

/** Renders one ported design screen; internal links navigate client-side. */
export function Screen({ cls, html }: { cls: string; html: string }) {
  const nav = useNavigate();
  return (
    <div
      className={`pg ${cls}`}
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={(e) => {
        const href = (e.target as HTMLElement).closest("a")?.getAttribute("href");
        if (href?.startsWith("/")) { e.preventDefault(); nav(href); }
      }}
    />
  );
}
