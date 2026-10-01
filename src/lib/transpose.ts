// Pure transposition helpers (no React/DOM) — portable to mobile as-is.
const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
export const KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
export const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm"]);

const idx = (n: string) => {
  const i = SHARP.indexOf(n);
  return i >= 0 ? i : FLAT.indexOf(n);
};

export function semitoneDiff(from: string, to: string): number {
  const a = idx(from.replace(/m$/, ""));
  const b = idx(to.replace(/m$/, ""));
  return a < 0 || b < 0 ? 0 : (b - a + 12) % 12;
}

export function transposeChord(chord: string, steps: number, preferFlat = false): string {
  if (!steps) return chord;
  return chord
    .split("/")
    .map((part) => {
      const m = part.match(/^([A-G][#b]?)(.*)$/);
      const i = m ? idx(m[1]) : -1;
      if (!m || i < 0) return part;
      return (preferFlat ? FLAT : SHARP)[(i + steps + 120) % 12] + m[2];
    })
    .join("/");
}

/** Transposes `original` by `steps`, picking flat/sharp spelling by key convention. */
export function spell(original: string, steps: number): { name: string; flat: boolean } {
  const flat = FLAT_KEYS.has(transposeChord(original, steps, true));
  return { name: transposeChord(original, steps, flat), flat };
}
