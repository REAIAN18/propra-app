import Link from "next/link";

const SERIF = "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif";

export default function NotFound() {
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
            RealHQ
          </span>
        </Link>

        <div
          className="text-6xl font-bold mb-4"
          style={{ fontFamily: SERIF, color: "#1a2d45" }}
        >
          404
        </div>

        <h1
          className="text-2xl font-semibold mb-3"
          style={{ fontFamily: SERIF, color: "#e8eef5" }}
        >
          Page not found
        </h1>

        <p className="text-sm mb-10" style={{ color: "#5a7a96" }}>
          This page doesn&apos;t exist or has moved.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 hover:scale-[1.01]"
            style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
          >
            Explore the demo →
          </Link>
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
