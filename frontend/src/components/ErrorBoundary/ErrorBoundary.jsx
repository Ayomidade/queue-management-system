import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-body, system-ui, sans-serif)",
            background: "var(--paper, #efe6cf)",
            color: "var(--ink, #101f17)",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 480 }}>
            <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
              Something went wrong
            </h1>
            <p style={{ opacity: 0.7, marginBottom: "1.5rem" }}>
              An unexpected error interrupted the page. You can try reloading or
              head back to the home page.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: "0.6rem 1.4rem",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--brand-primary, #4fa37b)",
                  color: "var(--ink, #101f17)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Reload page
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  padding: "0.6rem 1.4rem",
                  borderRadius: 8,
                  border: "1px solid var(--ink, #101f17)",
                  background: "transparent",
                  color: "var(--ink, #101f17)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
