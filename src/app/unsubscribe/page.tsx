"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function UnsubscribeContent() {
  const params = useSearchParams();
  const done = params.get("done") === "1";
  const error = params.get("error") === "1";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: "#F9FAFB" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-12">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0A8A4C" }} />
          <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: "#111827", letterSpacing: "0.12em" }}>
            RealHQ
          </span>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
        >
          {done ? (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#0A8A4C" }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3.5 9L7.5 13L14.5 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold" style={{ color: "#111827" }}>
                  You&apos;re unsubscribed
                </h1>
              </div>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "#6B7280" }}>
                You&apos;ve been removed from RealHQ&apos;s follow-up emails. You won&apos;t hear from us again unless you reach out directly.
              </p>
              <p className="text-sm" style={{ color: "#9CA3AF" }}>
                If you change your mind, you can always{" "}
                <a href="/book" style={{ color: "#0A8A4C" }}>
                  book a call
                </a>{" "}
                or email us at{" "}
                <a href="mailto:hello@realhq.com" style={{ color: "#0A8A4C" }}>hello@realhq.com</a>.
              </p>
            </>
          ) : error ? (
            <>
              <h1 className="text-xl font-semibold mb-3" style={{ color: "#111827" }}>
                Invalid unsubscribe link
              </h1>
              <p className="text-sm mb-5" style={{ color: "#6B7280" }}>
                This link appears to be invalid or expired. To unsubscribe, reply to any email from us and we&apos;ll remove you immediately.
              </p>
              <a href="mailto:hello@realhq.com?subject=Unsubscribe" style={{ color: "#0A8A4C", fontSize: "14px" }}>
                Email hello@realhq.com to unsubscribe →
              </a>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold mb-3" style={{ color: "#111827" }}>
                Unsubscribe
              </h1>
              <p className="text-sm" style={{ color: "#6B7280" }}>
                Use the unsubscribe link in any of our emails, or reply to any email and we&apos;ll remove you immediately.
              </p>
            </>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-xs hover:opacity-70 transition-opacity" style={{ color: "#D1D5DB" }}>
            ← Back to RealHQ
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  );
}
