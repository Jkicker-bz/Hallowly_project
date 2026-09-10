import { useState } from "react";
import { Link } from "react-router-dom";
import { useLibrary } from "../context/LibraryContext";
import { useAuth } from "../context/AuthContext";

function AddSongToSetlistRow({ setlistId }: { setlistId: string }) {
  const { songs, setlists, addSongToSetlist } = useLibrary();
  const setlist = setlists.find((s) => s.id === setlistId)!;
  const available = songs.filter((s) => !setlist.entries.some((e) => e.songId === s.id));
  const [selected, setSelected] = useState(available[0]?.id ?? "");

  if (available.length === 0) {
    return <p className="hw-card-meta">Every library song is already in this setlist.</p>;
  }

  return (
    <div className="hw-form-row-inline" style={{ marginTop: 12, alignItems: "flex-end" }}>
      <div className="hw-form-row" style={{ marginBottom: 0 }}>
        <label htmlFor={`add-${setlistId}`}>ADD FROM LIBRARY</label>
        <select id={`add-${setlistId}`} value={selected} onChange={(e) => setSelected(e.target.value)}>
          {available.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className="hw-btn-primary"
        onClick={() => selected && addSongToSetlist(setlistId, { songId: selected })}
      >
        Add
      </button>
    </div>
  );
}

function NewSetlistForm({ onDone }: { onDone: () => void }) {
  const { addSetlist } = useLibrary();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    addSetlist({ serviceTitle: title, serviceDate: date });
    onDone();
  };

  return (
    <form className="hw-card" onSubmit={handleSubmit}>
      <div className="hw-card-title" style={{ marginBottom: 12 }}>
        New setlist
      </div>
      <div className="hw-form-row">
        <label htmlFor="setlist-title">SERVICE NAME</label>
        <input
          id="setlist-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Sunday Service"
          required
        />
      </div>
      <div className="hw-form-row">
        <label htmlFor="setlist-date">DATE</label>
        <input id="setlist-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="hw-btn-primary">
          Create setlist
        </button>
        <button type="button" className="hw-btn-quiet" style={{ width: "auto" }} onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function SetlistsPage() {
  const { setlists, getSongById, removeSongFromSetlist } = useLibrary();
  const { isLead } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div>
      <h1 className="hw-page-title">Setlists</h1>
      <p className="hw-page-subtitle">Upcoming services and what's in them.</p>

      {setlists.map((setlist) => (
        <div className="hw-card" key={setlist.id}>
          <div className="hw-card-title">{setlist.serviceTitle}</div>
          <div className="hw-card-meta">
            {new Date(setlist.serviceDate + "T00:00:00").toLocaleDateString(undefined, {
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
                <div key={entry.songId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Link
                    className="hw-card-link"
                    style={{ margin: 0, flex: 1 }}
                    to={`/setlists/${setlist.id}/perform/${s.id}`}
                  >
                    {i + 1}. {s.title} — key {entry.keyOverride ?? s.originalKey}
                    {entry.keyOverride ? ` (from ${s.originalKey})` : ""}
                  </Link>
                  {isLead && (
                    <button
                      type="button"
                      onClick={() => removeSongFromSetlist(setlist.id, s.id)}
                      aria-label={`Remove ${s.title}`}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--hw-silver-dim)",
                        cursor: "pointer",
                        fontFamily: "var(--hw-font-mono)",
                        fontSize: 11,
                      }}
                    >
                      remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {isLead && <AddSongToSetlistRow setlistId={setlist.id} />}
        </div>
      ))}

      {isLead && !isCreating && (
        <button className="hw-btn-quiet" onClick={() => setIsCreating(true)}>
          + New setlist
        </button>
      )}
      {isLead && isCreating && <NewSetlistForm onDone={() => setIsCreating(false)} />}
    </div>
  );
}
