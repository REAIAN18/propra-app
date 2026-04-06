"use client";

import { Component, ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class DealScopeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    const msg = error?.message ?? "An unexpected error occurred.";
    return { hasError: true, message: msg };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[DealScope]", error, info.componentStack);
    }
  }

  reset = () => this.setState({ hasError: false, message: "" });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            padding: "20px",
            background: "rgba(240,96,96,.06)",
            border: "1px solid rgba(240,96,96,.2)",
            borderRadius: 10,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 20, marginBottom: 8, opacity: 0.7 }}>⚠</div>
          <p style={{ fontSize: 12, color: "var(--tx3)", margin: "0 0 12px" }}>
            {this.state.message || "This section failed to load."}
          </p>
          <button
            onClick={this.reset}
            style={{
              padding: "5px 14px",
              borderRadius: 7,
              border: "1px solid var(--s3)",
              background: "var(--s2)",
              color: "var(--tx2)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--sans, 'DM Sans', sans-serif)",
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
