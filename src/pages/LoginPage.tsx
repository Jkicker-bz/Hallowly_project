import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { signInWithEmail, signedIn } = useAuth();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (signedIn) return <div className="hw-card"><div className="hw-card-title">You're signed in.</div></div>;

  return (
    <div>
      <h1 className="hw-page-title">Sign in</h1>
      <p className="hw-page-subtitle">We'll email you a link. No password needed.</p>
      <form className="hw-card" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setMsg((await signInWithEmail(email)) ?? "Check your email for the sign-in link."); setBusy(false); }}>
        <div className="hw-form-row">
          <label htmlFor="email">EMAIL</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button className="hw-btn-primary" disabled={busy}>{busy ? "Sending…" : "Send link"}</button>
        {msg && <p className="hw-card-meta" role="status" style={{ marginTop: 12 }}>{msg}</p>}
      </form>
    </div>
  );
}
