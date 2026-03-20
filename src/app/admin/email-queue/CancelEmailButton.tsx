"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelEmailButton({ id }: { id: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const router = useRouter();

  async function cancel() {
    setState("loading");
    try {
      const res = await fetch("/api/admin/cancel-scheduled-email", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed");
      }
      setState("done");
      router.refresh();
    } catch (err) {
      console.error(err);
      setState("error");
    }
  }

  if (state === "done") return null;

  return (
    <button
      onClick={cancel}
      disabled={state === "loading"}
      title="Cancel this scheduled email"
      className="text-xs hover:opacity-80 disabled:opacity-40 transition-opacity shrink-0"
      style={{ color: state === "error" ? "#FF8080" : "#3d5a72" }}
    >
      {state === "loading" ? "…" : state === "error" ? "err" : "cancel"}
    </button>
  );
}
