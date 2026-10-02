// Songs, setlists and roster — persisted to localStorage so nothing is lost on refresh.
// Swap the internals for API calls later; consumers only use these functions.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { parseSongBody } from "../lib/chordpro";
import { parseChordSheet } from "../lib/chordsheet";
import type { Setlist, SetlistEntry, Song } from "../types/song";
import type { TeamMember } from "../types/user";
import { archiveList, archiveSong, fetchAll, fetchChart, pushList, pushSong } from "../lib/remote";
import { isBackendConfigured } from "../lib/supabase";
import { songs as seedSongs, setlists as seedSetlists } from "../data/store";

export interface SongInput { title: string; originalKey: string; bpm?: number; body: string; artist?: string; style?: string; sheet?: string }
export interface SetlistInput { serviceTitle: string; serviceDate: string; eventType?: string; note?: string; entries?: SetlistEntry[]; crew?: Setlist["crew"] }

interface Saved { songs: Song[]; setlists: Setlist[]; members: TeamMember[] }

const SEED_MEMBERS: TeamMember[] = [
  { id: "m-1", name: "Jordan", instrument: "Vocals" },
  { id: "m-2", name: "Sam", instrument: "Keys" },
  { id: "m-3", name: "Ria", instrument: "Vocals" },
  { id: "m-4", name: "Dee", instrument: "Drums" },
];
const KEY = "hallowly:library:v1";
const CACHE = "hallowly:remote-cache:v1";
function cached(): Saved | null {
  try { const r = localStorage.getItem(CACHE); return r ? JSON.parse(r) : null; } catch { return null; }
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through to seed */ }
  return {
    songs: seedSongs,
    setlists: seedSetlists.map((s) => ({ ...s, crew: [{ memberId: "m-2", role: "Keys" }] })),
    members: SEED_MEMBERS,
  };
}

let counter = Date.now();
const uid = (p: string) => (isBackendConfigured ? crypto.randomUUID() : `${p}-${(counter++).toString(36)}`);
const mkSong = (i: SongInput, id: string): Song => ({
  id,
  title: i.title.trim(),
  originalKey: i.originalKey.trim() || "C",
  bpm: i.bpm,
  artist: i.artist?.trim() || undefined,
  style: i.style,
  source: i.body,
  sections: i.sheet !== undefined ? parseChordSheet(i.sheet) : parseSongBody(i.body),
});

