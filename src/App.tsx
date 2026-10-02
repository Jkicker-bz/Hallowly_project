import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./theme/tokens.css";
import "./theme/app-shell.css";
import "./theme/onstage.css";
import "./theme/design.css";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LibraryProvider } from "./context/LibraryContext";
import { AppShell } from "./components/layout/AppShell";

import { HomePage } from "./pages/HomePage";
import { SetlistsPage } from "./pages/SetlistsPage";
import { LibraryPage } from "./pages/LibraryPage";
import { TeamPage } from "./pages/TeamPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ScreenRoute } from "./screens/ScreenRoute";
import { PerformPage } from "./pages/PerformPage";

/**
 * The foundation: providers (who's signed in, what theme they've chosen)
 * wrap a router that mounts every screen inside the shared AppShell,
 * except the full-bleed performance view, which intentionally breaks out
 * of the tab bar/header chrome since it's meant to be used hands-free
 * mid-service.
 */
export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LibraryProvider>
          <BrowserRouter>
            <Routes>
            <Route path="/" element={<ScreenRoute name="landing" />} />
            <Route path="/song/:songId" element={<ScreenRoute name="song-detail" />} />
            <Route path="/chord-editor/:songId" element={<ScreenRoute name="chord-editor" />} />
            <Route path="/setlists/:setlistId/perform/:songId" element={<PerformPage />} />
            <Route path="/manage" element={<AppShell />}>
              <Route index element={<HomePage />} />
              <Route path="setlists" element={<SetlistsPage />} />
              <Route path="library" element={<LibraryPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="/:name" element={<ScreenRoute />} />
          </Routes>
          </BrowserRouter>
        </LibraryProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
