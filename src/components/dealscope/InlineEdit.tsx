"use client";

import { useState, useRef, useEffect } from "react";

interface InlineEditProps {
  value: string | number;
  onSave: (value: string) => void;
  type?: "text" | "number" | "currency";
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export function InlineEdit({
  value,
  onSave,
  type = "text",
  placeholder,
  style,
  disabled = false,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function handleCommit() {
    setEditing(false);
    if (draft !== String(value)) {
      onSave(draft);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleCommit();
    if (e.key === "Escape") {
      setDraft(String(value));
      setEditing(false);
    }
  }

  if (editing && !disabled) {
    return (
      <input
        ref={inputRef}
        type={type === "currency" || type === "number" ? "number" : "text"}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          background: "var(--s2)",
          border: "1px solid var(--acc)",
          borderRadius: 4,
          color: "var(--tx)",
          fontFamily: "inherit",
          fontSize: "inherit",
          padding: "1px 6px",
          outline: "none",
          minWidth: 80,
          ...style,
        }}
      />
    );
  }

  return (
    <span
      onClick={() => !disabled && setEditing(true)}
      title={disabled ? undefined : "Click to edit"}
      style={{
        cursor: disabled ? "default" : "pointer",
        borderBottom: disabled ? undefined : "1px dashed var(--tx3)",
        ...style,
      }}
    >
      {value || placeholder || "—"}
      {!disabled && (
        <span
          style={{
            marginLeft: 4,
            fontSize: "0.85em",
            opacity: 0.5,
            color: "var(--acc2)",
          }}
        >
          ✎
        </span>
      )}
    </span>
  );
}