interface Ctx {
  songs: Song[]; setlists: Setlist[]; members: TeamMember[];
  status: "loading" | "ready" | "error";
  /** True when data comes from the live database (writes arrive with login). */
  readOnly: boolean;
  /** Downloads a song's chart on demand (no-op once loaded). */
  ensureChart: (id: string) => void;
  getSongById: (id: string) => Song | undefined;
  getSetlistById: (id: string) => Setlist | undefined;
  addSong: (i: SongInput) => string;
  updateSong: (id: string, i: SongInput) => void;
  deleteSong: (id: string) => void;
  addSetlist: (i: SetlistInput) => void;
  updateSetlist: (id: string, p: Partial<Pick<Setlist, "note" | "listKey">>) => void;
  setEntrySection: (setlistId: string, songId: string, section: string) => void;
  deleteSetlist: (id: string) => void;
  addSongToSetlist: (setlistId: string, e: SetlistEntry) => void;
  removeSongFromSetlist: (setlistId: string, songId: string) => void;
  setEntryKey: (setlistId: string, songId: string, key?: string) => void;
  moveEntry: (setlistId: string, songId: string, dir: -1 | 1) => void;
  addMember: (name: string, instrument: string) => void;
  removeMember: (id: string) => void;
  assign: (setlistId: string, memberId: string, role: string) => void;
  unassign: (setlistId: string, memberId: string) => void;
}
const LibraryContext = createContext<Ctx | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Saved>(() => (isBackendConfigured ? cached() ?? { songs: [], setlists: [], members: [] } : load()));
  const [status, setStatus] = useState<"loading" | "ready" | "error">(isBackendConfigured && !cached() ? "loading" : "ready");
  useEffect(() => {
    if (isBackendConfigured) return;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
  }, [data]);
  useEffect(() => {
    if (!isBackendConfigured) return;
    // Show the cached copy instantly, refresh in the background (keeping charts already downloaded).
    fetchAll()
      .then((d) => {
        setData((prev) => ({ ...d, songs: d.songs.map((n) => { const p = prev.songs.find((x) => x.id === n.id); return p?.loaded ? { ...n, sections: p.sections, source: p.source, loaded: true } : n; }) }));
        setStatus("ready");
      })
      .catch(() => setStatus((s) => (s === "ready" ? s : "error")));
  }, []);
  useEffect(() => {
    if (isBackendConfigured && status === "ready") try { localStorage.setItem(CACHE, JSON.stringify(data)); } catch { /* quota */ }
  }, [data, status]);

  const inflight = useRef(new Set<string>());
  const fresh = useRef(new Set<string>()); // charts re-checked this session
  const ensureChart = (id: string) => {
    const s = data.songs.find((x) => x.id === id);
    if (!isBackendConfigured || !s || inflight.current.has(id) || (s.loaded !== false && fresh.current.has(id))) return;
    inflight.current.add(id);
    fetchChart(id)
      .then((c) => { fresh.current.add(id); setData((d) => ({ ...d, songs: d.songs.map((x) => (x.id === id ? { ...x, ...c, loaded: true } : x)) })); })
      .catch(() => { if (s.loaded === false) setStatus("error"); })
      .finally(() => inflight.current.delete(id));
  };

  const lists = (id: string, fn: (s: Setlist) => Setlist) => {
    const cur = data.setlists.find((s) => s.id === id);
    if (!cur) return;
    const next = fn(cur);
    setData((d) => ({ ...d, setlists: d.setlists.map((s) => (s.id === id ? next : s)) }));
    if (isBackendConfigured) pushList(next).catch(() => setStatus("error"));
  };

  const value: Ctx = {
    status,
    ensureChart,
    readOnly: isBackendConfigured,
    songs: data.songs,
    members: data.members,
    setlists: [...data.setlists].sort((a, b) => a.serviceDate.localeCompare(b.serviceDate)),
    getSongById: (id) => data.songs.find((s) => s.id === id),
    getSetlistById: (id) => data.setlists.find((s) => s.id === id),
    addSong: (i) => {
      const song = mkSong(i, uid("song"));
      setData((d) => ({ ...d, songs: [...d.songs, song] }));
      if (isBackendConfigured) pushSong(song).catch(() => setStatus("error"));
      return song.id;
    },
    updateSong: (id, i) => {
      const prev = data.songs.find((s) => s.id === id);
      const song = mkSong({ artist: prev?.artist, style: prev?.style, ...i }, id);
      setData((d) => ({ ...d, songs: d.songs.map((s) => (s.id === id ? song : s)) }));
      if (isBackendConfigured) pushSong(song).catch(() => setStatus("error"));
    },
    deleteSong: (id) => {
      if (isBackendConfigured) archiveSong(id).catch(() => setStatus("error"));
      setData((d) => ({
        ...d,
        songs: d.songs.filter((s) => s.id !== id),
        setlists: d.setlists.map((s) => ({ ...s, entries: s.entries.filter((e) => e.songId !== id) })),
      }));
    },
    addSetlist: (i) => {
      const sl: Setlist = { id: uid("setlist"), serviceTitle: i.serviceTitle.trim() || "Service", serviceDate: i.serviceDate, eventType: i.eventType, note: i.note, entries: i.entries ?? [], crew: i.crew ?? [] };
      setData((d) => ({ ...d, setlists: [...d.setlists, sl] }));
      if (isBackendConfigured) pushList(sl).catch(() => setStatus("error"));
    },
    updateSetlist: (id, p) => lists(id, (s) => ({ ...s, ...p })),
    setEntrySection: (id, songId, section) =>
      lists(id, (s) => ({ ...s, entries: s.entries.map((e) => (e.songId === songId ? { ...e, section: section || undefined } : e)) })),
    deleteSetlist: (id) => {
      setData((d) => ({ ...d, setlists: d.setlists.filter((s) => s.id !== id) }));
      if (isBackendConfigured) archiveList(id).catch(() => setStatus("error"));
    },
    addSongToSetlist: (id, e) => lists(id, (s) => ({ ...s, entries: [...s.entries.filter((x) => x.songId !== e.songId), e] })),
    removeSongFromSetlist: (id, songId) => lists(id, (s) => ({ ...s, entries: s.entries.filter((e) => e.songId !== songId) })),
    setEntryKey: (id, songId, key) =>
      lists(id, (s) => ({ ...s, entries: s.entries.map((e) => (e.songId === songId ? { ...e, keyOverride: key || undefined } : e)) })),
    moveEntry: (id, songId, dir) =>
      lists(id, (s) => {
        const a = [...s.entries];
        const i = a.findIndex((e) => e.songId === songId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= a.length) return s;
        [a[i], a[j]] = [a[j], a[i]];
        return { ...s, entries: a };
      }),
    addMember: (name, instrument) =>
      setData((d) => ({ ...d, members: [...d.members, { id: uid("m"), name: name.trim(), instrument: instrument.trim() || "Vocals" }] })),
    removeMember: (id) =>
      setData((d) => ({
        ...d,
        members: d.members.filter((m) => m.id !== id),
        setlists: d.setlists.map((s) => ({ ...s, crew: (s.crew ?? []).filter((c) => c.memberId !== id) })),
      })),
    assign: (id, memberId, role) =>
      lists(id, (s) => ({ ...s, crew: [...(s.crew ?? []).filter((c) => c.memberId !== memberId), { memberId, role }] })),
    unassign: (id, memberId) => lists(id, (s) => ({ ...s, crew: (s.crew ?? []).filter((c) => c.memberId !== memberId) })),
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): Ctx {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside <LibraryProvider>");
  return ctx;
}
