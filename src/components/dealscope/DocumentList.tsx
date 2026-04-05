"use client";

/* ═══════════════════════════════════════════════════
   DocumentList — DS-T15 — matches 02-dossier-full.html
   List of documents with icon, name, description, action button
   ═══════════════════════════════════════════════════ */

export interface DocumentItem {
  type: "pdf" | "xlsx" | "doc" | "csv" | string;
  name: string;
  description?: string;
  url?: string;
  action?: "download" | "generate";
  onAction?: () => void;
  disabled?: boolean;
}

interface DocumentListProps {
  items: DocumentItem[];
}

export function DocumentList({ items }: DocumentListProps) {
  if (!items || items.length === 0) {
    return (
      <div style={{ padding: 10, background: "var(--s2)", borderRadius: 6, border: "1px dashed var(--s3)", fontSize: 11, color: "var(--tx3)", textAlign: "center" }}>
        No documents available
      </div>
    );
  }

  return (
    <div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 10,
            padding: "10px 0",
            borderBottom: i < items.length - 1 ? "1px solid rgba(255,255,255,.02)" : "none",
            alignItems: "center",
            transition: ".15s",
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 30,
              height: 30,
              background: "linear-gradient(135deg, var(--s2), var(--s3, #1f1f2c))",
              borderRadius: 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              color: "var(--tx2)",
              flexShrink: 0,
              fontWeight: 600,
              textTransform: "uppercase" as const,
            }}
          >
            {item.type.slice(0, 4)}
          </div>

          {/* Name + description */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--tx)" }}>{item.name}</div>
            {item.description && (
              <div style={{ fontSize: 9, color: "var(--tx3)" }}>{item.description}</div>
            )}
          </div>

          {/* Action button */}
          {(item.action || item.onAction || item.url) && (
            item.url && item.action !== "generate" ? (
              <a
                href={item.url}
                download
                style={{
                  padding: "5px 11px",
                  borderRadius: 8,
                  border: "1px solid var(--s3, #1f1f2c)",
                  background: "var(--s2)",
                  color: "var(--tx2)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "none",
                  fontFamily: "'DM Sans', sans-serif",
                  display: "inline-block",
                }}
              >
                Download
              </a>
            ) : (
              <button
                onClick={item.onAction}
                disabled={item.disabled}
                style={{
                  padding: "5px 11px",
                  borderRadius: 8,
                  border: item.action === "generate" ? "none" : "1px solid var(--s3, #1f1f2c)",
                  background: item.action === "generate" ? "var(--acc)" : "var(--s2)",
                  color: item.action === "generate" ? "#fff" : "var(--tx2)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: item.disabled ? "not-allowed" : "pointer",
                  opacity: item.disabled ? 0.5 : 1,
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: item.action === "generate" ? "0 2px 12px rgba(124,106,240,.25)" : "none",
                }}
              >
                {item.action === "generate" ? "Generate" : "Download"}
              </button>
            )
          )}
        </div>
      ))}
    </div>
  );
}
