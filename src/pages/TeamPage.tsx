import { RequireLead } from "../components/layout/RequireLead";
import { useAuth } from "../context/AuthContext";

export function TeamPage() {
  const { team } = useAuth();

  return (
    <RequireLead>
      <h1 className="hw-page-title">{team?.name}</h1>
      <p className="hw-page-subtitle">Roles, availability, and scheduling.</p>

      <div className="hw-card">
        <div className="hw-card-title">Volunteer roster</div>
        <div className="hw-card-meta">SCHEDULING COMING SOON</div>
      </div>
    </RequireLead>
  );
}
