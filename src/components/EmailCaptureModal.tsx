"use client";

import { useState } from "react";

type EmailCaptureModalProps = {
  isOpen: boolean;
  tenantName: string;
  tenantId: string;
  onEmailCaptured: (email: string) => void;
  onDecline: () => void;
  onClose: () => void;
};

export function EmailCaptureModal({
  isOpen,
  tenantName,
  tenantId,
  onEmailCaptured,
  onDecline,
  onClose,
}: EmailCaptureModalProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Email address is required");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/user/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update tenant email");
      }

      onEmailCaptured(email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update email");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSubmitting) {
      handleSubmit();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(9, 9, 11, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--s1)",
          border: "1px solid var(--bdr)",
          borderRadius: "12px",
          maxWidth: "480px",
          width: "100%",
          padding: "32px",
          animation: "enter 0.3s ease both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: "9px",
            fontWeight: 500,
            color: "var(--acc)",
            textTransform: "uppercase",
            letterSpacing: "2px",
            marginBottom: "12px",
          }}
        >
          EMAIL REQUIRED
        </div>

        <h2
          style={{
            fontFamily: "var(--serif)",
            fontSize: "24px",
            fontWeight: 400,
            color: "var(--tx)",
            marginBottom: "8px",
            letterSpacing: "-0.02em",
          }}
        >
          Send correspondence to {tenantName}
        </h2>

        <p
          style={{
            fontSize: "13px",
            fontWeight: 300,
            color: "var(--tx3)",
            lineHeight: 1.6,
            marginBottom: "24px",
          }}
        >
          We don't have an email address on file for this tenant. Please provide one
          to send this correspondence, or download as PDF to send manually.
        </p>

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "11px",
              fontWeight: 500,
              color: "var(--tx2)",
              marginBottom: "6px",
            }}
          >
            Tenant email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            onKeyDown={handleKeyDown}
            placeholder="tenant@example.com"
            autoFocus
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "var(--s2)",
              border: `1.5px solid ${error ? "var(--red-bdr)" : "var(--bdr)"}`,
              borderRadius: "9px",
              fontSize: "14px",
              color: "var(--tx)",
              outline: "none",
              transition: "all 0.15s",
            }}
            onFocus={(e) => {
              if (!error) {
                e.target.style.borderColor = "var(--acc-bdr)";
                e.target.style.boxShadow = "0 0 0 3px var(--acc-dim)";
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = error ? "var(--red-bdr)" : "var(--bdr)";
              e.target.style.boxShadow = "none";
            }}
          />
          {error && (
            <div
              style={{
                fontSize: "11px",
                color: "var(--red)",
                marginTop: "6px",
              }}
            >
              {error}
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{
            width: "100%",
            height: "46px",
            background: isSubmitting ? "var(--s3)" : "var(--acc)",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: isSubmitting ? "not-allowed" : "pointer",
            transition: "all 0.15s",
            marginBottom: "8px",
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.background = "#6d5ce0";
              e.currentTarget.style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.background = "var(--acc)";
              e.currentTarget.style.transform = "translateY(0)";
            }
          }}
        >
          {isSubmitting ? "Saving..." : "Save email and continue"}
        </button>

        <button
          onClick={onDecline}
          disabled={isSubmitting}
          style={{
            width: "100%",
            height: "42px",
            background: "transparent",
            color: "var(--tx2)",
            border: "1px solid var(--bdr)",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 500,
            cursor: isSubmitting ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.borderColor = "var(--tx3)";
              e.currentTarget.style.color = "var(--tx)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.borderColor = "var(--bdr)";
              e.currentTarget.style.color = "var(--tx2)";
            }
          }}
        >
          Download as PDF instead
        </button>

        <div
          style={{
            fontSize: "11px",
            color: "var(--tx3)",
            textAlign: "center",
            marginTop: "16px",
            lineHeight: 1.5,
          }}
        >
          This email will be saved to the tenant's profile for future correspondence.
        </div>
      </div>
    </div>
  );
}
