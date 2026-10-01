import { useMemo } from "react";
import type { SongLine, SongViewMode } from "../types/song";
import { measureTextWidth, lyricFont } from "../lib/measureText";

interface Props {
  line: SongLine;
  viewMode: SongViewMode;
  sizePx?: number;
  /** Maps an authored chord to what should be displayed (transpose/capo). */
  showChord?: (symbol: string) => string;
  isCurrent?: boolean;
  isPast?: boolean;
}

/** One lyric line; chords sit at measured pixel offsets so they land on their syllable. */
export function ChordLyricLine({ line, viewMode, sizePx = 19, showChord = (s) => s, isCurrent, isPast }: Props) {
  const font = lyricFont({ weight: isCurrent ? 500 : 400, sizePx });
  const offsets = useMemo(
    () => line.chords.map((c) => ({ ...c, left: measureTextWidth(line.lyric.slice(0, c.charIndex), font) })),
    [line, font]
  );
  const cls = ["hw-line", isCurrent && "hw-line--current", isPast && "hw-line--past"].filter(Boolean).join(" ");

  return (
    <div className={cls}>
      {isCurrent && <span className="hw-halo-mark" aria-hidden="true" />}
      {viewMode === "chords" && (
        <div className="hw-chords-flow">
          {line.chords.map((c, i) => (
            <span key={i} className="hw-chord" style={{ fontSize: sizePx * 0.8 }}>{showChord(c.symbol)}</span>
          ))}
        </div>
      )}
      {viewMode === "combined" && (
        <div style={{ position: "relative", height: sizePx * 0.9 }}>
          {offsets.map((c, i) => (
            <span key={i} className="hw-chord" style={{ position: "absolute", left: c.left, fontSize: sizePx * 0.66 }}>
              {showChord(c.symbol)}
            </span>
          ))}
        </div>
      )}
      {viewMode !== "chords" && <div className="hw-lyric" style={{ font }}>{line.lyric || "\u00A0"}</div>}
    </div>
  );
}
