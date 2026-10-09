// Maps the Supabase data (songs, lists, leads) onto the shapes the Figma design expects.
// Nothing here is invented: no set lists in the database means no set lists on screen.
import { useMemo } from "react";
import { useLibrary } from "../context/LibraryContext";
import { isBackendConfigured } from "../lib/supabase";
import type { Setlist, Song } from "../types/song";
import type { TeamMember } from "../types/user";

const COLORS = ["#9b59b6", "#1abc9c", "#e67e22", "#4878a8", "#a0815e"];
const AVATARS = ["violet", "auburn", "teal", "blue", "gold"];
const ini = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const mon = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en", { month: "short", day: "2-digit" }).toUpperCase().replace(".", "");

interface Lib { songs: Song[]; setlists: Setlist[]; members: TeamMember[]; getSongById: (id: string) => Song | undefined }

export function buildLive(lib: Lib, today = new Date().toISOString().slice(0, 10)) {
  const leader = (id?: string) => { const m = lib.members.find((x) => x.id === id); return m ? ini(m.name) : "—"; };
  const asSong = (s: Song, key?: string, section = "") => ({
    id: s.id, title: s.title, detail: `${key ?? s.originalKey}${s.bpm ? ` · ${s.bpm} BPM` : ""}${s.artist ? ` · ${s.artist}` : ""}`,
    leader: leader(s.leads?.[0]?.leadId), notes: "", section,
  });
  const setLists = lib.setlists.map((sl, i) => ({
    id: sl.id, iso: sl.serviceDate, title: sl.serviceTitle, date: mon(sl.serviceDate), time: "", location: sl.eventType ?? "",
    color: COLORS[i % COLORS.length], status: (sl.entries.length ? "Ready" : "Draft") as "Ready" | "Planning" | "Draft",
    songs: sl.entries.flatMap((e) => { const s = lib.getSongById(e.songId); return s ? [asSong(s, e.keyOverride ?? sl.listKey, e.section ?? "")] : []; }),
    note: sl.note ?? "", comments: [] as string[],
  }));
  const next = setLists.find((s) => s.iso >= today) ?? setLists[setLists.length - 1];
  const uses = (id: string) => lib.setlists.filter((l) => l.entries.some((e) => e.songId === id)).length;
  return {
    /** The songs of the next service (the design's "service set"); empty until a set list exists. */
    songs: next?.songs ?? [],
    // the design offers these when adding songs to a set: the whole catalog
    additionalSongs: lib.songs.map((s) => asSong(s)),
    team: lib.members.map((m, i) => ({ name: m.name, role: m.instrument, initials: ini(m.name), status: "Confirmed", color: AVATARS[i % AVATARS.length] })),
    setLists,
    /** The shared catalog: [title, artist, key, style, times used by this church]. */
    librarySongs: lib.songs.map((s) => [s.title, s.artist ?? "", s.originalKey, s.style ?? "Contemporary", String(uses(s.id))]),
    // Services, rehearsals and messages have no tables yet, so nothing is shown rather than sample data.
    events: {} as Record<number, never>,
    rehearsals: {} as Record<number, never>,
  };
}

export function useLiveData() {
  const lib = useLibrary();
  return useMemo(() => (isBackendConfigured ? buildLive(lib) : null), [lib]);
}

/** The next Sunday on or after today, as YYYY-MM-DD (the design doesn't ask for a date; the database needs one). */
export function nextSunday(from = new Date()) {
  const d = new Date(from); d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Turns a set list as shown in the design back into what the database stores. */
export function recordToInput(rec: { title: string; iso?: string; note?: string; location?: string; songs: { id?: string; title: string; detail: string; section?: string }[] }, songs: Song[]) {
  const entries = rec.songs.flatMap((x) => {
    const song = (x.id ? songs.find((s) => s.id === x.id) : undefined) ?? songs.find((s) => s.title === x.title && x.detail.endsWith(s.artist ?? "~")) ?? songs.find((s) => s.title === x.title);
    if (!song) return [];
    const key = x.detail.split(" · ")[0];
    return [{ songId: song.id, keyOverride: key && key !== song.originalKey ? key : undefined, section: x.section || undefined }];
  });
  return { serviceTitle: rec.title, serviceDate: rec.iso ?? nextSunday(), note: rec.note, eventType: rec.location || undefined, entries };
}
