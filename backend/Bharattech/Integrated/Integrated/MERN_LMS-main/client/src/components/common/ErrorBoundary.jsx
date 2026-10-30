import { Component } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * BharatTech ErrorBoundary
 * Catches unhandled React render errors and displays a branded fallback UI.
 * Wrap around any subtree that may throw during rendering.
 */
export class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("ErrorBoundary:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-50">
          <AlertTriangle
            className="w-16 h-16 mb-4"
            style={{ color: "var(--brand-primary)" }}
          />
          <h2 className="text-xl font-bold text-gray-900">
            Something went wrong
          </h2>
          <p className="text-gray-500 mt-2">Our team has been notified.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 text-white rounded-lg font-medium"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
