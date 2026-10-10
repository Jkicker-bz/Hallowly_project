// Plain-text chord sheets: "[Verse 1]" headers, a chord line above each lyric line.
// Pure (no DOM/React). parse <-> print round-trip keeps chord positions.
import type { SectionKind, SongLine, SongSection } from "../types/song";

const CHORD = /^[A-G][#b♯♭]?(?:m|maj|min|sus|add|dim|aug|M)?\d*(?:\([^)]*\))?(?:\/[A-G][#b♯♭]?)?$/;
const isChords = (l: string) => !!l.trim() && l.trim().split(/\s+/).every((w) => CHORD.test(w) || w === "|" || w === "-");
const isHeader = (l: string) => /^\[.+\]$/.test(l.trim());
let n = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${n++}`;
const KINDS: SectionKind[] = ["intro", "verse", "chorus", "bridge", "outro", "tag", "interlude"];

export function parseChordSheet(text: string): SongSection[] {
  const out: SongSection[] = [];
  let cur: SongSection | null = null;
  const start = (label: string) => {
    const k = label.toLowerCase();
    cur = { id: uid("sec"), kind: /pre/.test(k) ? "pre-chorus" : KINDS.find((x) => k.includes(x)) ?? "verse", label, lines: [] };
    out.push(cur);
  };
  const rows = text.split("\n");
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i], s = raw.trim();
    if (!s || s.startsWith("//")) continue;
    if (isHeader(s)) { start(s.slice(1, -1)); continue; }
    if (!cur) start("Verse 1");
    const sec: SongSection = cur!;
    if (isChords(raw)) {
      const next = rows[i + 1] ?? "";
      const lyric = next.trim() && !isChords(next) && !isHeader(next) && !next.trim().startsWith("//") ? next.trimEnd() : null;
      const chords = [...raw.matchAll(/\S+/g)].filter((m) => CHORD.test(m[0]))
        .map((m) => ({ symbol: m[0], charIndex: lyric === null ? 0 : Math.min(m.index ?? 0, lyric.length) }));
      sec.lines.push({ id: uid("line"), lyric: lyric ?? "", chords, isInstrumental: lyric === null });
      if (lyric !== null) i++;
    } else sec.lines.push({ id: uid("line"), lyric: s, chords: [] });
  }
  return out;
}

/** Chord symbols placed at their character offsets, e.g. "G     D". */
export const chordRow = (l: SongLine, f: (c: string) => string = (c) => c) =>
  l.chords.reduce((r, c) => r.padEnd(Math.max(c.charIndex, r ? r.length + 1 : 0)) + f(c.symbol), "");

export function toChordSheet(sections: SongSection[]): string {
  return sections.map((s) => `[${s.label ?? s.kind}]\n` + s.lines.map((l) =>
    l.isInstrumental ? l.chords.map((c) => c.symbol).join(" ") : (l.chords.length ? chordRow(l) + "\n" : "") + l.lyric).join("\n")).join("\n\n");
}

// ---- inline format used by the redesigned chord editor: "[Verse 1]" headers, "[G]word" chords ----
import { parseLine } from "./chordpro";

const SECTION_KINDS: SectionKind[] = ["intro", "verse", "chorus", "bridge", "outro", "tag", "interlude"];

export function toInlineSheet(sections: SongSection[]): string {
  return sections.map((s) => `[${s.label ?? s.kind}]\n` + s.lines.map((l) => {
    if (l.isInstrumental) return l.chords.map((c) => `[${c.symbol}]`).join(" ");
    let out = "", at = 0;
    l.chords.forEach((c) => { out += l.lyric.slice(at, c.charIndex) + `[${c.symbol}]`; at = c.charIndex; });
    return out + l.lyric.slice(at);
  }).join("\n")).join("\n\n");
}

export function fromInlineSheet(text: string): SongSection[] {
  const out: SongSection[] = [];
  let cur: SongSection | null = null;
  for (const raw of text.split("\n")) {
    const s = raw.trim();
    if (!s) continue;
    const h = s.match(/^\[([^\]]+)\]$/);
    if (h && !CHORD.test(h[1])) {
      const k = h[1].toLowerCase();
      cur = { id: uid("sec"), kind: /pre/.test(k) ? "pre-chorus" : SECTION_KINDS.find((x) => k.includes(x)) ?? "verse", label: h[1], lines: [] };
      out.push(cur);
      continue;
    }
    if (!cur) { cur = { id: uid("sec"), kind: "verse", label: "Verse 1", lines: [] }; out.push(cur); }
    cur.lines.push(parseLine(raw.replace(/\] (?=\S)/g, "]").trimEnd()));
  }
  return out;
}
