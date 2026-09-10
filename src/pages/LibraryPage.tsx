import { Link } from "react-router-dom";
import { songs } from "../data/store";

export function LibraryPage() {
  return (
    <div>
      <h1 className="hw-page-title">Song Library</h1>
      <p className="hw-page-subtitle">Chords, lyrics, and arrangements for your team.</p>

      {songs.map((song) => (
        <div className="hw-card" key={song.id}>
          <div className="hw-card-title">{song.title}</div>
          <div className="hw-card-meta">
            KEY {song.originalKey} · {song.bpm} BPM · {song.sections.length} SECTIONS
          </div>
          <Link className="hw-card-link" to={`/setlists/library/perform/${song.id}`}>
            Open chart →
          </Link>
        </div>
      ))}
    </div>
  );
}
