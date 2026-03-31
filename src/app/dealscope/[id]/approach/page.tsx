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
  const [tone, setTone] = useState("professional");
  const [channel, setChannel] = useState("email");
  const [letter, setLetter] = useState("");
  const [editableLetter, setEditableLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingPost, setSendingPost] = useState(false);

  const handleGenerateLetter = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dealscope/properties/${propertyId}/approach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approachType, tone, channel }),
      });
      const data = await res.json();
      setLetter(data.content || data.letter || "");
      setEditableLetter(data.content || data.letter || "");
      setStep(3);
    } catch (error) {
      console.error("Error generating letter:", error);
      alert("Failed to generate letter. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/dealscope/properties/${propertyId}/approach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          approachType, 
          tone, 
          channel: "email",
          letter: editableLetter,
          action: "send"
        }),
      });
      if (res.ok) {
        setStep(4);
      }
    } catch (error) {
      console.error("Error sending email:", error);
      alert("Failed to send email. Please try again.");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendPost = async () => {
    setSendingPost(true);
    try {
      const res = await fetch(`/api/dealscope/properties/${propertyId}/approach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          approachType, 
          tone, 
          channel: "post",
          letter: editableLetter,
          action: "send"
        }),
      });
      if (res.ok) {
        setStep(4);
      }
    } catch (error) {
      console.error("Error sending via post:", error);
      alert("Failed to send via post. Please try again.");
    } finally {
      setSendingPost(false);
    }
  };

  return (
    <AppShell>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Approach Letter</h1>
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
              <h2 className={styles.pageTitle}>Select Tone</h2>
              <div className={styles.toneSelector}>
                <label className={styles.toneOption}>
                  <input
                    type="radio"
                    name="tone"
                    value="formal"
                    checked={tone === "formal"}
                    onChange={(e) => setTone(e.target.value)}
                  />
                  <div className={styles.toneLabel}>Formal</div>
                  <div className={styles.toneDesc}>Professional and structured approach</div>
                </label>
                <label className={styles.toneOption}>
                  <input
                    type="radio"
                    name="tone"
                    value="professional"
                    checked={tone === "professional"}
                    onChange={(e) => setTone(e.target.value)}
                  />
                  <div className={styles.toneLabel}>Professional</div>
                  <div className={styles.toneDesc}>Standard business tone</div>
                </label>
                <label className={styles.toneOption}>
                  <input
                    type="radio"
                    name="tone"
                    value="direct"
                    checked={tone === "direct"}
                    onChange={(e) => setTone(e.target.value)}
                  />
                  <div className={styles.toneLabel}>Direct</div>
                  <div className={styles.toneDesc}>Clear, concise, and to the point</div>
                </label>
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
              <h2 className={styles.pageTitle}>Review & Edit Letter</h2>
              
              <div className={styles.letterEditor}>
                <div className={styles.editorLabel}>Letter Content</div>
                <textarea
                  className={styles.letterTextarea}
                  value={editableLetter}
                  onChange={(e) => setEditableLetter(e.target.value)}
                  placeholder="Letter will be generated here..."
                />
              </div>

              <div className={styles.sendActions}>
                <button 
                  className={styles.btnEmail} 
                  onClick={handleSendEmail}
                  disabled={sendingEmail || sendingPost}
                >
                  {sendingEmail ? "Sending via Email..." : "📧 Send by Email"}
                </button>
                <button 
                  className={styles.btnPost} 
                  onClick={handleSendPost}
                  disabled={sendingEmail || sendingPost}
                >
                  {sendingPost ? "Sending via Post..." : "📬 Send by Post"}
                </button>
              </div>

              <button 
                className={styles.btnBack} 
                onClick={() => setStep(2)}
              >
                ← Back
              </button>
            </div>
          )}

          {step === 4 && (
            <div className={styles.page}>
              <div className={styles.successContainer}>
                <div className={styles.successIcon}>✓</div>
                <h2>Sent Successfully</h2>
                <p className={styles.success}>Your approach letter has been sent.</p>
              </div>
              <button 
                className={styles.btn} 
                onClick={() => router.push(`/dealscope/${propertyId}`)}
              >
                ← Back to Property
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
