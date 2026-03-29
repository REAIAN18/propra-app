"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface TenantBasicInfo {
  id: string;
  name: string;
}

export default function TenantEngagementPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params.id as string;
  const tenantId = params.tenantId as string;

  const [tenant, setTenant] = useState<TenantBasicInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch minimal tenant info for display
    fetch(`/api/user/tenants/${tenantId}`)
      .then((res) => res.json())
      .then((data) => {
        setTenant({
          id: data.tenant.id,
          name: data.tenant.name,
        });
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [tenantId]);

  const handleAction = async (actionType: string) => {
    if (actionType === "send_letter" || actionType === "formal_demand") {
      // Navigate to letter generation page
      router.push(`/assets/${assetId}/tenants/${tenantId}/letter?type=${actionType}`);
      return;
    }

    if (actionType === "engage_renewal") {
      // Call the engage-renewal API
      try {
        await fetch(`/api/user/tenants/${tenantId}/engage-renewal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: "Renewal discussion initiated from tenant detail page" }),
        });
        router.push(`/assets/${assetId}/tenants/${tenantId}`);
      } catch (error) {
        alert("Failed to initiate renewal engagement");
      }
      return;
    }

    if (actionType === "review_break") {
      // Call the review-break API
      try {
        await fetch(`/api/user/tenants/${tenantId}/review-break`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: "Break clause review initiated" }),
        });
        router.push(`/assets/${assetId}/tenants/${tenantId}`);
      } catch (error) {
        alert("Failed to initiate break review");
      }
      return;
    }

    if (actionType === "schedule_meeting") {
      // For now, just navigate to letter generation with meeting type
      router.push(`/assets/${assetId}/tenants/${tenantId}/letter?type=meeting_request`);
      return;
    }

    if (actionType === "instruct_solicitor") {
      // For now, just show alert - this would be a more complex flow
      alert("This action would typically open a workflow to instruct your solicitor. Feature coming soon.");
      return;
    }

    if (actionType === "log_note") {
      // For now, navigate back - this could be a simple modal
      const note = prompt("Enter your note:");
      if (note) {
        try {
          await fetch(`/api/user/tenants/${tenantId}/activity`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              actionType: "note",
              notes: note,
            }),
          });
          router.push(`/assets/${assetId}/tenants/${tenantId}`);
        } catch (error) {
          alert("Failed to save note");
        }
      }
      return;
    }
  };

  if (loading) {
    return (
      <div className="tab-page" style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ font: "400 14px var(--sans)", color: "var(--tx3)" }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="tab-page" style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ font: "400 14px var(--sans)", color: "var(--tx3)" }}>
          Tenant not found.
        </div>
      </div>
    );
  }

  return (
    <div className="tab-page" style={{ maxWidth: "600px", margin: "0 auto" }}>
      <div className="sec a1">Engage {tenant.name}</div>
      <div
        style={{
          font: "300 13px/1.5 var(--sans)",
          color: "var(--tx3)",
          marginBottom: "24px",
        }}
        className="a1"
      >
        Choose an action. RealHQ handles the drafting and sending — you review before anything goes out.
      </div>

      {/* Action options */}
      <div className="card a2">
        <div className="card-hd">
          <h4>Engagement Actions</h4>
        </div>

        <div
          className="row"
          style={{ gridTemplateColumns: "1fr auto", cursor: "pointer" }}
          onClick={() => handleAction("send_letter")}
        >
          <div>
            <div className="row-name">Send payment reminder</div>
            <div className="row-sub">
              Friendly reminder for overdue rent. Auto-drafted by RealHQ.
            </div>
          </div>
          <span className="row-go">→</span>
        </div>

        <div
          className="row"
          style={{ gridTemplateColumns: "1fr auto", cursor: "pointer" }}
          onClick={() => handleAction("formal_demand")}
        >
          <div>
            <div className="row-name">Formal demand letter</div>
            <div className="row-sub">
              Statutory demand for overdue rent. 14-day deadline. Escalation step.
            </div>
          </div>
          <span className="row-go">→</span>
        </div>

        <div
          className="row"
          style={{ gridTemplateColumns: "1fr auto", cursor: "pointer" }}
          onClick={() => handleAction("engage_renewal")}
        >
          <div>
            <div className="row-name">Renewal discussion</div>
            <div className="row-sub">
              Open a conversation about lease renewal or re-gear. Non-confrontational.
            </div>
          </div>
          <span className="row-go">→</span>
        </div>

        <div
          className="row"
          style={{ gridTemplateColumns: "1fr auto", cursor: "pointer" }}
          onClick={() => handleAction("review_break")}
        >
          <div>
            <div className="row-name">Break clause response</div>
            <div className="row-sub">
              Proactive retention — offer incentives before tenant decides to leave.
            </div>
          </div>
          <span className="row-go">→</span>
        </div>

        <div
          className="row"
          style={{ gridTemplateColumns: "1fr auto", cursor: "pointer" }}
          onClick={() => handleAction("schedule_meeting")}
        >
          <div>
            <div className="row-name">Schedule meeting</div>
            <div className="row-sub">
              Request a meeting with the tenant. RealHQ drafts the invitation.
            </div>
          </div>
          <span className="row-go">→</span>
        </div>

        <div
          className="row"
          style={{ gridTemplateColumns: "1fr auto", cursor: "pointer" }}
          onClick={() => handleAction("instruct_solicitor")}
        >
          <div>
            <div className="row-name">Instruct solicitor</div>
            <div className="row-sub">
              For legal matters — forfeiture, breach of covenant, dilapidations claim.
            </div>
          </div>
          <span className="row-go">→</span>
        </div>

        <div
          className="row"
          style={{ gridTemplateColumns: "1fr auto", cursor: "pointer" }}
          onClick={() => handleAction("log_note")}
        >
          <div>
            <div className="row-name">Log a note</div>
            <div className="row-sub">
              Record a phone call, meeting outcome, or observation. No action sent.
            </div>
          </div>
          <span className="row-go">→</span>
        </div>
      </div>

      <Link href={`/assets/${assetId}/tenants/${tenantId}`}>
        <button className="btn-secondary" style={{ marginTop: "16px" }}>
          ← Back to tenant
        </button>
      </Link>
    </div>
  );
}
