import { useState } from "react";
import { Link } from "react-router-dom";
import { useLibrary } from "../context/LibraryContext";
import { useAuth } from "../context/AuthContext";

export function LibraryPage() {
  const { songs, addSong } = useLibrary();
  const { isLead } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [key, setKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [body, setBody] = useState("{section: verse 1}\n[G]Lyric line goes here");

  const resetForm = () => {
    setTitle("");
    setKey("");
    setBpm("");
    setBody("{section: verse 1}\n[G]Lyric line goes here");
    setIsAdding(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    addSong({
      title,
      originalKey: key || "C",
      bpm: bpm ? Number(bpm) : undefined,
      body,
    });
    resetForm();
  };

  return (
    <div>
      <h1 className="hw-page-title">Song Library</h1>
      <p className="hw-page-subtitle">Chords, lyrics, and arrangements for your team.</p>

      {songs.map((song) => (
        <div className="hw-card" key={song.id}>
          <div className="hw-card-title">{song.title}</div>
          <div className="hw-card-meta">
            KEY {song.originalKey} · {song.bpm ? `${song.bpm} BPM · ` : ""}
            {song.sections.length} SECTIONS
          </div>
          <Link className="hw-card-link" to={`/setlists/library/perform/${song.id}`}>
            Open chart →
          </Link>
        </div>
      ))}

      {isLead && !isAdding && (
        <button className="hw-btn-quiet" onClick={() => setIsAdding(true)}>
          + Add a song
        </button>
      )}

      {isLead && isAdding && (
        <form className="hw-card" onSubmit={handleSubmit}>
          <div className="hw-card-title" style={{ marginBottom: 12 }}>
            New song
          </div>

          <div className="hw-form-row">
            <label htmlFor="song-title">TITLE</label>
            <input
              id="song-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Boundless Grace"
              required
            />
          </div>

          <div className="hw-form-row-inline">
            <div className="hw-form-row">
              <label htmlFor="song-key">KEY</label>
              <input id="song-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="G" />
            </div>
            <div className="hw-form-row">
              <label htmlFor="song-bpm">BPM</label>
              <input
                id="song-bpm"
                type="number"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                placeholder="72"
              />
            </div>
          </div>

          <div className="hw-form-row">
            <label htmlFor="song-body">CHORDS &amp; LYRICS</label>
            <textarea
              id="song-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              spellCheck={false}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="hw-btn-primary">
              Save song
            </button>
            <button
              type="button"
              className="hw-btn-quiet"
              style={{ width: "auto" }}
              onClick={resetForm}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
