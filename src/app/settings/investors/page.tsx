"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import Link from "next/link";

type InvestorContact = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  type: string;
  status: string;
  notes: string | null;
  createdAt: string;
};

export default function InvestorsPage() {
  const [investors, setInvestors] = useState<InvestorContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<InvestorContact | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    type: "LP",
    status: "prospect",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  const handleAdd = () => {
    setFormData({
      name: "",
      email: "",
      company: "",
      type: "LP",
      status: "prospect",
      notes: "",
    });
    setEditingInvestor(null);
    setShowAddModal(true);
    setError("");
  };

  const handleEdit = (investor: InvestorContact) => {
    setFormData({
      name: investor.name,
      email: investor.email,
      company: investor.company || "",
      type: investor.type,
      status: investor.status,
      notes: investor.notes || "",
    });
    setEditingInvestor(investor);
    setShowAddModal(true);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const url = editingInvestor
        ? `/api/user/investor-contacts/${editingInvestor.id}`
        : `/api/user/investor-contacts`;
      const method = editingInvestor ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          company: formData.company.trim() || null,
          type: formData.type,
          status: formData.status,
          notes: formData.notes.trim() || null,
        }),
      });

      if (response.ok) {
        setShowAddModal(false);
        fetchInvestors();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save investor");
      }
    } catch (err) {
      console.error("Error saving investor:", err);
      setError("Failed to save investor. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/user/investor-contacts/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchInvestors();
      } else {
        alert("Failed to delete investor");
      }
    } catch (error) {
      console.error("Error deleting investor:", error);
      alert("Failed to delete investor");
    }
  };

  return (
    <AppShell>
      <TopBar />
      <div className="p-8 max-w-[1200px]">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-[24px] font-serif text-[var(--tx)]">
              Investor Contacts
            </h1>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-[var(--acc)] text-white rounded-lg text-[13px] font-semibold hover:bg-[#6d5ce0] transition-all"
            >
              + Add Investor
            </button>
          </div>
          <p className="text-[13px] text-[var(--tx3)]">
            Manage your investor contacts for deal syndication and co-investment opportunities.
          </p>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-[var(--tx3)]">Loading...</div>
        ) : investors.length === 0 ? (
          <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-lg p-12 text-center">
            <div className="text-[15px] text-[var(--tx2)] mb-2">
              No investors added yet
            </div>
            <div className="text-[13px] text-[var(--tx3)] mb-4">
              Add investor contacts to share deal opportunities and track engagement
            </div>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-[var(--acc)] text-white rounded-lg text-[13px] font-semibold hover:bg-[#6d5ce0] transition-all"
            >
              + Add Your First Investor
            </button>
          </div>
        ) : (
          <div className="bg-[var(--s1)] border border-[var(--bdr)] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--bdr)]">
                  <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-wide text-[var(--tx3)]">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-wide text-[var(--tx3)]">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-wide text-[var(--tx3)]">
                    Company
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-wide text-[var(--tx3)]">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-wide text-[var(--tx3)]">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] font-mono uppercase tracking-wide text-[var(--tx3)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {investors.map((investor) => (
                  <tr
                    key={investor.id}
                    className="border-b border-[var(--bdr)] last:border-b-0 hover:bg-[var(--s2)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-medium text-[var(--tx)]">
                        {investor.name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[12px] text-[var(--tx2)]">
                        {investor.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[12px] text-[var(--tx2)]">
                        {investor.company || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block text-[9px] font-mono uppercase px-2 py-1 bg-[var(--s3)] text-[var(--tx3)] rounded">
                        {investor.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-[9px] font-mono uppercase px-2 py-1 rounded ${
                          investor.status === "interested"
                            ? "bg-[var(--grn-lt)] text-[var(--grn)] border border-[var(--grn-bdr)]"
                            : investor.status === "contacted"
                            ? "bg-[var(--acc-lt)] text-[var(--acc)] border border-[var(--acc-bdr)]"
                            : investor.status === "committed"
                            ? "bg-[var(--grn-lt)] text-[var(--grn)] border border-[var(--grn-bdr)]"
                            : investor.status === "declined"
                            ? "bg-[var(--red-lt)] text-[var(--red)] border border-[var(--red-bdr)]"
                            : "bg-[var(--s3)] text-[var(--tx3)]"
                        }`}
                      >
                        {investor.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleEdit(investor)}
                        className="text-[11px] text-[var(--acc)] hover:text-[var(--acc)]/80 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(investor.id, investor.name)}
                        className="text-[11px] text-[var(--red)] hover:text-[var(--red)]/80"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[var(--bg)] border border-[var(--bdr)] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* Header */}
              <div className="border-b border-[var(--bdr)] p-5 flex items-center justify-between sticky top-0 bg-[var(--bg)] z-10">
                <div>
                  <h2 className="text-[18px] font-serif font-normal text-[var(--tx)]">
                    {editingInvestor ? "Edit Investor" : "Add Investor"}
                  </h2>
                  <p className="text-[12px] text-[var(--tx3)] mt-1">
                    {editingInvestor
                      ? "Update investor contact details"
                      : "Add a new investor contact for deal syndication"}
                  </p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                  className="text-[var(--tx3)] hover:text-[var(--tx)] text-[20px] leading-none disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="bg-[var(--red-lt)] border border-[var(--red-bdr)] text-[var(--red)] px-4 py-3 rounded-lg text-[12px]">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wide text-[var(--tx3)] mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-[var(--s1)] border border-[var(--bdr)] rounded-lg text-[13px] text-[var(--tx)] placeholder:text-[var(--tx3)] focus:outline-none focus:border-[var(--acc-bdr)] focus:ring-2 focus:ring-[var(--acc-dim)]"
                    placeholder="e.g. John Smith"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wide text-[var(--tx3)] mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-[var(--s1)] border border-[var(--bdr)] rounded-lg text-[13px] text-[var(--tx)] placeholder:text-[var(--tx3)] focus:outline-none focus:border-[var(--acc-bdr)] focus:ring-2 focus:ring-[var(--acc-dim)]"
                    placeholder="e.g. john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wide text-[var(--tx3)] mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--s1)] border border-[var(--bdr)] rounded-lg text-[13px] text-[var(--tx)] placeholder:text-[var(--tx3)] focus:outline-none focus:border-[var(--acc-bdr)] focus:ring-2 focus:ring-[var(--acc-dim)]"
                    placeholder="e.g. Smith Capital"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wide text-[var(--tx3)] mb-2">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--s1)] border border-[var(--bdr)] rounded-lg text-[13px] text-[var(--tx)] focus:outline-none focus:border-[var(--acc-bdr)] focus:ring-2 focus:ring-[var(--acc-dim)]"
                  >
                    <option value="LP">LP (Limited Partner)</option>
                    <option value="JV">JV (Joint Venture Partner)</option>
                    <option value="family_office">Family Office</option>
                    <option value="institution">Institution</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wide text-[var(--tx3)] mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--s1)] border border-[var(--bdr)] rounded-lg text-[13px] text-[var(--tx)] focus:outline-none focus:border-[var(--acc-bdr)] focus:ring-2 focus:ring-[var(--acc-dim)]"
                  >
                    <option value="prospect">Prospect</option>
                    <option value="contacted">Contacted</option>
                    <option value="interested">Interested</option>
                    <option value="committed">Committed</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wide text-[var(--tx3)] mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-[var(--s1)] border border-[var(--bdr)] rounded-lg text-[13px] text-[var(--tx)] placeholder:text-[var(--tx3)] focus:outline-none focus:border-[var(--acc-bdr)] focus:ring-2 focus:ring-[var(--acc-dim)] resize-none"
                    placeholder="Add any notes about this investor..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-transparent text-[var(--tx2)] border border-[var(--bdr)] rounded-lg text-[13px] font-medium hover:border-[var(--tx3)] hover:text-[var(--tx)] transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-[var(--acc)] text-white rounded-lg text-[13px] font-semibold hover:bg-[#6d5ce0] transition-all disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : editingInvestor ? "Update" : "Add Investor"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
