import { useEffect, useMemo, useRef, useState } from "react";
import type { Song, SongViewMode } from "../types/song";
import { flattenSongTiming, currentLineIndex } from "../lib/timing";
import { ChordLyricLine } from "./ChordLyricLine";

interface OnStageViewProps {
  song: Song;
  setlistPosition?: { current: number; total: number };
}

const VIEW_MODES: { mode: SongViewMode; label: string }[] = [
  { mode: "lyrics", label: "Lyrics" },
  { mode: "combined", label: "Combined" },
  { mode: "chords", label: "Chords" },
];

export function OnStageView({ song, setlistPosition = { current: 2, total: 6 } }: OnStageViewProps) {
  const [viewMode, setViewMode] = useState<SongViewMode>("combined");
  const [isScrolling, setIsScrolling] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);

  const flatLines = useMemo(() => flattenSongTiming(song), [song]);
  const activeIndex = currentLineIndex(flatLines, elapsedMs);

  // Autoscroll tick: advances elapsed time while playing. This is the same
  // clock a real reference-track player would drive once wired up — swap
  // this effect for an <audio> timeupdate listener and nothing else in
  // the component needs to change, since everything downstream reads off
  // `elapsedMs`.
  useEffect(() => {
    if (!isScrolling) {
      lastTickRef.current = null;
      return;
    }
    const tick = (now: number) => {
      if (lastTickRef.current !== null) {
        setElapsedMs((prev) => prev + (now - lastTickRef.current!));
      }
      lastTickRef.current = now;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isScrolling]);

  const currentSectionLabel = flatLines[activeIndex]?.sectionLabel;

  return (
    <div className="hw-device">
      <div className="hw-topnav">
        <button className="hw-icon-btn" aria-label="Back">
          <ChevronLeft />
        </button>
        <div>
          <div className="hw-title">{song.title}</div>
          <div className="hw-subtitle">
            SUN SERVICE · TRACK {setlistPosition.current} OF {setlistPosition.total}
          </div>
        </div>
        <div className="hw-keypill">{song.originalKey}</div>
      </div>

      <div className="hw-setlist-track">
        {Array.from({ length: setlistPosition.total }).map((_, i) => (
          <div
            key={i}
            className={
              "hw-dot" +
              (i < setlistPosition.current - 1 ? " hw-dot--done" : "") +
              (i === setlistPosition.current - 1 ? " hw-dot--active" : "")
            }
          />
        ))}
      </div>

      <div className="hw-stage">
        <div className="hw-lyric-scroll">
          {flatLines.map((fl, i) => {
            const showLabel = i === 0 || flatLines[i - 1].sectionLabel !== fl.sectionLabel;
            return (
              <div key={fl.line.id}>
                {showLabel && <div className="hw-section-label">{fl.sectionLabel.toUpperCase()}</div>}
                <ChordLyricLine
                  line={fl.line}
                  viewMode={viewMode}
                  isCurrent={i === activeIndex}
                  isPast={i < activeIndex}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="hw-dock">
        <div className="hw-view-toggle">
          {VIEW_MODES.map(({ mode, label }) => (
            <button
              key={mode}
              className={viewMode === mode ? "active" : ""}
              onClick={() => setViewMode(mode)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="hw-transport">
          <div className="hw-side">
            <button
              className="hw-icon-btn"
              aria-label="Previous song"
              onClick={() => setElapsedMs(0)}
            >
              <ChevronLeft />
            </button>
            PREV
          </div>

          <div className="hw-prevnext">
            <button
              className={"hw-icon-btn" + (isScrolling ? " hw-icon-btn--accent" : "")}
              aria-label={isScrolling ? "Pause autoscroll" : "Start autoscroll"}
              onClick={() => setIsScrolling((s) => !s)}
              title={`Section: ${currentSectionLabel ?? ""}`}
            >
              <ArrowDown />
            </button>
            <button className="hw-play-main" aria-label="Play">
              <Play />
            </button>
          </div>

          <div className="hw-side">
            <button className="hw-icon-btn" aria-label="Next song">
              <ChevronRight />
            </button>
            NEXT
          </div>
        </div>
      </div>
    </div>
  );
}

// --- inline icon primitives (kept local so this file has zero extra deps) --

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function ArrowDown() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M12 19l-4-4M12 19l4-4" />
    </svg>
  );
}
function Play() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="none">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
