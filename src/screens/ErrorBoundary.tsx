import { Component, type ReactNode } from "react";

/** A broken screen shows a message instead of blanking the whole app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.error("Screen crashed", e); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" style={{ padding: 24, color: "#C0C0C0", fontFamily: "Montserrat, sans-serif", fontSize: 13 }}>
        <p style={{ marginBottom: 14 }}>Something went wrong loading this page.</p>
        <button onClick={() => window.location.reload()} style={{ background: "none", border: ".5px solid rgba(255,255,255,.2)", color: "#FDFDFD", padding: "9px 16px", borderRadius: 3, cursor: "pointer" }}>Reload</button>
      </div>
    );
  }
}
