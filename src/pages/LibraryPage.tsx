import { useState } from "react";
import { Link } from "react-router-dom";
import { useLibrary } from "../context/LibraryContext";
import { useAuth } from "../context/AuthContext";

const BLANK = "{section: verse 1}\n[G]Lyric line goes here";

export function LibraryPage() {
  const { songs, addSong, updateSong, deleteSong, readOnly } = useLibrary();
  const isLead = useAuth().isLead && !readOnly;
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [key, setKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [body, setBody] = useState(BLANK);
  const [q, setQ] = useState("");

  const close = () => { setOpen(false); setEditId(null); setTitle(""); setKey(""); setBpm(""); setBody(BLANK); };
  const edit = (id: string) => {
    const s = songs.find((x) => x.id === id);
    if (!s) return;
    setEditId(id); setTitle(s.title); setKey(s.originalKey); setBpm(s.bpm ? String(s.bpm) : ""); setBody(s.source ?? BLANK); setOpen(true);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = { title, originalKey: key || "C", bpm: bpm ? Number(bpm) : undefined, body };
    if (editId) updateSong(editId, input); else addSong(input);
    close();
  };

  const shown = songs.filter((s) => s.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <h1 className="hw-page-title">Song Library</h1>
      <p className="hw-page-subtitle">Chords, lyrics, and arrangements for your team.</p>

      <div className="hw-form-row"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search songs" aria-label="Search songs" /></div>

      {shown.map((s) => (
        <div className="hw-card" key={s.id}>
          <div className="hw-card-title">{s.title}</div>
          <div className="hw-card-meta">KEY {s.originalKey} · {s.bpm ? `${s.bpm} BPM · ` : ""}{s.sections.length} SECTIONS</div>
          <div className="hw-row" style={{ marginTop: 12, justifyContent: "space-between" }}>
            <Link className="hw-card-link" style={{ margin: 0 }} to={`/setlists/library/perform/${s.id}`}>Open chart →</Link>
            {isLead && (
              <span className="hw-row">
                <button className="hw-mini" onClick={() => edit(s.id)}>edit</button>
                <button className="hw-mini" onClick={() => confirm(`Delete "${s.title}"? It will also leave any setlists.`) && deleteSong(s.id)}>delete</button>
              </span>
            )}
          </div>
        </div>
      ))}
      {!shown.length && <p className="hw-card-meta">No songs match.</p>}

      {isLead && !open && <button className="hw-btn-quiet" onClick={() => setOpen(true)}>+ Add a song</button>}
      {isLead && open && (
        <form className="hw-card" onSubmit={submit}>
          <div className="hw-card-title" style={{ marginBottom: 12 }}>{editId ? "Edit song" : "New song"}</div>
          <div className="hw-form-row"><label>TITLE</label><input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div className="hw-form-row-inline">
            <div className="hw-form-row"><label>KEY</label><input value={key} onChange={(e) => setKey(e.target.value)} placeholder="G" /></div>
            <div className="hw-form-row"><label>BPM</label><input type="number" value={bpm} onChange={(e) => setBpm(e.target.value)} placeholder="72" /></div>
          </div>
          <div className="hw-form-row"><label>CHORDS &amp; LYRICS · [G]word markers, {"{section: chorus}"}</label><textarea value={body} onChange={(e) => setBody(e.target.value)} spellCheck={false} required /></div>
          <div className="hw-row"><button className="hw-btn-primary">Save song</button><button type="button" className="hw-mini" onClick={close}>Cancel</button></div>
        </form>
      )}
    </div>
  );
}
