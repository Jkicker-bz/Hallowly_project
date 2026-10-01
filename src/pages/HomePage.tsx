import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLibrary } from "../context/LibraryContext";

export function HomePage() {
  const { user, isLead } = useAuth();
  const { setlists, songs, members } = useLibrary();
  const today = new Date().toISOString().slice(0, 10);
  const next = setlists.find((s) => s.serviceDate >= today) ?? setlists[setlists.length - 1];
  const me = members.find((m) => m.name === user?.name);
  const myRole = next?.crew?.find((c) => c.memberId === me?.id)?.role;

  return (
    <div>
      <h1 className="hw-page-title">{isLead ? "Welcome back, Lead." : `Welcome, ${user?.name}.`}</h1>
      <p className="hw-page-subtitle">
        {isLead ? `${songs.length} songs · ${members.length} on the team` : myRole ? `You're serving on ${myRole}.` : "Your part is ready whenever you are."}
      </p>

      {next ? (
        <div className="hw-card">
          <div className="hw-card-title">Next: {next.serviceTitle}</div>
          <div className="hw-card-meta">{next.serviceDate} · {next.entries.length} SONGS</div>
          {next.entries[0] && (
            <Link className="hw-card-link" to={`/setlists/${next.id}/perform/${next.entries[0].songId}`}>Start from the top →</Link>
          )}
        </div>
      ) : (
        <div className="hw-card"><div className="hw-card-title">No services planned yet</div></div>
      )}
    </div>
  );
}
