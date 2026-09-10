// ---------------------------------------------------------------------------
// The alignment problem this file solves:
//
// Lyrics render in Montserrat — a proportional font, chosen for stage
// legibility. Chords need to sit exactly above the character they change
// on. In a monospace font that's a trivial ch-unit calculation; in a
// proportional font it isn't, because "i" and "m" don't take the same
// width. So we measure the actual rendered pixel width of the substring
// up to each chord's charIndex, using an offscreen canvas with the same
// font declaration as the live lyric text, and position each chord with
// an absolute left offset instead of guessing from character count.
//
// One canvas context is reused across calls (cheap, no DOM writes) and
// results are memoized per (text, font) pair since a line's chord
// positions get re-measured on every render pass otherwise.
// ---------------------------------------------------------------------------

let sharedCanvas: HTMLCanvasElement | null = null;
const cache = new Map<string, number>();

function getContext(): CanvasRenderingContext2D {
  if (!sharedCanvas) {
    sharedCanvas = document.createElement("canvas");
  }
  const ctx = sharedCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable — cannot measure chord alignment.");
  }
  return ctx;
}

/**
 * Returns the rendered pixel width of `text` when set in `font`
 * (a CSS font shorthand string, e.g. "500 19px Montserrat, sans-serif").
 */
export function measureTextWidth(text: string, font: string): number {
  if (text.length === 0) return 0;

  const key = `${font}::${text}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const ctx = getContext();
  ctx.font = font;
  const width = ctx.measureText(text).width;
  cache.set(key, width);
  return width;
}

/** Builds the CSS font shorthand for a given weight/size, matching .lyric styling. */
export function lyricFont(weightPx: { weight: number; sizePx: number }): string {
  return `${weightPx.weight} ${weightPx.sizePx}px Montserrat, sans-serif`;
}

/** Clears the measurement cache — call if the lyric font family/size ever changes at runtime. */
export function clearMeasureCache(): void {
  cache.clear();
}
