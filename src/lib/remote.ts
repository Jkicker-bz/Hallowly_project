// Maps the existing Supabase tables (songs, chords, leads, lists, list_songs,
// list_leads) onto the app's Song / Setlist / TeamMember model. Read-only for now.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "./supabase";
import { parseSongBody } from "./chordpro";
import type { Setlist, Song } from "../types/song";
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
  const [songRows, chords, leads, lists, listSongs, listLeads] = await Promise.all([
    table("songs"),
    table("chords"),
    table("leads", "id,initials,full_name,role,avatar_color,active"), // never request email
    table("lists"),
    table("list_songs"),
    table("list_leads"),
  ]);

  const bySong = new Map<string, Row[]>();
  chords.forEach((c) => bySong.set(c.song_id, [...(bySong.get(c.song_id) ?? []), c]));

  const songs: Song[] = songRows
    .filter((s) => s.active !== false)
    .map((s) => {
      const rows = (bySong.get(s.id) ?? []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      const order: string[] = [];
      const groups = new Map<string, string[]>();
      rows.forEach((r) => {
        const name = r.section_name || "Song";
        if (!groups.has(name)) { groups.set(name, []); order.push(name); }
        groups.get(name)!.push(...rowLines(r));
      });
      const body = order.map((n) => `{section: ${n}}\n${groups.get(n)!.join("\n")}`).join("\n");
      return {
        id: s.id, title: s.title, artist: s.artist, style: s.style ?? undefined,
        originalKey: s.key || "C", bpm: s.bpm ?? undefined, source: body, sections: parseSongBody(body),
      };
    });

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
