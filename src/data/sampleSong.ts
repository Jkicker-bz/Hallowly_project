import { parseSongBody } from "../lib/chordpro";
import type { Song } from "../types/song";

// Placeholder lyrics written for this demo — not from any published song.
// Swap this out with real, licensed setlist content once the team's
// library import is wired up.
const BODY = `
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

{section: verse 2}
[G]Every fear dissolves before [D]Your voice
[Em]Steady as the [C]rising sun
[G]In the quiet I will [D]make my choice
[Em]Your will be [C]done
`;

export const sampleSong: Song = {
  id: "song-boundless-grace",
  title: "Boundless Grace",
  originalKey: "G",
  bpm: 72,
  sections: parseSongBody(BODY),
};
