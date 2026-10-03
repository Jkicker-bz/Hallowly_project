import { useEffect, useState } from "react";
import { ScreenRoute } from "../screens/ScreenRoute";
import { PerformPage } from "./PerformPage";

const DESKTOP = "(min-width: 900px)";

/** /song/:id — the designed song page on desktop, the full-screen chord viewer on phones. */
export function SongRoute() {
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP).matches);
  useEffect(() => {
    const m = window.matchMedia(DESKTOP), f = () => setDesktop(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return desktop ? <ScreenRoute name="song-detail" /> : <PerformPage />;
}
