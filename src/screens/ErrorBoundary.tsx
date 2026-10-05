import { Component, type ReactNode } from "react";
import { Logo } from "../components/Logo";

/** A broken screen shows a message in the app's style instead of blanking everything. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.error("Screen crashed", e); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="hw-loader" role="alert">
        <Logo size={44} />
        <span>Something went wrong</span>
        <button className="hw-btn" onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
}
