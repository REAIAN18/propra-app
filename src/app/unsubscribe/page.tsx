"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function UnsubscribeContent() {
  const params = useSearchParams();
  const done = params.get("done") === "1";
  const error = params.get("error") === "1";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: "var(--bg, #09090b)" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-12">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--grn, #34d399)" }} />
          <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: "var(--tx, #e4e4ec)", letterSpacing: "0.12em" }}>
            RealHQ
          </span>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ backgroundColor: "var(--s1, #111116)", border: "1px solid var(--bdr, #252533)" }}
        >
          {done ? (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--grn, #34d399)" }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3.5 9L7.5 13L14.5 6" stroke="var(--bg, #09090b)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold" style={{ color: "var(--tx, #e4e4ec)" }}>
                  You&apos;re unsubscribed
                </h1>
              </div>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--tx2, #8888a0)" }}>
                You&apos;ve been removed from RealHQ&apos;s follow-up emails. You won&apos;t hear from us again unless you reach out directly.
              </p>
              <p className="text-sm" style={{ color: "var(--tx3, #555568)" }}>
                If you change your mind, you can email us at{" "}
                <a href="mailto:hello@realhq.com" style={{ color: "var(--acc, #7c6af0)" }}>hello@realhq.com</a>.
              </p>
            </>
          ) : error ? (
            <>
              <h1 className="text-xl font-semibold mb-3" style={{ color: "var(--tx, #e4e4ec)" }}>
                Invalid unsubscribe link
              </h1>
              <p className="text-sm mb-5" style={{ color: "var(--tx2, #8888a0)" }}>
                This link appears to be invalid or expired. To unsubscribe, reply to any email from us and we&apos;ll remove you immediately.
              </p>
              <a href="mailto:hello@realhq.com?subject=Unsubscribe" style={{ color: "var(--acc, #7c6af0)", fontSize: "14px" }}>
                Email hello@realhq.com to unsubscribe →
              </a>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold mb-3" style={{ color: "var(--tx, #e4e4ec)" }}>
                Unsubscribe
              </h1>
              <p className="text-sm" style={{ color: "var(--tx2, #8888a0)" }}>
                Use the unsubscribe link in any of our emails, or reply to any email and we&apos;ll remove you immediately.
              </p>
            </>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-xs hover:opacity-70 transition-opacity" style={{ color: "var(--tx3, #555568)" }}>
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
