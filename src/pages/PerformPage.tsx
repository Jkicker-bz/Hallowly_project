import { Link, useParams } from "react-router-dom";
import { OnStageView } from "../components/OnStageView";
import { useLibrary } from "../context/LibraryContext";

/** Full-bleed performance screen — deliberately ignores the app shell's tab bar/header. */
export function PerformPage() {
  const { getSetlistById, getSongById } = useLibrary();
  const { setlistId, songId } = useParams<{ setlistId: string; songId: string }>();
  const song = songId ? getSongById(songId) : undefined;
  // "library" is a synthetic setlistId used when opening a chart straight
  // from the Library tab rather than from an actual scheduled service.
  const setlist = setlistId && setlistId !== "library" ? getSetlistById(setlistId) : undefined;

  const position = setlist
    ? {
        current: setlist.entries.findIndex((e) => e.songId === songId) + 1,
        total: setlist.entries.length,
      }
    : { current: 1, total: 1 };

  if (!song) {
    return (
      <div style={{ padding: 40, color: "#FDFDFD" }}>
        <p>Couldn't find that song.</p>
        <Link to="/setlists">← Back to setlists</Link>
      </div>
    );
  }

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
      <OnStageView song={song} setlistPosition={position} />
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
