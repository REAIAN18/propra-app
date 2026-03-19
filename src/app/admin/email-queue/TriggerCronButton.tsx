"use client";

import { useState } from "react";

export function TriggerCronButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<{ sent?: number; failed?: number } | null>(null);

  async function flush() {
    setState("loading");
    try {
      const res = await fetch("/api/cron/send-emails", { method: "GET" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResult(data);
      setState("done");
    } catch (err) {
      console.error(err);
      setState("error");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={flush}
        disabled={state === "loading"}
        className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80 disabled:opacity-50"
        style={{ backgroundColor: "#1a2d45", color: "#8ba0b8", border: "1px solid #1a2d45" }}
      >
        {state === "loading" ? "Flushing…" : "Flush queue now"}
      </button>
      {state === "done" && result && (
        <span className="text-xs" style={{ color: "#0A8A4C" }}>
          ✓ sent {result.sent ?? 0}{result.failed ? `, ${result.failed} failed` : ""}
        </span>
      )}
      {state === "error" && (
        <span className="text-xs" style={{ color: "#FF8080" }}>
          Failed — check CRON_SECRET env var
        </span>
      )}
    </div>
  );
}
