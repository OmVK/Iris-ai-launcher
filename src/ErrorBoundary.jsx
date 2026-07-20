import React from "react";
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, retryCount: 0 };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  handleRetry = () => {
    if (this.state.retryCount >= 5) {
      window.location.reload()
      return
    }
    this.setState({ hasError: false, error: null, errorInfo: null, retryCount: this.state.retryCount + 1 });
  }
  render() {
    if (this.state.hasError) {
      const maxRetriesReached = this.state.retryCount >= 5
      return (
        <div style={{ padding: 20, color: "#dfe2ef", backgroundColor: "#020617", zIndex: 9999, position: "fixed", inset: 0, overflow: "auto", fontFamily: "monospace" }}>
          <h1 style={{ color: "#ff1744", fontSize: 16, marginBottom: 8 }}>SYSTEM ERROR // COGNITIVE CORE EXCEPTION</h1>
          <p style={{ color: "#8892a4", fontSize: 11, marginBottom: 12 }}>IRIS encountered an unexpected error and needs to recover.</p>
          <details style={{ whiteSpace: "pre-wrap", fontSize: 10, color: "#8892a4", marginBottom: 16 }}>
            <summary style={{ color: "#00f2ff", cursor: "pointer", marginBottom: 8 }}>Click for error details</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          {!maxRetriesReached ? (
            <button
              onClick={this.handleRetry}
              style={{ padding: "8px 16px", backgroundColor: "rgba(0,242,255,0.1)", border: "1px solid rgba(0,242,255,0.4)", color: "#00f2ff", cursor: "pointer", fontSize: 11, fontWeight: "bold", borderRadius: 4 }}
            >
              RESTART SYSTEM ({this.state.retryCount + 1}/5)
            </button>
          ) : (
            <p style={{ color: "#ff1744", fontSize: 11, marginBottom: 8 }}>Max retries reached. Reloading...</p>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{ marginLeft: 8, padding: "8px 16px", backgroundColor: "rgba(255,23,68,0.1)", border: "1px solid rgba(255,23,68,0.4)", color: "#ff1744", cursor: "pointer", fontSize: 11, fontWeight: "bold", borderRadius: 4 }}
          >
            FORCE RELOAD
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
