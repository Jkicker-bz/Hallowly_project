import { Link } from "react-router-dom";
import { setlists, getSongById } from "../data/store";

export function SetlistsPage() {
  return (
    <div>
      <h1 className="hw-page-title">Setlists</h1>
      <p className="hw-page-subtitle">Upcoming services and what's in them.</p>

      {setlists.map((setlist) => (
        <div className="hw-card" key={setlist.id}>
          <div className="hw-card-title">{setlist.serviceTitle}</div>
          <div className="hw-card-meta">
            {new Date(setlist.serviceDate).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            }).toUpperCase()}{" "}
            · {setlist.entries.length} SONGS
          </div>

          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {setlist.entries.map((entry, i) => {
              const s = getSongById(entry.songId);
              if (!s) return null;
              return (
                <Link
                  key={entry.songId}
                  className="hw-card-link"
                  style={{ margin: 0 }}
                  to={`/setlists/${setlist.id}/perform/${s.id}`}
                >
                  {i + 1}. {s.title} — key {entry.keyOverride ?? s.originalKey}
                  {entry.keyOverride ? ` (from ${s.originalKey})` : ""}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
