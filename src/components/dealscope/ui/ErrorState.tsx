"use client";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = "Something went wrong.", onRetry }: ErrorStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        gap: 10,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 28, opacity: 0.7 }}>⚠</div>
      <p style={{ fontSize: 13, color: "var(--tx3)", margin: 0, maxWidth: 320, lineHeight: 1.5 }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 4,
            padding: "6px 16px",
            borderRadius: 8,
            border: "1px solid var(--s3)",
            background: "var(--s2)",
            color: "var(--tx2)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--sans, 'DM Sans', sans-serif)",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
