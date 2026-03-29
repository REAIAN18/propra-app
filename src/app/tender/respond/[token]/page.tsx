"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface WorkOrder {
  id: string;
  jobType: string;
  category: string;
  propertyName: string;
  location: string;
  targetStart: string;
  budgetMin: number;
  budgetMax: number;
  deadline: string;
  scopeOfWorks: string;
}

export default function TenderResponsePage() {
  const params = useParams();
  const token = params.token as string;

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    price: "",
    timeline: "",
    warranty: "",
    notes: "",
  });

  useEffect(() => {
    fetch(`/api/tender/respond/${token}`)
      .then((res) => res.json())
      .then((data) => {
        setWorkOrder(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await fetch(`/api/tender/respond/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      setSubmitted(true);
    } catch (error) {
      alert("Failed to submit quote. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ font: "400 14px var(--sans)", color: "var(--tx3)" }}>Loading tender details...</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <>
        <div className="tender-nav">
          <div className="tender-nav-brand">
            Real<span>HQ</span> — Tender Invitation
          </div>
        </div>
        <div className="tender-page">
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>✓</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "24px", color: "var(--tx)", marginBottom: "8px" }}>
              Quote Submitted
            </div>
            <div style={{ font: "300 14px var(--sans)", color: "var(--tx3)" }}>
              Your quote will be reviewed by the property owner. You'll be notified if your bid is accepted.
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!workOrder) {
    return (
      <>
        <div className="tender-nav">
          <div className="tender-nav-brand">
            Real<span>HQ</span> — Tender Invitation
          </div>
        </div>
        <div className="tender-page">
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: "24px", color: "var(--tx)", marginBottom: "8px" }}>
              Tender Not Found
            </div>
            <div style={{ font: "300 14px var(--sans)", color: "var(--tx3)" }}>
              This tender invitation may have expired or been withdrawn. Contact the sender if you believe this is an error.
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="tender-nav">
        <div className="tender-nav-brand">
          Real<span>HQ</span> — Tender Invitation
        </div>
      </div>

      <div className="tender-page">
        <div style={{ fontFamily: "var(--serif)", fontSize: "24px", color: "var(--tx)", marginBottom: "4px" }}>
          Tender Invitation
        </div>
        <div style={{ font: "300 13px var(--sans)", color: "var(--tx3)", marginBottom: "24px" }}>
          You've been invited to quote on the following work. Review the scope and submit your bid below.
        </div>

        {/* JOB DETAILS */}
        <div className="card">
          <div className="card-hd">
            <h4>Job Details</h4>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Job type</div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>{workOrder.jobType}</div>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Category</div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>{workOrder.category}</div>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Property</div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>{workOrder.propertyName}</div>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Location</div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>{workOrder.location}</div>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Target start</div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>{workOrder.targetStart}</div>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Budget indication</div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
              ${workOrder.budgetMin.toLocaleString()} – ${workOrder.budgetMax.toLocaleString()}
            </div>
          </div>
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Deadline for quotes</div>
            <div style={{ font: "600 12px var(--sans)", color: "var(--amb)" }}>{workOrder.deadline}</div>
          </div>
        </div>

        {/* SCOPE OF WORKS */}
        <div className="card">
          <div className="card-hd">
            <h4>Scope of Works</h4>
          </div>
          <div
            style={{ padding: "18px", font: "400 13px/1.7 var(--sans)", color: "var(--tx2)", whiteSpace: "pre-wrap" }}
            dangerouslySetInnerHTML={{ __html: workOrder.scopeOfWorks }}
          />
        </div>

        {/* BID FORM */}
        <form onSubmit={handleSubmit}>
          <div className="sec">Submit Your Quote</div>

          <div className="adjust-field">
            <label className="adjust-label">Total price ($)</label>
            <input
              className="adjust-input"
              type="number"
              placeholder="e.g. 14500"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </div>

          <div className="adjust-field">
            <label className="adjust-label">Timeline</label>
            <input
              className="adjust-input"
              type="text"
              placeholder="e.g. 3 days, starting week of 1 Jun"
              value={formData.timeline}
              onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
              required
            />
          </div>

          <div className="adjust-field">
            <label className="adjust-label">Warranty</label>
            <input
              className="adjust-input"
              type="text"
              placeholder="e.g. 2 years parts and labour"
              value={formData.warranty}
              onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
              required
            />
          </div>

          <div className="adjust-field">
            <label className="adjust-label">Method statement / notes (optional)</label>
            <textarea
              className="adjust-input"
              style={{ minHeight: "80px", resize: "vertical" }}
              placeholder="Describe your approach, materials, any assumptions..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <button type="submit" className="btn-primary green" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit quote →"}
          </button>

          <div className="fine-print">
            Your quote will be reviewed by the property owner. You'll be notified if your bid is accepted. Questions?
            Reply to the invitation email.
          </div>
        </form>
      </div>
    </>
  );
}
