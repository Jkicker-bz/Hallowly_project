// ---------------------------------------------------------------------------
// Everything the Lead persona actually needs to write: new songs, new
// setlists, adding a song to a setlist. Lives in React state for now
// (seeded from data/store.ts), so it behaves like real app data — added
// songs show up in the Library immediately, added setlist entries show up
// in Setlists immediately — without a backend existing yet.
//
// When a real API exists, `addSong`/`addSetlist`/`addSongToSetlist` become
// calls that optimistically update state and POST in the background. No
// consuming page needs to change, because they only ever call these
// functions, never touch storage directly.
// ---------------------------------------------------------------------------

import { createContext, useContext, useState, type ReactNode } from "react";
import { parseSongBody } from "../lib/chordpro";
import type { Setlist, SetlistEntry, Song } from "../types/song";
import { songs as seedSongs, setlists as seedSetlists } from "../data/store";

export interface NewSongInput {
  title: string;
  originalKey: string;
  bpm?: number;
  /** ChordPro-style shorthand, e.g. "{section: verse 1}\n[G]Lyric text" */
  body: string;
}

export interface NewSetlistInput {
  serviceTitle: string;
  serviceDate: string;
}

interface LibraryContextValue {
  songs: Song[];
  setlists: Setlist[];
  getSongById: (id: string) => Song | undefined;
  getSetlistById: (id: string) => Setlist | undefined;
  addSong: (input: NewSongInput) => Song;
  addSetlist: (input: NewSetlistInput) => Setlist;
  addSongToSetlist: (setlistId: string, entry: SetlistEntry) => void;
  removeSongFromSetlist: (setlistId: string, songId: string) => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

let idCounter = 100;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [songs, setSongs] = useState<Song[]>(seedSongs);
  const [setlists, setSetlists] = useState<Setlist[]>(seedSetlists);

  const addSong = (input: NewSongInput): Song => {
    const song: Song = {
      id: nextId("song"),
      title: input.title.trim(),
      originalKey: input.originalKey.trim() || "C",
      bpm: input.bpm,
      sections: parseSongBody(input.body),
    };
    setSongs((prev) => [...prev, song]);
    return song;
  };

  const addSetlist = (input: NewSetlistInput): Setlist => {
    const setlist: Setlist = {
      id: nextId("setlist"),
      serviceTitle: input.serviceTitle.trim() || "Untitled Service",
      serviceDate: input.serviceDate,
      entries: [],
    };
    setSetlists((prev) => [...prev, setlist]);
    return setlist;
  };

  const addSongToSetlist = (setlistId: string, entry: SetlistEntry) => {
    setSetlists((prev) =>
      prev.map((s) =>
        s.id === setlistId
          ? { ...s, entries: [...s.entries.filter((e) => e.songId !== entry.songId), entry] }
          : s
      )
    );
  };

  const removeSongFromSetlist = (setlistId: string, songId: string) => {
    setSetlists((prev) =>
      prev.map((s) =>
        s.id === setlistId ? { ...s, entries: s.entries.filter((e) => e.songId !== songId) } : s
      )
    );
  };

  return (
    <LibraryContext.Provider
      value={{
        songs,
        setlists,
        getSongById: (id) => songs.find((s) => s.id === id),
        getSetlistById: (id) => setlists.find((s) => s.id === id),
        addSong,
        addSetlist,
        addSongToSetlist,
        removeSongFromSetlist,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside <LibraryProvider>");
  return ctx;
}
