"use client";

import { useState } from "react";

export function CopyLink({ url, label = "Copy booking link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs font-medium transition-opacity hover:opacity-70 shrink-0"
      style={{ color: copied ? "#0A8A4C" : "#9CA3AF" }}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
