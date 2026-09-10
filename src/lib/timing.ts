// ---------------------------------------------------------------------------
// Two tiers of "which line are we on right now":
//
//  1. Timestamped (best): each line's first chord carries a timestampMs
//     anchored to the song's reference audio. Exact.
//  2. Estimated (fallback, used until a song has been "timed" by a team
//     member listening once through): we assume a fixed number of beats
//     per line and derive elapsed-time-per-line from the song's bpm.
//
// Both return the same shape so the UI never needs to know which mode
// it's in — it just asks "given elapsed ms, which flat line index is
// current?"
// ---------------------------------------------------------------------------

import type { Song, SongLine, SongSection } from "../types/song";

export interface FlatLine {
  sectionId: string;
  sectionLabel: string;
  line: SongLine;
  /** Absolute index across the whole song, ignoring section boundaries. */
  flatIndex: number;
  /** Estimated or real start time for this line, in ms from song start. */
  startMs: number;
}

const ASSUMED_BEATS_PER_LINE = 4;

/** Flattens a song's sections into a single ordered line list with timing. */
export function flattenSongTiming(song: Song, beatsPerLine = ASSUMED_BEATS_PER_LINE): FlatLine[] {
  const bpm = song.bpm ?? 80;
  const msPerBeat = 60000 / bpm;
  const msPerLine = msPerBeat * beatsPerLine;

  const flat: FlatLine[] = [];
  let index = 0;

  const sections: SongSection[] = song.sections;
  for (const section of sections) {
    for (const line of section.lines) {
      const firstTimestamp = line.chords.find((c) => c.timestampMs !== undefined)?.timestampMs;
      flat.push({
        sectionId: section.id,
        sectionLabel: section.label ?? section.kind,
        line,
        flatIndex: index,
        startMs: firstTimestamp ?? index * msPerLine,
      });
      index += 1;
    }
  }

  return flat;
}

/** Given elapsed playback time, returns the flatIndex of the current line. */
export function currentLineIndex(flatLines: FlatLine[], elapsedMs: number): number {
  let current = 0;
  for (const fl of flatLines) {
    if (fl.startMs <= elapsedMs) {
      current = fl.flatIndex;
    } else {
      break;
    }
  }
  return current;
}
