"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

export default function SearchCompanyPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [showResults, setShowResults] = useState(false);

  const handleSearch = (value: string) => {
    setCompanyName(value);
    setShowResults(value.length > 3);
  };

  return (
    <AppShell>
      <TopBar title="Search by Company" />
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: "var(--bg)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 24px 120px" }}>

          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--acc)", textTransform: "uppercase", letterSpacing: 3, marginBottom: 20 }}>
            Add properties
          </div>

          <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.03em", color: "var(--tx)", marginBottom: 8 }}>
            Find properties by company
          </h1>

          <p style={{ fontSize: 15, fontWeight: 300, lineHeight: 1.6, color: "var(--tx3)", marginBottom: 36, maxWidth: 520 }}>
            Enter a company or entity name. We&apos;ll find commercial properties linked to it from public records and ownership data.
          </p>

          <div style={{ position: "relative", marginBottom: 16 }}>
            <div style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "var(--tx3)", pointerEvents: "none" }}>
              🏢
            </div>
            <input
              type="text"
              value={companyName}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Company name, e.g. Brickell Holdings LLC..."
              autoFocus
              style={{
                width: "100%",
                padding: "18px 22px 18px 48px",
                backgroundColor: "var(--s1)",
                border: "1.5px solid var(--bdr)",
                borderRadius: 12,
                fontSize: 16,
                color: "var(--tx)",
                outline: "none",
                transition: "border-color 0.2s, box-shadow 0.2s"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--acc-bdr)";
                e.target.style.boxShadow = "0 0 0 4px rgba(124,106,240,0.06), 0 8px 32px rgba(0,0,0,0.3)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--bdr)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {showResults && (
            <div style={{ marginTop: 20 }}>
              <div
                onClick={() => router.push("/properties/add")}
                style={{
                  backgroundColor: "var(--s1)",
                  border: "1px solid var(--bdr)",
                  borderRadius: 10,
                  padding: "18px 20px",
                  marginBottom: 8,
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--acc-bdr)";
                  e.currentTarget.style.backgroundColor = "var(--s2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--bdr)";
                  e.currentTarget.style.backgroundColor = "var(--s1)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--tx)" }}>{companyName}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", borderRadius: 4, backgroundColor: "var(--s2)", color: "var(--tx3)", border: "1px solid var(--bdr)", letterSpacing: 0.3 }}>
                    Coming soon
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--tx3)", marginBottom: 10 }}>
                  Company search feature in development — for now, add properties by address
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", backgroundColor: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: 8, fontSize: 12, color: "var(--tx3)" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "var(--grn)", animation: "pulse 2s infinite", flexShrink: 0 }} />
            Feature coming soon: we&apos;ll search ownership records from ATTOM and public registries. For now, add properties by address.
          </div>

        </div>
      </main>
    </AppShell>
  );
}
