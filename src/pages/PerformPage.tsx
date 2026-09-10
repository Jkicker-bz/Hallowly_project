import { Link } from "react-router-dom";
import { OnStageView } from "../components/OnStageView";
import { sampleSong } from "../data/sampleSong";

/** Full-bleed performance screen — deliberately ignores the app shell's tab bar/header. */
export function PerformPage() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "#0a0a0a",
        zIndex: 100,
      }}
    >
      <OnStageView song={sampleSong} setlistPosition={{ current: 3, total: 6 }} />
      <Link
        to="/setlists"
        style={{
          fontFamily: "Montserrat, sans-serif",
          fontSize: 12,
          color: "#7d8383",
          textDecoration: "none",
        }}
      >
        ← Back to setlist
      </Link>
    </div>
  );
}
