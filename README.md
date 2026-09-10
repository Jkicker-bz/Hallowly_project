# Hallowly

"Ease the worry of those serving." A worship-team platform for planning
services, managing song libraries, and running the live on-stage
performance view — built for two personas from the ground up:

- **Team Lead** (Database/Logic) — setlist building, scheduling, library management
- **Team Member / Public** (Service/Spirit) — their assigned setlists, the calm
  hands-free on-stage reading view

## Stack

React + TypeScript + Vite, on web for now. Written so it can grow into a
React Native mobile app without a rewrite — see "Architecture notes" below.

## Getting started

```bash
npm install
npm run dev
```

## Architecture notes

**No monorepo yet, on purpose.** `src/lib/` and `src/types/` are kept
strictly framework-agnostic (no React or DOM imports) so they can be lifted
into a shared package later with a file move, not a rewrite, once mobile
work starts and reveals what actually needs sharing.

**One exception:** `src/lib/measureText.ts` uses the Canvas API to measure
proportional-font text width for pixel-precise chord alignment. This is
web-only — React Native will need a platform-specific twin of this module
(measured via `onLayout` or a text-metrics library instead).

**Persona split lives in content, not in two apps.** `AuthContext` exposes
`role`; `AppShell` filters which tabs render based on it. Everything else —
header, tab bar mechanics, routing — is shared.

## Structure

```
src/
  types/       Song, Setlist, User/Team/Role — the shared data model
  lib/         chordpro.ts (parser), measureText.ts (alignment),
               timing.ts (autoscroll estimate -> real timestamp later)
  context/     AuthContext, ThemeContext (mode + Personal Hallow accent)
  components/  ChordLyricLine, OnStageView, layout/AppShell + RequireLead
  pages/       Home, Setlists, Library, Team, Settings, Perform
  theme/       tokens.css (brand system as CSS variables) + component CSS
  data/        sampleSong.ts -- placeholder content, not from any real song
```

## Brand system

Colors, type, and spacing are implemented as CSS custom properties in
`src/theme/tokens.css`. Switch the Personal Hallow accent or mode by
changing `data-accent` / `data-theme` on `<html>` -- `ThemeContext` does
this automatically and persists the choice.

## Status

Foundation stage: auth (mocked), theming, routing/shell, and the on-stage
chord/lyric renderer are working end to end. No backend yet -- `src/data/`
holds placeholder content standing in for what a real API will serve.
