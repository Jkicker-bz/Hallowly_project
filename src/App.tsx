import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./theme/tokens.css";
import "./theme/app-shell.css";
import "./theme/onstage.css";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LibraryProvider } from "./context/LibraryContext";
import { AppShell } from "./components/layout/AppShell";

import { HomePage } from "./pages/HomePage";
import { SetlistsPage } from "./pages/SetlistsPage";
import { LibraryPage } from "./pages/LibraryPage";
import { TeamPage } from "./pages/TeamPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LoginPage } from "./pages/LoginPage";
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
              <Route element={<AppShell />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/setlists" element={<SetlistsPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/team" element={<TeamPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/login" element={<LoginPage />} />
              </Route>
              <Route path="/setlists/:setlistId/perform/:songId" element={<PerformPage />} />
            </Routes>
          </BrowserRouter>
        </LibraryProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
