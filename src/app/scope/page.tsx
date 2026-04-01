"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import styles from "./scope.module.css";

const SOURCES = [
  { key: "auction", label: "Auctions", count: 47, live: true },
  { key: "admin", label: "Administration", count: 23, live: true },
  { key: "mees", label: "MEES risk", count: 34, live: false },
  { key: "absent", label: "Absent owner", count: 89, live: false },
  { key: "probate", label: "Probate", count: 12, live: false },
  { key: "price_drop", label: "Price drops", count: 8, live: false },
];

const DEMO_MANDATES = [
  {
    id: "m1",
    name: "SE Industrial <£800k",
    desc: "Industrial · South East · £200k–£800k",
    matches: 23,
    newCount: 3,
    pipeline: 5,
  },
  {
    id: "m2",
    name: "London Office MEES",
    desc: "Office · London · £1M–£5M · EPC F/G",
    client: "Harrow Capital",
    matches: 8,
    newCount: 1,
    pipeline: 0,
  },
];

const DEMO_ALERTS = [
  {
    id: "a1",
    type: "admin",
    title: "Meridian Business Park — entered administration",
    desc: "Begbies Traynor appointed. 8,200 sqft industrial, Rochester.",
    score: 7.2,
    time: "2h ago",
    unread: true,
  },
  {
    id: "a2",
    type: "price",
    title: "Redfield Manor — guide price reduced 15%",
    desc: "£850k → £720k. On your watchlist.",
    time: "4h ago",
    unread: true,
  },
  {
    id: "a3",
    type: "deadline",
    title: "Ashworth Close — auction closes in 5 days",
    desc: "EIG Lot 23, reserve £480k.",
    time: "6h ago",
    unread: false,
  },
];

export default function ScopePage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    const v = input.trim();
    if (/[A-Z]{1,2}\d/i.test(v) || v.includes(",")) {
      router.push(`/scope/search?q=${encodeURIComponent(v)}&type=address`);
    } else if (v.includes("http")) {
      router.push(`/scope/property/new?url=${encodeURIComponent(v)}`);
    } else {
      router.push(`/scope/search?q=${encodeURIComponent(v)}`);
    }
  };

  return (
    <AppShell>
      <div className={styles.page}>
        {/* ═══ HERO ═══ */}
        <div className={styles.hero}>
          <h1 className={`${styles.title} ${styles.anim}`}>
            Deal<span className={styles.titleAccent}>Scope</span>
          </h1>
          <p className={`${styles.subtitle} ${styles.anim} ${styles.a1}`}>
            Search any address. Analyse any property. Find every opportunity.
          </p>

          <form
            onSubmit={handleSearch}
            className={`${styles.inputBar} ${styles.anim} ${styles.a2}`}
          >
            <input
              type="text"
              placeholder="Address, postcode, company name, or listing URL…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={styles.inputField}
            />
            <button
              type="submit"
              disabled={loading}
              className={styles.inputBtn}
            >
              {loading ? "…" : "Go"}
            </button>
          </form>

          <div className={`${styles.hints} ${styles.anim} ${styles.a3}`}>
            <button
              className={styles.hint}
              onClick={() => {
                setInput("Meridian Business Park, ME2 4LR");
              }}
            >
              Meridian Business Park, ME2 4LR
            </button>
            <button
              className={styles.hint}
              onClick={() => {
                setInput("179 Harrow Road, W2 6NB");
              }}
            >
              179 Harrow Road, W2 6NB
            </button>
            <span className={styles.hintOr}>or</span>
            <button className={styles.hint}>Upload PDF</button>
          </div>

          <div className={`${styles.dropZone} ${styles.anim} ${styles.a4}`}>
            Drop a brochure, auction catalogue, or agent listing
          </div>
        </div>

        {/* ═══ CONTENT ═══ */}
        <div className={styles.content}>
          {/* LIVE SOURCES */}
          <section className={`${styles.section} ${styles.anim} ${styles.a4}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Live Sources</h2>
              <Link href="/scope/search" className={styles.sectionLink}>
                Advanced search →
              </Link>
            </div>
            <div className={styles.sourceGrid}>
              {SOURCES.map((s) => (
                <Link
                  key={s.key}
                  href={`/scope/search?source=${s.key}`}
                  className={styles.sourceCard}
                >
                  {s.live && <div className={styles.liveDot} />}
                  <span className={styles.sourceCount}>{s.count}</span>
                  <span className={styles.sourceLabel}>{s.label}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* MANDATES */}
          <section className={`${styles.section} ${styles.anim} ${styles.a5}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Your Mandates</h2>
              <button className={styles.sectionLink}>+ New mandate</button>
            </div>
            <div className={styles.mandateGrid}>
              {DEMO_MANDATES.map((m) => (
                <Link
                  key={m.id}
                  href={`/scope/search?mandate=${m.id}`}
                  className={styles.mandateCard}
                >
                  {m.newCount > 0 && (
                    <div className={styles.mandateBadge}>{m.newCount} new</div>
                  )}
                  {m.client && (
                    <div className={styles.mandateClient}>{m.client}</div>
                  )}
                  <div className={styles.mandateName}>{m.name}</div>
                  <div className={styles.mandateDesc}>{m.desc}</div>
                  <div className={styles.mandateStats}>
                    <span>
                      <strong>{m.matches}</strong> matches
                    </span>
                    {m.newCount > 0 && (
                      <span>
                        <strong>{m.newCount}</strong> new
                      </span>
                    )}
                    {m.pipeline > 0 && (
                      <span>
                        <strong>{m.pipeline}</strong> pipeline
                      </span>
                    )}
                  </div>
                </Link>
              ))}
              <button className={styles.mandateCreate}>+ Create mandate</button>
            </div>
          </section>

          {/* ALERTS */}
          <section className={`${styles.section} ${styles.anim} ${styles.a6}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Latest Alerts</h2>
              <Link href="/scope/alerts" className={styles.sectionLink}>
                View all →
              </Link>
            </div>
            {DEMO_ALERTS.map((a) => (
              <div
                key={a.id}
                className={`${styles.alertItem} ${a.unread ? styles.alertUnread : ""}`}
              >
                <div
                  className={styles.alertIcon}
                  data-type={a.type}
                >
                  {a.type === "admin" ? "!" : a.type === "price" ? "↓" : "⏱"}
                </div>
                <div className={styles.alertBody}>
                  <div className={styles.alertTitle}>{a.title}</div>
                  <div className={styles.alertDesc}>{a.desc}</div>
                  <div className={styles.alertMeta}>
                    <span
                      className={styles.badge}
                      data-type={a.type}
                    >
                      {a.type === "admin"
                        ? "Admin"
                        : a.type === "price"
                          ? "Price drop"
                          : "Deadline"}
                    </span>
                    {a.score && (
                      <span className={styles.score}>{a.score}</span>
                    )}
                    <span>{a.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
