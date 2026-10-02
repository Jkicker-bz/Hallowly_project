import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLibrary } from "../context/LibraryContext";

export function HomePage() {
  const { user, isLead, team } = useAuth();
  const { setlists, songs, members, getSongById } = useLibrary();
  const today = new Date().toISOString().slice(0, 10);
  const next = setlists.find((s) => s.serviceDate >= today) ?? setlists[setlists.length - 1];
  const h = new Date().getHours();
  const greet = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const first = user?.name.split(" ")[0];
  const days = next ? Math.ceil((new Date(next.serviceDate + "T00:00:00").getTime() - Date.now()) / 864e5) : 0;

  return (
    <div>
      <p className="hw-eyebrow" style={{ marginBottom: 12 }}>{team?.name ?? "Hallowly"}</p>
      <h1 className="hw-page-title">{greet}{first && <>, <em>{first}</em></>}.</h1>
      <p className="hw-page-subtitle">
        {!next ? "No service planned yet." : days > 0 ? `${next.entries.length} songs in the next set. ${days} ${days === 1 ? "day" : "days"} away.` : `${next.entries.length} songs in today's set.`}
      </p>

      {isLead && (
        <div className="hw-stats">
          {([["Songs", songs.length], ["Sets", setlists.length], ["Team", members.length]] as const).map(([l, n]) => (
            <div className="hw-card hw-stat" key={l}><span className="hw-eyebrow">{l}</span><b>{n}</b></div>
          ))}
        </div>
      )}

      {next && (
        <div className="hw-card">
          <span className="hw-eyebrow">Next service</span>
          <div className="hw-card-title" style={{ margin: "8px 0 2px", fontSize: 16 }}>{next.serviceTitle}</div>
          <div className="hw-card-meta" style={{ marginBottom: 10 }}>
            {new Date(next.serviceDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}
          </div>
          {next.entries.map((en, i) => {
            const s = getSongById(en.songId);
            if (!s) return null;
            return (
              <Link key={en.songId} className="hw-songrow" to={`/setlists/${next.id}/perform/${s.id}`}>
                <span className="hw-num">{String(i + 1).padStart(2, "0")}</span>
                <span><b>{s.title}</b><small>{s.artist}</small></span>
                <span className="hw-key">{en.keyOverride ?? next.listKey ?? s.originalKey}</span>
              </Link>
            );
          })}
          {next.note && <p className="hw-card-meta" style={{ marginTop: 12 }}>{next.note}</p>}
        </div>
      )}

      {!user && <Link className="hw-btn-quiet" style={{ display: "block", textDecoration: "none" }} to="/login">Team sign in</Link>}
    </div>
  );
}
