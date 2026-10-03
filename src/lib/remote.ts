// Maps the existing Supabase tables (songs, chords, leads, lists, list_songs,
// list_leads) onto the app's Song / Setlist / TeamMember model. Read-only for now.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "./supabase";
import { parseSongBody } from "./chordpro";
import type { Setlist, Song, SongLine, SongSection } from "../types/song";
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
  const [songRows, leads, lists, listSongs, listLeads, songLeads] = await Promise.all([
    table("songs", "id,title,artist,style,key,bpm,active"),
    table("leads", "id,initials,full_name,role,avatar_color,active"), // never request email
    table("lists", "id,name,date,event_type,list_key,note,active"),
    table("list_songs"),
    table("list_leads", "list_id,lead_id"),
    table("song_leads", "song_id,lead_id,role"),
  ]);

  const songs: Song[] = songRows
    .filter((s) => s.active !== false)
    .map((s) => ({
      id: s.id, title: s.title, artist: s.artist, style: s.style ?? undefined,
      originalKey: s.key || "C", bpm: s.bpm ?? undefined, sections: [], loaded: false,
      leads: songLeads.filter((x) => x.song_id === s.id).map((x) => ({ leadId: x.lead_id, role: x.role })),
    }));

  const known = new Set(songs.map((s) => s.id));
  const roleOf = new Map(leads.map((l) => [l.id, l.role as string]));
  const setlists: Setlist[] = lists
    .filter((l) => l.active !== false)
    .map((l) => ({
      id: l.id, serviceTitle: l.name, serviceDate: l.date, note: l.note ?? undefined, eventType: l.event_type ?? undefined, listKey: l.list_key ?? undefined,
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
  const a = await sb.from("lists").upsert({ id: s.id, name: s.serviceTitle, date: s.serviceDate, event_type: s.eventType ?? "Sunday AM", list_key: s.listKey ?? null, note: s.note ?? null, active: true });
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

const toTokens = (l: SongLine) => {
  if (l.isInstrumental) return { tokens: l.chords.map((c) => ({ chord: c.symbol, lyric: "" })) };
  const t: { chord: string; lyric: string }[] = [];
  if (!l.chords.length || l.chords[0].charIndex > 0) t.push({ chord: "", lyric: l.lyric.slice(0, l.chords[0]?.charIndex ?? l.lyric.length) });
  l.chords.forEach((c, i) => t.push({ chord: c.symbol, lyric: l.lyric.slice(c.charIndex, l.chords[i + 1]?.charIndex ?? l.lyric.length) }));
  return { tokens: t };
};

/** Saves a song and its chart. New chart rows are written before the old ones are removed, so a failure never loses a chart. */
export async function pushSong(s: Song): Promise<void> {
  const sb = supabase!;
  const a = await sb.from("songs").upsert({ id: s.id, title: s.title, artist: s.artist || "Unknown", style: s.style ?? null, key: s.originalKey, bpm: s.bpm ?? null, active: true });
  if (a.error) throw a.error;
  const old = await sb.from("chords").select("id").eq("song_id", s.id);
  if (old.error) throw old.error;
  if (s.sections.length) {
    const ins = await sb.from("chords").insert(s.sections.map((sec, i) => ({ song_id: s.id, section_name: sec.label ?? sec.kind, position: i, tokens: sec.lines.map(toTokens) })));
    if (ins.error) throw ins.error;
  }
  const ids = (old.data ?? []).map((x) => x.id);
  if (ids.length) { const d = await sb.from("chords").delete().in("id", ids); if (d.error) throw d.error; }
}

export async function archiveSong(id: string): Promise<void> {
  const { error } = await supabase!.from("songs").update({ active: false }).eq("id", id);
  if (error) throw error;
}
