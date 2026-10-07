import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { failed: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Hallowly application error", error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="fatal-error" role="alert">
        <div>
          <p>HALLOWLY</p>
          <h1>Something went quiet.</h1>
          <span>The application encountered an unexpected problem. Your account data is safe.</span>
          <button onClick={() => window.location.reload()}>Reload Hallowly</button>
        </div>
      </main>
    );
  }
}
