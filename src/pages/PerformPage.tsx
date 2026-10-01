import { Link, useNavigate, useParams } from "react-router-dom";
import { OnStageView } from "../components/OnStageView";
import { useLibrary } from "../context/LibraryContext";

/** Full-bleed performance screen — breaks out of the shell chrome for hands-free use. */
export function PerformPage() {
  const { getSetlistById, getSongById } = useLibrary();
  const { setlistId, songId } = useParams();
  const nav = useNavigate();
  const song = songId ? getSongById(songId) : undefined;
  // "library" = opened straight from the Library tab, not from a service.
  const setlist = setlistId && setlistId !== "library" ? getSetlistById(setlistId) : undefined;

  if (!song) {
    return (
      <div className="hw-card" style={{ margin: 24 }}>
        <div className="hw-card-title">Couldn't find that song.</div>
        <Link className="hw-card-link" to="/setlists">← Back to setlists</Link>
      </div>
    );
  }

  const entries = setlist?.entries ?? [];
  const i = entries.findIndex((e) => e.songId === songId);
  const go = (k: number) => nav(`/setlists/${setlistId}/perform/${entries[k].songId}`, { replace: true });

  return (
    <div className="hw-perform">
      <OnStageView
        key={song.id}
        song={song}
        baseKey={entries[i]?.keyOverride ?? setlist?.listKey}
        serviceTitle={setlist?.serviceTitle}
        position={i >= 0 ? { current: i + 1, total: entries.length } : undefined}
        onBack={() => nav(setlist ? "/setlists" : "/library")}
        onPrev={i > 0 ? () => go(i - 1) : undefined}
        onNext={i >= 0 && i < entries.length - 1 ? () => go(i + 1) : undefined}
      />
    </div>
  );
}
