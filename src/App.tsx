import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./theme/tokens.css";
import "./theme/onstage.css";
import "./theme/design.css";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LibraryProvider } from "./context/LibraryContext";
import { PerformPage } from "./pages/PerformPage";
import { SongRoute } from "./pages/SongRoute";
import { ScreenRoute } from "./screens/ScreenRoute";

/** Every page is one of the designed screens; the phone chord viewer is the only React-built view. */
export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LibraryProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<ScreenRoute name="landing" />} />
              <Route path="/song/:songId" element={<SongRoute />} />
              <Route path="/create-setlist/:setlistId" element={<ScreenRoute name="create-setlist" />} />
              <Route path="/s/:listId" element={<ScreenRoute name="setlist-public" />} />
              <Route path="/chord-editor/:songId" element={<ScreenRoute name="chord-editor" />} />
              <Route path="/setlists/:setlistId/perform/:songId" element={<PerformPage />} />
              <Route path="/:name" element={<ScreenRoute />} />
            </Routes>
          </BrowserRouter>
        </LibraryProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
