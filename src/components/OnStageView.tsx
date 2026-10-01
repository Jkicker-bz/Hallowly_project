import { useEffect, useMemo, useRef, useState } from "react";
import type { Song, SongViewMode } from "../types/song";
import { flattenSongTiming, currentLineIndex } from "../lib/timing";
import { semitoneDiff, spell } from "../lib/transpose";
import { transposeChord } from "../lib/transpose";
import { ChordLyricLine } from "./ChordLyricLine";

interface Props {
  song: Song;
  /** Setlist key override; defaults to the song's original key. */
  baseKey?: string;
  serviceTitle?: string;
  position?: { current: number; total: number };
  onBack?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

const MODES: [SongViewMode, string][] = [["lyrics", "Lyrics"], ["combined", "Combined"], ["chords", "Chords"]];

export function OnStageView({ song, baseKey, serviceTitle = "Library", position = { current: 1, total: 1 }, onBack, onPrev, onNext }: Props) {
  const [mode, setMode] = useState<SongViewMode>("combined");
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [shift, setShift] = useState(0);
  const [capo, setCapo] = useState(0);
  const [size, setSize] = useState(19);
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const last = useRef<number | null>(null);

  const flat = useMemo(() => flattenSongTiming(song), [song]);
  const active = currentLineIndex(flat, elapsed);

  const steps = (semitoneDiff(song.originalKey, baseKey ?? song.originalKey) + shift + 120) % 12;
  const key = spell(song.originalKey, steps).name;
  const shape = (((steps - capo) % 12) + 12) % 12;
  const shapeFlat = spell(song.originalKey, shape).flat;
  const showChord = (s: string) => transposeChord(s, shape, shapeFlat);

  useEffect(() => {
    if (!playing) { last.current = null; return; }
    let raf = 0;
    const tick = (now: number) => {
      if (last.current !== null) setElapsed((e) => e + now - last.current!);
      last.current = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  useEffect(() => {
    if (playing) els.current[active]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [active, playing]);

  return (
    <div className="hw-device">
      <div className="hw-topnav">
        <button className="hw-icon-btn" aria-label="Back" onClick={onBack}><Chevron dir="l" /></button>
        <div style={{ textAlign: "center" }}>
          <div className="hw-title">{song.title}</div>
          <div className="hw-subtitle">{serviceTitle.toUpperCase()} · {position.current} OF {position.total}</div>
        </div>
        <div className="hw-keypill">{key}{capo ? ` c${capo}` : ""}</div>
      </div>

      <div className="hw-setlist-track">
        {Array.from({ length: position.total }).map((_, i) => (
          <div key={i} className={"hw-dot" + (i < position.current - 1 ? " hw-dot--done" : "") + (i === position.current - 1 ? " hw-dot--active" : "")} />
        ))}
      </div>

      <div className="hw-stage">
        <div className="hw-lyric-scroll">
          {flat.map((fl, i) => (
            <div key={fl.line.id} ref={(el) => { els.current[i] = el; }} onClick={() => setElapsed(fl.startMs)}>
              {(i === 0 || flat[i - 1].sectionLabel !== fl.sectionLabel) && (
                <div className="hw-section-label">{fl.sectionLabel.toUpperCase()}</div>
              )}
              <ChordLyricLine line={fl.line} viewMode={mode} sizePx={size} showChord={showChord} isCurrent={i === active} isPast={i < active} />
            </div>
          ))}
        </div>
      </div>

      <div className="hw-dock">
        <div className="hw-view-toggle">
          {MODES.map(([m, label]) => (
            <button key={m} className={mode === m ? "active" : ""} onClick={() => setMode(m)}>{label}</button>
          ))}
        </div>
        <div className="hw-tools">
          <div className="hw-step"><button onClick={() => setShift((s) => s - 1)} aria-label="Key down">−</button><span>KEY</span><button onClick={() => setShift((s) => s + 1)} aria-label="Key up">+</button></div>
          <div className="hw-step"><button onClick={() => setCapo((c) => Math.max(0, c - 1))} aria-label="Capo down">−</button><span>CAPO {capo}</span><button onClick={() => setCapo((c) => Math.min(11, c + 1))} aria-label="Capo up">+</button></div>
          <div className="hw-step"><button onClick={() => setSize((s) => Math.max(14, s - 1))} aria-label="Smaller">−</button><span>Aa</span><button onClick={() => setSize((s) => Math.min(30, s + 1))} aria-label="Larger">+</button></div>
        </div>
        <div className="hw-transport">
          <div className="hw-side"><button className="hw-icon-btn" aria-label="Previous song" disabled={!onPrev} onClick={onPrev}><Chevron dir="l" /></button>PREV</div>
          <button className="hw-play-main" aria-label={playing ? "Pause autoscroll" : "Start autoscroll"} onClick={() => setPlaying((p) => !p)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--hw-surface-void)">
              {playing ? <><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></> : <path d="M8 5l11 7-11 7z" />}
            </svg>
          </button>
          <div className="hw-side"><button className="hw-icon-btn" aria-label="Next song" disabled={!onNext} onClick={onNext}><Chevron dir="r" /></button>NEXT</div>
        </div>
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: "l" | "r" }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={dir === "l" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
    </svg>
  );
}
