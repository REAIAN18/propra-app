"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface PortalData {
  room: {
    id: string;
    type: string;
    buyer: string | null;
    seller: string | null;
    assetName: string | null;
    assetAddress: string | null;
  };
  nda: {
    id: string;
    status: "pending" | "sent" | "signed" | "declined";
    signerName: string;
    signerEmail: string;
  } | null;
  documents: Array<{
    id: string;
    name: string;
    category: string;
  }>;
  ownerName: string;
}

export default function PortalPage() {
  const params = useParams();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");

  useEffect(() => {
    async function loadPortal() {
      try {
        const res = await fetch(`/api/portal/${params.id}`);
        if (!res.ok) throw new Error("Portal not found");
        const portalData = await res.json();
        setData(portalData);
        if (portalData.nda) {
          setSignerName(portalData.nda.signerName || "");
          setSignerEmail(portalData.nda.signerEmail || "");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load portal");
      } finally {
        setLoading(false);
      }
    }
    if (params.id) loadPortal();
  }, [params.id]);

  async function handleSignNDA() {
    if (!signerName.trim() || !signerEmail.trim()) {
      alert("Please enter your name and email");
      return;
    }
    setSigning(true);
    try {
      const res = await fetch(`/api/portal/${params.id}/sign-nda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName, signerEmail }),
      });
      if (!res.ok) throw new Error("Failed to sign NDA");
      const updated = await res.json();
      setData((prev) => prev ? { ...prev, nda: updated.nda } : null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to sign NDA");
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)", color: "var(--tx3)" }}
      >
        Loading portal…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)" }}
      >
        <div className="text-center">
          <div className="text-lg font-medium mb-2" style={{ color: "var(--tx)" }}>
            Portal Not Found
          </div>
          <div className="text-sm" style={{ color: "var(--tx3)" }}>
            {error || "This portal link may have expired or been removed."}
          </div>
        </div>
      </div>
    );
  }

  const ndaSigned = data.nda?.status === "signed";

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {/* Nav */}
      <div
        className="flex items-center justify-between px-7 py-3.5"
        style={{
          background: "var(--s1)",
          borderBottom: "1px solid var(--bdr)",
          height: "56px",
        }}
      >
        <div
          className="text-lg"
          style={{
            fontFamily: "var(--serif)",
            color: "var(--tx)",
          }}
        >
          Real<span style={{ color: "var(--acc)", fontStyle: "italic" }}>HQ</span> Portal
        </div>
        <div className="text-xs" style={{ color: "var(--tx3)" }}>
          Shared by {data.ownerName}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-7 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1
            className="text-3xl font-normal mb-1.5"
            style={{
              fontFamily: "var(--serif)",
              color: "var(--tx)",
              letterSpacing: "-0.02em",
            }}
          >
            {data.room.assetName || "Property Portal"}
          </h1>
          {data.room.assetAddress && (
            <div className="text-sm font-light" style={{ color: "var(--tx3)" }}>
              {data.room.assetAddress}
            </div>
          )}
        </div>

        {/* NDA Gate */}
        {!ndaSigned && (
          <div
            className="rounded-xl p-8 text-center mb-8"
            style={{
              background: "var(--s1)",
              border: "1px solid var(--amb-bdr)",
            }}
          >
            <div className="text-base font-semibold mb-2" style={{ color: "var(--tx)" }}>
              Non-Disclosure Agreement Required
            </div>
            <div className="text-sm font-light mb-5 max-w-lg mx-auto" style={{ color: "var(--tx3)" }}>
              Before accessing the document room and property data, please review and sign the NDA below.
              This is a standard confidentiality agreement covering the information shared in this portal.
            </div>

            <div className="max-w-sm mx-auto space-y-3 mb-5">
              <input
                type="text"
                placeholder="Your full name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                style={{
                  background: "var(--s2)",
                  border: "1px solid var(--bdr)",
                  color: "var(--tx)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--acc)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--bdr)")}
              />
              <input
                type="email"
                placeholder="Your email address"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                style={{
                  background: "var(--s2)",
                  border: "1px solid var(--bdr)",
                  color: "var(--tx)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--acc)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--bdr)")}
              />
            </div>

            <button
              onClick={handleSignNDA}
              disabled={signing}
              className="px-7 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                background: "var(--acc)",
                color: "#fff",
                border: "none",
                cursor: signing ? "default" : "pointer",
              }}
            >
              {signing ? "Processing…" : "Review & Sign NDA →"}
            </button>
          </div>
        )}

        {/* Documents (visible after NDA signed) */}
        {ndaSigned && (
          <>
            <div
              className="text-[9px] font-medium uppercase tracking-wider mb-3 px-1"
              style={{
                color: "var(--tx3)",
                fontFamily: "var(--mono)",
                letterSpacing: "2px",
              }}
            >
              Included in this portal
            </div>

            <div
              className="rounded-xl overflow-hidden mb-8"
              style={{
                background: "var(--s1)",
                border: "1px solid var(--bdr)",
              }}
            >
              <div
                className="px-5 py-3.5 flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--bdr)" }}
              >
                <h4 className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
                  Documents ({data.documents.length})
                </h4>
              </div>

              {data.documents.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--tx3)" }}>
                  No documents shared yet
                </div>
              ) : (
                <>
                  {data.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between px-5 py-3 cursor-pointer transition-colors"
                      style={{
                        borderBottom: "1px solid var(--bdr-lt)",
                      }}
                      onClick={() => {
                        // TODO: Implement document download
                        alert("Document download not yet implemented");
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--s2)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <div className="text-xs font-medium" style={{ color: "var(--tx)" }}>
                        {doc.name}
                      </div>
                      <div className="text-xs" style={{ color: "var(--tx3)" }}>
                        ↓
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center text-xs font-light" style={{ color: "var(--tx3)" }}>
          Powered by RealHQ · Portal views are tracked · Link expires in 30 days
        </div>
      </div>
    </div>
  );
}
