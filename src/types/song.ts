// ---------------------------------------------------------------------------
// Hallowly — core song data model
//
// A song is authored once, in a ChordPro-style plain text shorthand
// ( "[G]Great are you [D]Lord" ), then parsed into this structured shape.
// The structured shape is what every view (Combined / Chords / Lyrics,
// the setlist builder, the live performance screen) actually renders from.
//
// Keeping the *authored* format and the *rendered* model separate is the
// foundation this whole app leans on: it lets us realign chords precisely
// over the syllable they belong to (a text-measurement problem, not a
// content problem), and it gives us a place to hang playback timing later
// without ever touching how a song is written.
// ---------------------------------------------------------------------------

/** A single chord, anchored to a character offset within its line's lyric text. */
export interface ChordPlacement {
  /** The chord symbol as authored, e.g. "G", "Em7", "D/F#". */
  symbol: string;
  /**
   * Index into the *plain* lyric string (chord markers stripped) marking
   * where this chord falls. 0 = falls before the first character.
   */
  charIndex: number;
  /**
   * Optional playback anchor, in milliseconds from the start of the song's
   * reference track. Populated once a song has been "timed" — see
   * lib/timing.ts. Until then, autoscroll runs on the tempo-derived
   * estimate instead of a real timestamp.
   */
  timestampMs?: number;
}

/** One line of a song: the words the team sings, plus where the chords land. */
export interface SongLine {
  id: string;
  /** Plain lyric text with chord markers already stripped out. */
  lyric: string;
  chords: ChordPlacement[];
  /** True for structural/instrumental lines with no lyric, e.g. a turnaround. */
  isInstrumental?: boolean;
}

export type SectionKind =
  | "verse"
  | "chorus"
  | "bridge"
  | "pre-chorus"
  | "intro"
  | "outro"
  | "tag"
  | "interlude";

export interface SongSection {
  id: string;
  kind: SectionKind;
  /** Display label, e.g. "Verse 2". Defaults to a title-cased `kind` if omitted. */
  label?: string;
  lines: SongLine[];
}

export interface Song {
  id: string;
  title: string;
  /** Concert key as authored (before any live transpose is applied). */
  originalKey: string;
  /** Beats per minute, used to drive the autoscroll estimate pre-timing. */
  bpm?: number;
  capo?: number;
  sections: SongSection[];
  /** Optional reference audio, enabling real timestamp-based autoscroll. */
  audioUrl?: string;
  /** Raw authored ChordPro text, kept so the song can be edited later. */
  source?: string;
  artist?: string;
  style?: string;
}

/** One entry in a service setlist: a song plus any service-specific overrides. */
export interface SetlistEntry {
  songId: string;
  /** Transposed key for this specific service, if different from originalKey. */
  keyOverride?: string;
  capoOverride?: number;
  notes?: string;
  /** Service section, e.g. Praise / Worship / Offering. */
  section?: string;
}

export interface CrewAssignment {
  memberId: string;
  role: string;
}

export interface Setlist {
  crew?: CrewAssignment[];
  note?: string;
  /** Key applied to the whole set unless a song has its own override. */
  listKey?: string;
  id: string;
  serviceTitle: string;
  serviceDate: string; // ISO date
  entries: SetlistEntry[];
}

export type ChordDisplayMode = "standard" | "numeral" | "solfege";
export type SongViewMode = "combined" | "lyrics" | "chords";
