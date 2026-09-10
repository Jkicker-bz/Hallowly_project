import { sampleSong } from "../data/sampleSong";

export function LibraryPage() {
  return (
    <div>
      <h1 className="hw-page-title">Song Library</h1>
      <p className="hw-page-subtitle">Chords, lyrics, and arrangements for your team.</p>

      <div className="hw-card">
        <div className="hw-card-title">{sampleSong.title}</div>
        <div className="hw-card-meta">
          KEY {sampleSong.originalKey} · {sampleSong.bpm} BPM · {sampleSong.sections.length} SECTIONS
        </div>
      </div>
    </div>
  );
}
