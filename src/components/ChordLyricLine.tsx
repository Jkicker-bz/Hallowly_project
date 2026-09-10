import { useMemo } from "react";
import type { SongLine, SongViewMode } from "../types/song";
import { measureTextWidth, lyricFont } from "../lib/measureText";

interface ChordLyricLineProps {
  line: SongLine;
  viewMode: SongViewMode;
  /** true = this is the line currently under the reading position / autoscroll focus */
  isCurrent?: boolean;
  /** true = this line has already been sung and scrolled past */
  isPast?: boolean;
}

const LYRIC_WEIGHT = { weight: 400, sizePx: 19 };
const LYRIC_WEIGHT_CURRENT = { weight: 500, sizePx: 19 };

/**
 * Renders one song line with chords positioned by measured pixel offset
 * rather than character count, so a chord over "you" lands on "you" even
 * though Montserrat is proportional. See lib/measureText.ts for why this
 * step exists.
 */
export function ChordLyricLine({ line, viewMode, isCurrent, isPast }: ChordLyricLineProps) {
  const font = lyricFont(isCurrent ? LYRIC_WEIGHT_CURRENT : LYRIC_WEIGHT);

  const chordOffsets = useMemo(() => {
    if (viewMode === "lyrics") return [];
    return line.chords.map((chord) => ({
      ...chord,
      leftPx: measureTextWidth(line.lyric.slice(0, chord.charIndex), font),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line, font, viewMode]);

  const className = [
    "hw-line",
    isCurrent && "hw-line--current",
    isPast && "hw-line--past",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      {isCurrent && <span className="hw-halo-mark" aria-hidden="true" />}

      {viewMode !== "lyrics" && (
        <div className="hw-chords-row" style={{ position: "relative", height: 16 }}>
          {chordOffsets.map((chord, i) => (
            <span
              key={i}
              className="hw-chord"
              style={{ position: "absolute", left: chord.leftPx, transform: "translateX(0)" }}
            >
              {chord.symbol}
            </span>
          ))}
        </div>
      )}

      {viewMode !== "chords" && (
        <div className="hw-lyric" style={{ font }}>
          {line.lyric || "\u00A0"}
        </div>
      )}
    </div>
  );
}
