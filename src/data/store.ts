// ---------------------------------------------------------------------------
// Stands in for a real backend. Shaped the way an API response would be
// shaped (flat collections, IDs as foreign keys) specifically so swapping
// this out for real fetch calls later is a matter of changing what's
// inside these functions, not how any page calls them.
// ---------------------------------------------------------------------------

import { parseSongBody } from "../lib/chordpro";
import type { Setlist, Song } from "../types/song";

function song(id: string, title: string, key: string, bpm: number, body: string): Song {
  return { id, title, originalKey: key, bpm, source: body, sections: parseSongBody(body) };
}

// Placeholder lyrics written for this demo — not from any published song.
export const songs: Song[] = [
  song(
    "song-boundless-grace",
    "Boundless Grace",
    "G",
    72,
    `
{section: verse 1}
[G]Every morning mercy [D]waits for me
[Em]Steady as the [C]rising sun
[G]Every step You've [D]called me faithfully
[Em]Your will be [C]done

{section: chorus}
[G]Boundless is Your [D]grace
[Em]Wider than the [C]sea
[G]Boundless is Your [D]grace
[C]Poured out over [G]me
`
  ),
  song(
    "song-steady-anchor",
    "Steady Anchor",
    "D",
    68,
    `
{section: verse 1}
[D]When the waters rise around [A]me
[Bm]I will hold to what is [G]true
[D]You have never once forsaken [A]me
[Bm]I will rest in [G]You

{section: chorus}
[D]You're my steady [A]anchor
[Bm]Through the [G]storm
[D]You're my steady [A]anchor
[G]Safe and [D]warm
`
  ),
  song(
    "song-open-hands",
    "Open Hands",
    "C",
    84,
    `
{section: verse 1}
[C]I bring an offering of [G]open hands
[Am]Nothing hidden nothing [F]held
[C]Whatever You are asking [G]of me
[Am]I will [F]yield

{section: chorus}
[C]Open hands open [G]heart
[Am]Take [F]all of me
[C]Open hands open [G]heart
[F]Have Your [C]way
`
  ),
];

export function getSongById(id: string): Song | undefined {
  return songs.find((s) => s.id === id);
}

export const setlists: Setlist[] = [
  {
    id: "setlist-sep14",
    serviceTitle: "Sunday Service",
    serviceDate: "2026-09-14",
    entries: [
      { songId: "song-boundless-grace" },
      { songId: "song-steady-anchor", keyOverride: "E" },
      { songId: "song-open-hands" },
    ],
  },
];

export function getSetlistById(id: string): Setlist | undefined {
  return setlists.find((s) => s.id === id);
}
