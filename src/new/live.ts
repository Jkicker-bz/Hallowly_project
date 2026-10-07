// Maps the Supabase data (songs, lists, leads) onto the shapes the Figma design expects.
import { useMemo } from "react";
import { useLibrary } from "../context/LibraryContext";
import { isBackendConfigured } from "../lib/supabase";

const COLORS = ["#9b59b6", "#1abc9c", "#e67e22", "#4878a8", "#a0815e"];
const AVATARS = ["violet", "auburn", "teal", "blue", "gold"];
const ini = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const mon = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en", { month: "short", day: "2-digit" }).toUpperCase().replace(".", "");

export function useLiveData() {
  const lib = useLibrary();
  return useMemo(() => {
    if (!isBackendConfigured) return null;
    const leader = (id?: string) => { const m = lib.members.find((x) => x.id === id); return m ? ini(m.name) : "—"; };
    const asSong = (s: (typeof lib.songs)[number], key?: string) => ({
      title: s.title,
      detail: `${key ?? s.originalKey}${s.bpm ? ` · ${s.bpm} BPM` : ""}${s.artist ? ` · ${s.artist}` : ""}`,
      leader: leader(s.leads?.[0]?.leadId),
      notes: "",
    });
    const songs = lib.songs.map((s) => asSong(s));
    const team = lib.members.map((m, i) => ({ name: m.name, role: m.instrument, initials: ini(m.name), status: "Confirmed", color: AVATARS[i % AVATARS.length] }));
    const today = new Date().toISOString().slice(0, 10);
    const setLists = lib.setlists.map((sl, i) => ({
      id: sl.id, title: sl.serviceTitle, date: mon(sl.serviceDate), time: "", location: sl.eventType ?? "",
      color: COLORS[i % COLORS.length], status: (sl.entries.length ? (sl.serviceDate >= today ? "Ready" : "Ready") : "Draft") as "Ready" | "Planning" | "Draft",
      songs: sl.entries.map((e) => lib.getSongById(e.songId)).filter((s): s is NonNullable<typeof s> => !!s).map((s, k) => asSong(s, sl.entries[k]?.keyOverride ?? sl.listKey)),
      note: sl.note ?? "", comments: [] as string[],
    }));
    return { songs, team, additionalSongs: [] as typeof songs, setLists };
  }, [lib]);
}
