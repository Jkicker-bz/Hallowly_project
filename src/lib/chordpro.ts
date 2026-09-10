// ---------------------------------------------------------------------------
// Parses a lightweight ChordPro-style shorthand into the structured Song
// model (types/song.ts). This is the boundary between "how a worship leader
// types a song in" and "how every screen renders it."
//
// Authoring format:
//
//   {section: verse 1}
//   [G]Great are you [D]Lord
//   [Em]It's Your breath in our [C]lungs
//
//   {section: chorus}
//   [G]Great are you [D]Lord
//
// Chord markers are stripped and converted into a charIndex against the
// plain lyric text, which is the anchor the renderer uses for pixel-precise
// alignment (see components/ChordLyricLine.tsx).
// ---------------------------------------------------------------------------

import type { SongLine, SongSection, SectionKind, ChordPlacement } from "../types/song";

const SECTION_ALIASES: Record<string, SectionKind> = {
  verse: "verse",
  chorus: "chorus",
  bridge: "bridge",
  prechorus: "pre-chorus",
  "pre-chorus": "pre-chorus",
  intro: "intro",
  outro: "outro",
  tag: "tag",
  interlude: "interlude",
};

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/**
 * Parses a single authored line like "[G]Great are you [D]Lord" into
 * plain lyric text plus a list of chord placements anchored by character
 * index into that plain text.
 */
export function parseLine(raw: string): SongLine {
  const chordPattern = /\[([^\]]+)\]/g;
  let plain = "";
  const chords: ChordPlacement[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = chordPattern.exec(raw)) !== null) {
    // Everything since the last marker is plain lyric text.
    plain += raw.slice(lastIndex, match.index);
    chords.push({ symbol: match[1], charIndex: plain.length });
    lastIndex = chordPattern.lastIndex;
  }
  plain += raw.slice(lastIndex);

  return {
    id: nextId("line"),
    lyric: plain,
    chords,
    isInstrumental: plain.trim().length === 0 && chords.length > 0,
  };
}

function parseSectionHeader(raw: string): { kind: SectionKind; label: string } | null {
  const m = raw.match(/^\{section:\s*([^}]+)\}$/i) ?? raw.match(/^\{(verse|chorus|bridge|intro|outro|tag|interlude)[^}]*\}$/i);
  if (!m) return null;

  const contents = m[1] ?? m[0].replace(/[{}]/g, "");
  const normalized = contents.trim().toLowerCase();
  const kindKey = normalized.replace(/\s*\d+$/, "").replace(/\s+/g, "-");
  const kind = SECTION_ALIASES[kindKey] ?? SECTION_ALIASES[normalized.split(" ")[0]] ?? "verse";

  const label = contents
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return { kind, label };
}

/** Parses a full authored song body into an array of SongSections. */
export function parseSongBody(body: string): SongSection[] {
  const lines = body.split("\n").map((l) => l.trimEnd());
  const sections: SongSection[] = [];
  let current: SongSection | null = null;

  for (const rawLine of lines) {
    if (rawLine.trim() === "") continue;

    const header = parseSectionHeader(rawLine.trim());
    if (header) {
      current = { id: nextId("section"), kind: header.kind, label: header.label, lines: [] };
      sections.push(current);
      continue;
    }

    if (!current) {
      // Body content before any {section: ...} header — bucket it as an intro.
      current = { id: nextId("section"), kind: "intro", label: "Intro", lines: [] };
      sections.push(current);
    }

    current.lines.push(parseLine(rawLine));
  }

  return sections;
}
