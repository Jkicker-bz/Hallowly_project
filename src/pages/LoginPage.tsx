import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { signInWithEmail, verifyCode, signedIn } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (signedIn) return <Navigate to="/" replace />;

  const run = async (fn: () => Promise<string | null>, ok?: () => void) => {
    setBusy(true);
    const err = await fn();
    setMsg(err ?? "");
    if (!err) ok?.();
    setBusy(false);
  };

  return (
    <div>
      <h1 className="hw-page-title">Sign in</h1>
      <p className="hw-page-subtitle">{sent ? "Enter the code from your email, or tap the link in it." : "We'll email you a code. No password needed."}</p>
      <form className="hw-card" onSubmit={(e) => { e.preventDefault(); run(() => (sent ? verifyCode(email, code) : signInWithEmail(email)), () => setSent(true)); }}>
        <div className="hw-form-row">
          <label htmlFor="email">EMAIL</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={sent} required />
        </div>
        {sent && (
          <div className="hw-form-row">
            <label htmlFor="code">CODE</label>
            <input id="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
        )}
        <div className="hw-row">
          <button className="hw-btn-primary" disabled={busy}>{busy ? "Working…" : sent ? "Verify" : "Send code"}</button>
          {sent && <button type="button" className="hw-mini" onClick={() => { setSent(false); setCode(""); setMsg(""); }}>Use a different email</button>}
        </div>
        {msg && <p className="hw-card-meta" role="alert" style={{ marginTop: 12 }}>{msg}</p>}
      </form>
    </div>
  );
}
