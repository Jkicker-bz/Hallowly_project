import { useState } from "react";
import { Link } from "react-router-dom";
import { useLibrary } from "../context/LibraryContext";
import { useAuth } from "../context/AuthContext";
import { KEYS } from "../lib/transpose";

function AddRow({ id }: { id: string }) {
  const { songs, setlists, addSongToSetlist } = useLibrary();
  const [sel, setSel] = useState("");
  const inList = setlists.find((s) => s.id === id)?.entries.map((e) => e.songId) ?? [];
  const avail = songs.filter((s) => !inList.includes(s.id));
  if (!avail.length) return <p className="hw-card-meta" style={{ marginTop: 12 }}>Every library song is in this setlist.</p>;
  const pick = avail.find((s) => s.id === sel)?.id ?? avail[0].id;
  return (
    <div className="hw-row" style={{ marginTop: 14 }}>
      <select className="hw-mini" style={{ flex: 1, padding: 9 }} value={pick} onChange={(e) => setSel(e.target.value)}>
        {avail.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
      </select>
      <button className="hw-btn-primary" onClick={() => addSongToSetlist(id, { songId: pick })}>Add song</button>
    </div>
  );
}

function NewSetlist({ onDone }: { onDone: () => void }) {
  const { addSetlist } = useLibrary();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  return (
    <form className="hw-card" onSubmit={(e) => { e.preventDefault(); addSetlist({ serviceTitle: title, serviceDate: date }); onDone(); }}>
      <div className="hw-card-title" style={{ marginBottom: 12 }}>New setlist</div>
      <div className="hw-form-row"><label>SERVICE NAME</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sunday Service" required /></div>
      <div className="hw-form-row"><label>DATE</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
      <div className="hw-row"><button className="hw-btn-primary">Create</button><button type="button" className="hw-mini" onClick={onDone}>Cancel</button></div>
    </form>
  );
}

export function SetlistsPage() {
  const { setlists, getSongById, removeSongFromSetlist, setEntryKey, moveEntry, deleteSetlist, updateSetlist, setEntrySection, readOnly } = useLibrary();
  const isLead = useAuth().isLead && !readOnly;
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <h1 className="hw-page-title">Setlists</h1>
      <p className="hw-page-subtitle">Upcoming services and what's in them.</p>

      {setlists.map((sl) => (
        <div className="hw-card" key={sl.id}>
          <div className="hw-row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="hw-card-title">{sl.serviceTitle}</div>
              <div className="hw-card-meta">
                {new Date(sl.serviceDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }).toUpperCase()} · {sl.entries.length} SONGS
              </div>
            </div>
            {isLead && <button className="hw-mini" onClick={() => confirm(`Delete "${sl.serviceTitle}"?`) && deleteSetlist(sl.id)}>delete</button>}
          </div>

          {sl.note && <p className="hw-card-meta" style={{ marginTop: 10 }}>{sl.note}</p>}
          {isLead && (
            <div className="hw-row" style={{ marginTop: 10 }}>
              <select className="hw-mini" value={sl.listKey ?? ""} onChange={(e) => updateSetlist(sl.id, { listKey: e.target.value || undefined })} aria-label="Key for the whole set">
                <option value="">set key: per song</option>
                {KEYS.map((k) => <option key={k} value={k}>set key: {k}</option>)}
              </select>
            </div>
          )}
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            {sl.entries.map((en, i) => {
              const s = getSongById(en.songId);
              if (!s) return null;
              return (
                <div key={en.songId}>
                  {en.section && <div className="hw-card-meta" style={{ marginBottom: 2 }}>{en.section.toUpperCase()}</div>}
                  <Link className="hw-card-link" style={{ margin: 0 }} to={`/setlists/${sl.id}/perform/${s.id}`}>
                    {i + 1}. {s.title} · {en.keyOverride ?? sl.listKey ?? s.originalKey}
                  </Link>
                  {isLead && (
                    <div className="hw-row" style={{ marginTop: 6 }}>
                      <select className="hw-mini" value={en.keyOverride ?? ""} onChange={(e) => setEntryKey(sl.id, s.id, e.target.value)} aria-label="Key for this service">
                        <option value="">key: {s.originalKey}</option>
                        {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                      <select className="hw-mini" value={en.section ?? ""} onChange={(e) => setEntrySection(sl.id, s.id, e.target.value)} aria-label="Section">
                        <option value="">section</option>
                        {["Praise", "Worship", "Offering", "Set"].map((x) => <option key={x}>{x}</option>)}
                      </select>
                      <button className="hw-mini" onClick={() => moveEntry(sl.id, s.id, -1)} aria-label="Move up">↑</button>
                      <button className="hw-mini" onClick={() => moveEntry(sl.id, s.id, 1)} aria-label="Move down">↓</button>
                      <button className="hw-mini" onClick={() => removeSongFromSetlist(sl.id, s.id)}>remove</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {isLead && <AddRow id={sl.id} />}
        </div>
      ))}

      {isLead && !creating && <button className="hw-btn-quiet" onClick={() => setCreating(true)}>+ New setlist</button>}
      {isLead && creating && <NewSetlist onDone={() => setCreating(false)} />}
    </div>
  );
}
