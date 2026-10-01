import { useState } from "react";
import { RequireLead } from "../components/layout/RequireLead";
import { useAuth } from "../context/AuthContext";
import { useLibrary } from "../context/LibraryContext";

function Crew({ id }: { id: string }) {
  const { members, getSetlistById, assign, unassign } = useLibrary();
  const crew = getSetlistById(id)?.crew ?? [];
  const free = members.filter((m) => !crew.some((c) => c.memberId === m.id));
  const [sel, setSel] = useState("");
  const pick = free.find((m) => m.id === sel) ?? free[0];
  return (
    <div style={{ marginTop: 12 }}>
      {crew.map((c) => (
        <span className="hw-chip" key={c.memberId}>
          {members.find((m) => m.id === c.memberId)?.name} · {c.role}
          <button aria-label="Unassign" onClick={() => unassign(id, c.memberId)}>✕</button>
        </span>
      ))}
      {pick && (
        <div className="hw-row">
          <select className="hw-mini" style={{ padding: 9 }} value={pick.id} onChange={(e) => setSel(e.target.value)}>
            {free.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.instrument})</option>)}
          </select>
          <button className="hw-mini" onClick={() => assign(id, pick.id, pick.instrument)}>assign</button>
        </div>
      )}
    </div>
  );
}

export function TeamPage() {
  const { team } = useAuth();
  const { members, setlists, addMember, removeMember } = useLibrary();
  const [name, setName] = useState("");
  const [inst, setInst] = useState("");

  return (
    <RequireLead>
      <h1 className="hw-page-title">{team?.name}</h1>
      <p className="hw-page-subtitle">Roster and who's serving when.</p>

      <div className="hw-card">
        <div className="hw-card-title" style={{ marginBottom: 10 }}>Roster</div>
        {members.map((m) => (
          <span className="hw-chip" key={m.id}>
            {m.name} · {m.instrument}
            <button aria-label={`Remove ${m.name}`} onClick={() => confirm(`Remove ${m.name}?`) && removeMember(m.id)}>✕</button>
          </span>
        ))}
        <form className="hw-row" style={{ marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); if (name.trim()) { addMember(name, inst); setName(""); setInst(""); } }}>
          <input className="hw-mini" style={{ flex: 1, padding: 9 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name" />
          <input className="hw-mini" style={{ flex: 1, padding: 9 }} value={inst} onChange={(e) => setInst(e.target.value)} placeholder="Instrument" aria-label="Instrument" />
          <button className="hw-mini">add</button>
        </form>
      </div>

      {setlists.map((s) => (
        <div className="hw-card" key={s.id}>
          <div className="hw-card-title">{s.serviceTitle}</div>
          <div className="hw-card-meta">{s.serviceDate} · SERVING</div>
          <Crew id={s.id} />
        </div>
      ))}
    </RequireLead>
  );
}
