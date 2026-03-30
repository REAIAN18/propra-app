"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import styles from "./approach.module.css";

export default function ApproachWizardPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;
  const [step, setStep] = useState(1);
  const [approachType, setApproachType] = useState("acquisition");
  const [channel, setChannel] = useState("email");
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerateLetter = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dealscope/properties/${propertyId}/approach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approachType, channel }),
      });
      const data = await res.json();
      setLetter(data.content);
      setStep(3);
    } catch (error) {
      console.error("Error generating letter:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Approach Wizard</h1>
          <div className={styles.steps}>
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className={`${styles.step} ${step === s ? styles.active : ""}`}>
                {s}
              </div>
            ))}
          </div>
        </header>

        <div className={styles.content}>
          {step === 1 && (
            <div className={styles.page}>
              <h2 className={styles.pageTitle}>Select Approach Type</h2>
              <div className={styles.options}>
                {["acquisition", "refinance", "disposition"].map((type) => (
                  <label key={type} className={styles.option}>
                    <input
                      className={styles.optionInput}
                      type="radio"
                      name="approachType"
                      value={type}
                      checked={approachType === type}
                      onChange={(e) => setApproachType(e.target.value)}
                    />
                    <span className={styles.optionLabel}>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  </label>
                ))}
              </div>
              <button className={styles.btn} onClick={() => setStep(2)}>
                Next →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className={styles.page}>
              <h2 className={styles.pageTitle}>Select Channel</h2>
              <div className={styles.options}>
                {["email", "phone", "letter"].map((ch) => (
                  <label key={ch} className={styles.option}>
                    <input
                      className={styles.optionInput}
                      type="radio"
                      name="channel"
                      value={ch}
                      checked={channel === ch}
                      onChange={(e) => setChannel(e.target.value)}
                    />
                    <span className={styles.optionLabel}>{ch.charAt(0).toUpperCase() + ch.slice(1)}</span>
                  </label>
                ))}
              </div>
              <div className={styles.actions}>
                <button className={styles.btn} onClick={() => setStep(1)}>
                  ← Back
                </button>
                <button className={styles.btn} onClick={handleGenerateLetter} disabled={loading}>
                  {loading ? "Generating..." : "Generate Letter →"}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.page}>
              <h2>Review Letter</h2>
              <div className={styles.letterPreview}>{letter}</div>
              <div className={styles.actions}>
                <button className={styles.btn} onClick={() => setStep(2)}>
                  ← Back
                </button>
                <button className={styles.btn} onClick={() => setStep(4)}>
                  Approve & Send →
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className={styles.page}>
              <h2>Sent Successfully</h2>
              <p className={styles.success}>Your approach letter has been sent via {channel}.</p>
              <button className={styles.btn} onClick={() => router.push(`/dealscope/${propertyId}`)}>
                ← Back to Property
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
