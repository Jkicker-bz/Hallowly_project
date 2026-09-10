import { useAuth } from "../context/AuthContext";

export function HomePage() {
  const { user, isLead } = useAuth();

  return (
    <div>
      <h1 className="hw-page-title">
        {isLead ? "Good morning, Lead." : `Good morning, ${user?.name}.`}
      </h1>
      <p className="hw-page-subtitle">
        {isLead
          ? "Nothing urgent needs your attention before Sunday."
          : "Your part for Sunday is ready whenever you are."}
      </p>

      <div className="hw-card">
        <div className="hw-card-title">Sunday Service</div>
        <div className="hw-card-meta">SEP 14 · 6 SONGS · KEY CHANGES CONFIRMED</div>
      </div>
    </div>
  );
}
