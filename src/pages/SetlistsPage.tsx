import { Link } from "react-router-dom";
import { sampleSong } from "../data/sampleSong";

export function SetlistsPage() {
  return (
    <div>
      <h1 className="hw-page-title">Setlists</h1>
      <p className="hw-page-subtitle">Upcoming services and what's in them.</p>

      <div className="hw-card">
        <div className="hw-card-title">Sunday Service — Sep 14</div>
        <div className="hw-card-meta">6 SONGS · OPENS 9:00 AM</div>
        <Link className="hw-card-link" to={`/setlists/demo/perform/${sampleSong.id}`}>
          Open performance view →
        </Link>
      </div>
    </div>
  );
}
