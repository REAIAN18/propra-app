"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";

type Investor = {
  id: string;
  name: string;
  email: string;
  company?: string;
  type?: string;
};

export default function InvestorsPage() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    type: "individual",
  });

  useEffect(() => {
    fetchInvestors();
  }, []);

  const fetchInvestors = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/user/investor-contacts");
      if (response.ok) {
        const data = await response.json();
        setInvestors(data);
      }
    } catch (error) {
      console.error("Error fetching investors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInvestor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/user/investor-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormData({ name: "", email: "", company: "", type: "individual" });
        setShowAddForm(false);
        await fetchInvestors();
      }
    } catch (error) {
      console.error("Error adding investor:", error);
    }
  };

  return (
    <AppShell>
      <TopBar />
      <div className="p-8 max-w-[800px]">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[28px] font-serif text-[var(--tx)] mb-2">Investors</h1>
          <p className="text-[13px] text-[var(--tx3)]">
            Manage your investor contacts for deal outreach and opportunities
          </p>
        </div>

        {/* Add Investor Button */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-[var(--acc)] text-white rounded-lg text-[12px] font-semibold mb-6 hover:bg-[#6d5ce0] transition-all"
        >
          {showAddForm ? "Cancel" : "+ Add Investor"}
        </button>

        {/* Add Investor Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddInvestor}
            className="bg-[var(--s1)] border border-[var(--bdr)] rounded-lg p-6 mb-6"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[var(--tx)] mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 bg-[var(--s2)] border border-[var(--bdr)] rounded text-[13px] text-[var(--tx)] placeholder-[var(--tx3)]"
                  placeholder="Investor name"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[var(--tx)] mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 bg-[var(--s2)] border border-[var(--bdr)] rounded text-[13px] text-[var(--tx)] placeholder-[var(--tx3)]"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[var(--tx)] mb-2">
                  Company
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[var(--s2)] border border-[var(--bdr)] rounded text-[13px] text-[var(--tx)] placeholder-[var(--tx3)]"
                  placeholder="Company name (optional)"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[var(--tx)] mb-2">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[var(--s2)] border border-[var(--bdr)] rounded text-[13px] text-[var(--tx)]"
                >
                  <option value="individual">Individual</option>
                  <option value="fund">Fund</option>
                  <option value="family_office">Family Office</option>
                  <option value="reit">REIT</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-[var(--grn)] text-white rounded-lg text-[12px] font-semibold hover:bg-[#2ab57d] transition-all"
              >
                Add Investor
              </button>
            </div>
          </form>
        )}

        {/* Investors List */}
        {loading ? (
          <div className="text-center py-12 text-[var(--tx3)]">Loading investors...</div>
        ) : investors.length === 0 ? (
          <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-lg p-8 text-center">
            <p className="text-[13px] text-[var(--tx3)] mb-4">No investors added yet</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-[var(--acc-dim)] text-[var(--acc)] rounded-lg text-[12px] font-semibold hover:bg-[var(--acc-lt)] transition-all"
            >
              Add your first investor
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {investors.map((investor) => (
              <div
                key={investor.id}
                className="bg-[var(--s1)] border border-[var(--bdr)] rounded-lg p-4 flex items-center justify-between hover:bg-[var(--s2)] transition-colors"
              >
                <div>
                  <div className="text-[13px] font-semibold text-[var(--tx)]">
                    {investor.name}
                  </div>
                  <div className="text-[11px] text-[var(--tx3)]">{investor.email}</div>
                  {investor.company && (
                    <div className="text-[11px] text-[var(--tx3)] mt-1">
                      {investor.company}
                    </div>
                  )}
                </div>
                {investor.type && (
                  <span className="text-[9px] font-mono uppercase px-2 py-1 bg-[var(--acc-dim)] text-[var(--acc)] rounded">
                    {investor.type}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
