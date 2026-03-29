"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

export default function UploadSchedulePage() {
  const router = useRouter();

  return (
    <AppShell>
      <TopBar title="Upload Schedule" />
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: "var(--bg)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 120px" }}>

          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--acc)", textTransform: "uppercase", letterSpacing: 3, marginBottom: 20 }}>
            Add properties
          </div>

          <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.03em", color: "var(--tx)", marginBottom: 8 }}>
            Upload your portfolio schedule
          </h1>

          <p style={{ fontSize: 15, fontWeight: 300, lineHeight: 1.6, color: "var(--tx3)", marginBottom: 36, maxWidth: 520 }}>
            Drop a rent roll, schedule of assets, or any property list. RealHQ reads the file, extracts every property, and enriches them all automatically.
          </p>

          <div
            style={{
              border: "2px dashed var(--bdr)",
              borderRadius: 14,
              padding: "48px 32px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s",
              backgroundColor: "var(--s1)",
              marginBottom: 20
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--acc-bdr)";
              e.currentTarget.style.backgroundColor = "rgba(124,106,240,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--bdr)";
              e.currentTarget.style.backgroundColor = "var(--s1)";
            }}
            onClick={() => router.push("/properties/add")}
          >
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.6 }}>📄</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--tx)", marginBottom: 4 }}>
              Feature coming soon
            </div>
            <div style={{ fontSize: 13, fontWeight: 300, color: "var(--tx3)" }}>
              Bulk upload in development — for now, add properties one at a time
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", borderRadius: 4, backgroundColor: "var(--s2)", color: "var(--tx3)", border: "1px solid var(--bdr)", letterSpacing: 0.3 }}>XLSX</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", borderRadius: 4, backgroundColor: "var(--s2)", color: "var(--tx3)", border: "1px solid var(--bdr)", letterSpacing: 0.3 }}>CSV</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", borderRadius: 4, backgroundColor: "var(--s2)", color: "var(--tx3)", border: "1px solid var(--bdr)", letterSpacing: 0.3 }}>PDF</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", borderRadius: 4, backgroundColor: "var(--s2)", color: "var(--tx3)", border: "1px solid var(--bdr)", letterSpacing: 0.3 }}>DOCX</span>
            </div>
          </div>

          <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", backgroundColor: "var(--s1)", border: "1px solid var(--bdr)", borderRadius: 8, fontSize: 12, color: "var(--tx3)" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "var(--grn)", animation: "pulse 2s infinite", flexShrink: 0 }} />
            Feature coming soon: we'll use AI to read any format — no template needed. For now, add properties by address.
          </div>

        </div>
      </main>
    </AppShell>
  );
}
