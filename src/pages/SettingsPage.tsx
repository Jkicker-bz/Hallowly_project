import { isBackendConfigured } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTheme, type Accent } from "../context/ThemeContext";

const ACCENTS: { value: Accent; label: string; hex: string }[] = [
  { value: "amethyst", label: "Amethyst Pneuma", hex: "#9B59B6" },
  { value: "lumen", label: "Warm Lumen", hex: "#E67E22" },
  { value: "bronze", label: "Bronze Consecration", hex: "#A0815E" },
  { value: "flow", label: "Resonant Flow", hex: "#1ABC9C" },
];

export function SettingsPage() {
  const { mode, accent, setMode, setAccent } = useTheme();
  const { user, signInAs } = useAuth();

  return (
    <div>
      <h1 className="hw-page-title">Settings</h1>
      <p className="hw-page-subtitle">Your Personal Hallow — how the app feels to you.</p>

      <div className="hw-card">
        <div className="hw-card-title">Mode</div>
        <div className="hw-card-meta" style={{ marginTop: 8 }}>
          <button
            onClick={() => setMode("dark")}
            style={{
              marginRight: 8,
              opacity: mode === "dark" ? 1 : 0.5,
              background: "none",
              border: "1px solid var(--hw-border)",
              color: "var(--hw-ink)",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Dark
          </button>
          <button
            onClick={() => setMode("light")}
            style={{
              opacity: mode === "light" ? 1 : 0.5,
              background: "none",
              border: "1px solid var(--hw-border)",
              color: "var(--hw-ink)",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Light
          </button>
        </div>
      </div>

      <div className="hw-card">
        <div className="hw-card-title">Accent — the Breath</div>
        <div className="hw-accent-swatch-row">
          {ACCENTS.map((a) => (
            <button
              key={a.value}
              className={"hw-accent-swatch" + (accent === a.value ? " active" : "")}
              style={{ background: a.hex }}
              title={a.label}
              onClick={() => setAccent(a.value)}
            />
          ))}
        </div>
      </div>

      {!isBackendConfigured && <div className="hw-card">
        <div className="hw-card-title">Preview as</div>
        <div className="hw-card-meta" style={{ marginTop: 8 }}>
          <button
            onClick={() => signInAs("lead")}
            style={{
              marginRight: 8,
              opacity: user?.role === "lead" ? 1 : 0.5,
              background: "none",
              border: "1px solid var(--hw-border)",
              color: "var(--hw-ink)",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Team Lead
          </button>
          <button
            onClick={() => signInAs("member")}
            style={{
              opacity: user?.role === "member" ? 1 : 0.5,
              background: "none",
              border: "1px solid var(--hw-border)",
              color: "var(--hw-ink)",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Team Member
          </button>
        </div>
      </div>}
    </div>
  );
}
