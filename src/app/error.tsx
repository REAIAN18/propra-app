"use client";

import Link from "next/link";
import { useEffect } from "react";

const SERIF = "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to Sentry or console
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "#0B1622" }}
    >
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2.5 mb-12 hover:opacity-80 transition-opacity">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
          <span
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: "#e8eef5", letterSpacing: "0.12em" }}
          >
            Arca
          </span>
        </Link>

        <div
          className="text-6xl font-bold mb-4"
          style={{ fontFamily: SERIF, color: "#1a2d45" }}
        >
          500
        </div>

        <h1
          className="text-2xl font-semibold mb-3"
          style={{ fontFamily: SERIF, color: "#e8eef5" }}
        >
          Something went wrong
        </h1>

        <p className="text-sm mb-10" style={{ color: "#5a7a96" }}>
          An unexpected error occurred. Our team has been notified.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 hover:scale-[1.01]"
            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
          >
            Try again →
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-70"
            style={{ color: "#5a7a96", border: "1px solid #1a2d45" }}
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
