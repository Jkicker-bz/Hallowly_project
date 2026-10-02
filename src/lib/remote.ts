// Maps the existing Supabase tables (songs, chords, leads, lists, list_songs,
// list_leads) onto the app's Song / Setlist / TeamMember model. Read-only for now.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "./supabase";
import { parseSongBody } from "./chordpro";
import type { Setlist, Song, SongSection } from "../types/song";
import type { TeamMember } from "../types/user";

type Row = Record<string, any>;

const tokensToLine = (t: Row[]) => t.map((x) => (x.chord ? `[${x.chord}]` : "") + (x.lyric ?? "")).join("");
const noteLine = (n: string) => `(${n.replace(/[[\]]/g, "")})`;

/** A chords row may hold one line, a list of lines, or plain text — handle all three. */
function rowLines(r: Row): string[] {
  const t = r.tokens;
  if (Array.isArray(t) && t.length) {
    if (t.some((x: Row) => x && (Array.isArray(x.tokens) || x.note))) {
      return t.map((x: Row) => (x.note ? noteLine(x.note) : tokensToLine(x.tokens ?? [])));
    }
    return [tokensToLine(t)];
  }
  return String(r.content ?? "").split("\n").filter((l) => l.trim());
}

async function table(name: string, cols = "*"): Promise<Row[]> {
  const { data, error } = await supabase!.from(name).select(cols);
  if (error) throw error;
  return (data ?? []) as unknown as Row[];
}

export async function fetchAll(): Promise<{ songs: Song[]; setlists: Setlist[]; members: TeamMember[] }> {
  if (!supabase) throw new Error("Backend not configured");
  const [songRows, leads, lists, listSongs, listLeads] = await Promise.all([
    table("songs", "id,title,artist,style,key,bpm,active"),
    table("leads", "id,initials,full_name,role,avatar_color,active"), // never request email
    table("lists", "id,name,date,list_key,note,active"),
    table("list_songs"),
    table("list_leads", "list_id,lead_id"),
  ]);

  const songs: Song[] = songRows
    .filter((s) => s.active !== false)
    .map((s) => ({
      id: s.id, title: s.title, artist: s.artist, style: s.style ?? undefined,
      originalKey: s.key || "C", bpm: s.bpm ?? undefined, sections: [], loaded: false,
    }));

  const known = new Set(songs.map((s) => s.id));
  const roleOf = new Map(leads.map((l) => [l.id, l.role as string]));
  const setlists: Setlist[] = lists
    .filter((l) => l.active !== false)
    .map((l) => ({
      id: l.id, serviceTitle: l.name, serviceDate: l.date, note: l.note ?? undefined, listKey: l.list_key ?? undefined,
      entries: listSongs
        .filter((x) => x.list_id === l.id && known.has(x.song_id))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((x) => ({ songId: x.song_id, section: x.section_name ?? undefined, keyOverride: x.key_override ?? undefined })),
      crew: listLeads.filter((x) => x.list_id === l.id).map((x) => ({ memberId: x.lead_id, role: roleOf.get(x.lead_id) ?? "" })),
    }));

  const members = leads.filter((l) => l.active !== false).map((l) => ({ id: l.id, name: l.full_name, instrument: l.role }));
  return { songs, setlists, members };
}

/** Saves one setlist: upserts the list row, then rewrites its songs in order. */
export async function pushList(s: Setlist): Promise<void> {
  const sb = supabase!;
  const a = await sb.from("lists").upsert({ id: s.id, name: s.serviceTitle, date: s.serviceDate, list_key: s.listKey ?? null, note: s.note ?? null, active: true });
  if (a.error) throw a.error;
  const d = await sb.from("list_songs").delete().eq("list_id", s.id);
  if (d.error) throw d.error;
  if (s.entries.length) {
    const r = await sb.from("list_songs").insert(
      s.entries.map((e, i) => ({ list_id: s.id, song_id: e.songId, section_name: e.section ?? "Set", position: i, key_override: e.keyOverride ?? null }))
    );
    if (r.error) throw r.error;
  }
  const dl = await sb.from("list_leads").delete().eq("list_id", s.id);
  if (dl.error) throw dl.error;
  if (s.crew?.length) {
    const rl = await sb.from("list_leads").insert(s.crew.map((c) => ({ list_id: s.id, lead_id: c.memberId })));
    if (rl.error) throw rl.error;
  }
}

/** Soft-delete, matching the `active` flag the old app used. */
export async function archiveList(id: string): Promise<void> {
  const { error } = await supabase!.from("lists").update({ active: false }).eq("id", id);
  if (error) throw error;
}

function chart(chords: Row[]): { source: string; sections: SongSection[] } {
  const rows = [...chords].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const order: string[] = [];
  const groups = new Map<string, string[]>();
  rows.forEach((r) => {
    const name = r.section_name || "Song";
    if (!groups.has(name)) { groups.set(name, []); order.push(name); }
    groups.get(name)!.push(...rowLines(r));
  });
  const source = order.map((n) => `{section: ${n}}\n${groups.get(n)!.join("\n")}`).join("\n");
  return { source, sections: parseSongBody(source) };
}

/** Downloads one song's chart (called when a song is opened, not at startup). */
export async function fetchChart(songId: string) {
  const { data, error } = await supabase!.from("chords").select("*").eq("song_id", songId);
  if (error) throw error;
  return chart((data ?? []) as Row[]);
}
