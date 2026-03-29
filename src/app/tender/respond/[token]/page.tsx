import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function TenderResponsePage({ params }: PageProps) {
  const { token } = await params;

  const quote = await prisma.tenderQuote.findUnique({
    where: { tenderToken: token },
    include: {
      workOrder: {
        include: {
          asset: {
            select: {
              id: true,
              name: true,
              address: true,
              assetType: true,
            },
          },
        },
      },
    },
  });

  if (!quote || quote.submittedAt) {
    notFound();
  }

  const { workOrder } = quote;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiScope = workOrder.aiScopeJson as any;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--tx)" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: "48px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "600", marginBottom: "8px" }}>
            Submit Tender Quote
          </h1>
          <p style={{ color: "var(--tx2)", fontSize: "16px" }}>
            Quote for {quote.contractorName}
          </p>
        </div>

        {/* Property Details */}
        <section style={{ background: "var(--s1)", borderRadius: "8px", padding: "24px", marginBottom: "32px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Property Details</h2>
          <div style={{ display: "grid", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "13px", color: "var(--tx2)", marginBottom: "4px" }}>Property</div>
              <div style={{ fontSize: "15px" }}>{workOrder.asset?.name || "Unnamed Property"}</div>
            </div>
            <div>
              <div style={{ fontSize: "13px", color: "var(--tx2)", marginBottom: "4px" }}>Address</div>
              <div style={{ fontSize: "15px" }}>{workOrder.asset?.address || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "13px", color: "var(--tx2)", marginBottom: "4px" }}>Asset Type</div>
              <div style={{ fontSize: "15px" }}>{workOrder.asset?.assetType || "—"}</div>
            </div>
          </div>
        </section>

        {/* Scope of Work */}
        <section style={{ background: "var(--s1)", borderRadius: "8px", padding: "24px", marginBottom: "32px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Scope of Work</h2>

          {aiScope?.scopeSummary && (
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "13px", color: "var(--tx2)", marginBottom: "8px" }}>Summary</div>
              <div style={{ fontSize: "15px", lineHeight: "1.6" }}>{aiScope.scopeSummary}</div>
            </div>
          )}

          {aiScope?.workItems && aiScope.workItems.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "13px", color: "var(--tx2)", marginBottom: "12px" }}>Work Items</div>
              <div style={{ display: "grid", gap: "12px" }}>
                {aiScope?.workItems?.map((item: Record<string, unknown>, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      background: "var(--s2)",
                      padding: "16px",
                      borderRadius: "6px",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div style={{ fontSize: "15px", fontWeight: "500", marginBottom: "4px" }}>
                      {item.description}
                    </div>
                    {item.quantity && (
                      <div style={{ fontSize: "13px", color: "var(--tx2)" }}>
                        Quantity: {item.quantity}
                      </div>
                    )}
                    {item.specification && (
                      <div style={{ fontSize: "13px", color: "var(--tx3)", marginTop: "8px" }}>
                        {item.specification}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {aiScope?.safetyRequirements && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", color: "var(--tx2)", marginBottom: "8px" }}>Safety Requirements</div>
              <div style={{ fontSize: "14px", color: "var(--tx3)" }}>{aiScope.safetyRequirements}</div>
            </div>
          )}

          {aiScope?.exclusions && (
            <div>
              <div style={{ fontSize: "13px", color: "var(--tx2)", marginBottom: "8px" }}>Exclusions</div>
              <div style={{ fontSize: "14px", color: "var(--tx3)" }}>{aiScope.exclusions}</div>
            </div>
          )}
        </section>

        {/* Quote Form */}
        <form id="tenderForm" action={`/api/tender/respond/${token}`} method="POST">
          {/* Price Breakdown */}
          <section style={{ background: "var(--s1)", borderRadius: "8px", padding: "24px", marginBottom: "32px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Price Breakdown</h2>
            <div style={{ display: "grid", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "var(--tx2)", marginBottom: "6px" }}>
                  Labour (£)
                </label>
                <input
                  type="number"
                  name="labour"
                  required
                  min="0"
                  step="0.01"
                  style={{
                    width: "100%",
                    background: "var(--s2)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    padding: "10px 12px",
                    color: "var(--tx)",
                    fontSize: "15px",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "var(--tx2)", marginBottom: "6px" }}>
                  Materials (£)
                </label>
                <input
                  type="number"
                  name="materials"
                  required
                  min="0"
                  step="0.01"
                  style={{
                    width: "100%",
                    background: "var(--s2)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    padding: "10px 12px",
                    color: "var(--tx)",
                    fontSize: "15px",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "var(--tx2)", marginBottom: "6px" }}>
                  Plant & Equipment (£)
                </label>
                <input
                  type="number"
                  name="plant"
                  required
                  min="0"
                  step="0.01"
                  style={{
                    width: "100%",
                    background: "var(--s2)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    padding: "10px 12px",
                    color: "var(--tx)",
                    fontSize: "15px",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "var(--tx2)", marginBottom: "6px" }}>
                  Overheads & Profit (£)
                </label>
                <input
                  type="number"
                  name="overheads"
                  required
                  min="0"
                  step="0.01"
                  style={{
                    width: "100%",
                    background: "var(--s2)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    padding: "10px 12px",
                    color: "var(--tx)",
                    fontSize: "15px",
                  }}
                />
              </div>
            </div>
          </section>

          {/* Timeline & Terms */}
          <section style={{ background: "var(--s1)", borderRadius: "8px", padding: "24px", marginBottom: "32px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Timeline & Terms</h2>
            <div style={{ display: "grid", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "var(--tx2)", marginBottom: "6px" }}>
                  Proposed Start Date
                </label>
                <input
                  type="date"
                  name="proposedStart"
                  required
                  style={{
                    width: "100%",
                    background: "var(--s2)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    padding: "10px 12px",
                    color: "var(--tx)",
                    fontSize: "15px",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "var(--tx2)", marginBottom: "6px" }}>
                  Duration (days)
                </label>
                <input
                  type="number"
                  name="proposedDuration"
                  required
                  min="1"
                  style={{
                    width: "100%",
                    background: "var(--s2)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    padding: "10px 12px",
                    color: "var(--tx)",
                    fontSize: "15px",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "var(--tx2)", marginBottom: "6px" }}>
                  Payment Terms
                </label>
                <textarea
                  name="paymentTerms"
                  required
                  rows={3}
                  placeholder="e.g. 30% upfront, 40% at practical completion, 30% after defects period"
                  style={{
                    width: "100%",
                    background: "var(--s2)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    padding: "10px 12px",
                    color: "var(--tx)",
                    fontSize: "15px",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>
          </section>

          {/* Questions */}
          <section style={{ background: "var(--s1)", borderRadius: "8px", padding: "24px", marginBottom: "32px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>
              Questions or Comments (Optional)
            </h2>
            <textarea
              name="questions"
              rows={4}
              placeholder="Any clarifications needed or additional information..."
              style={{
                width: "100%",
                background: "var(--s2)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px",
                padding: "10px 12px",
                color: "var(--tx)",
                fontSize: "15px",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </section>

          {/* Submit */}
          <button
            type="submit"
            style={{
              width: "100%",
              background: "var(--acc)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "14px 24px",
              fontSize: "16px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Submit Quote
          </button>
        </form>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('tenderForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              const form = e.target;
              const formData = new FormData(form);

              const labour = parseFloat(formData.get('labour')) || 0;
              const materials = parseFloat(formData.get('materials')) || 0;
              const plant = parseFloat(formData.get('plant')) || 0;
              const overheads = parseFloat(formData.get('overheads')) || 0;
              const totalPrice = labour + materials + plant + overheads;

              const data = {
                price: totalPrice,
                breakdown: { labour, materials, plant, overheads },
                proposedStart: formData.get('proposedStart'),
                proposedDuration: parseInt(formData.get('proposedDuration')),
                paymentTerms: formData.get('paymentTerms'),
                questions: formData.get('questions') || null,
              };

              const btn = form.querySelector('button[type="submit"]');
              btn.disabled = true;
              btn.textContent = 'Submitting...';

              try {
                const res = await fetch(form.action, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data),
                });

                if (res.ok) {
                  document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);color:var(--tx);text-align:center;padding:24px"><div><h1 style="font-size:32px;margin-bottom:16px">Quote Submitted Successfully</h1><p style="color:var(--tx2);font-size:16px">Thank you for your submission. The property owner will review your quote and be in touch.</p></div></div>';
                } else {
                  const err = await res.json();
                  alert('Error: ' + (err.error || 'Failed to submit quote'));
                  btn.disabled = false;
                  btn.textContent = 'Submit Quote';
                }
              } catch (err) {
                alert('Network error. Please try again.');
                btn.disabled = false;
                btn.textContent = 'Submit Quote';
              }
            });
          `,
        }}
      />
    </div>
  );
}
