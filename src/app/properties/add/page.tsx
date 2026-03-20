"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

export default function AddPropertyPage() {
  const [address, setAddress] = useState("");

  return (
    <AppShell>
      <TopBar title="Add Property" />
      <main className="flex-1 p-4 lg:p-6 flex items-start justify-center">
        <div className="w-full max-w-md mt-8">
          <div className="rounded-2xl p-6" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}>
            <h2 className="text-lg font-semibold mb-1" style={{ color: "#111827" }}>Add your first property</h2>
            <p className="text-sm mb-5" style={{ color: "#6B7280" }}>Enter the address and RealHQ will automatically fetch the property data.</p>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, Miami, FL"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4"
              style={{ border: "1px solid #D1D5DB", color: "#111827" }}
            />
            <button
              disabled={!address.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-40 transition-all"
              style={{ backgroundColor: "#0A8A4C", color: "#fff" }}
            >
              Fetch property data →
            </button>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
