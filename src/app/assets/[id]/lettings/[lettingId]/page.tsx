"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Enquiry {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  useCase: string | null;
  sqftMin: number | null;
  sqftMax: number | null;
  status: string;
  covenantGrade: string | null;
  priceOffered: number | null;
  notes: string | null;
  createdAt: string;
}

interface LettingData {
  letting: {
    id: string;
    assetId: string;
    assetName: string;
    unitRef: string | null;
    status: string;
    askingRent: number;
    askingRentPerSqft: number;
    sqft: number;
    leaseTermYears: number | null;
    useClass: string | null;
    notes: string | null;
    daysListed: number;
    currency: string;
    sym: string;
  };
  enquiries: Enquiry[];
  stats: {
    totalEnquiries: number;
    viewingsBooked: number;
    voidCostMonthly: number;
    voidCostAnnual: number;
  };
}

export default function LettingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params.id as string;
  const lettingId = params.lettingId as string;

  const [data, setData] = useState<LettingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/user/lettings/${lettingId}`)
      .then((res) => res.json())
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [lettingId]);

  if (loading) {
    return (
      <div className="tab-page">
        <div style={{ font: "400 14px var(--sans)", color: "var(--tx3)" }}>
          Loading letting details...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="tab-page">
        <div style={{ font: "400 14px var(--sans)", color: "var(--tx3)" }}>
          Letting not found.
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return `${data.letting.sym}${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const getEnquiryStatusTag = (status: string) => {
    if (status === "viewing_booked") return "ok";
    if (status === "enquiry") return "acc";
    return "muted";
  };

  const getEnquiryStatusLabel = (status: string) => {
    if (status === "viewing_booked") return "VIEWING";
    if (status === "enquiry") return "ENQUIRY";
    if (status === "offer") return "OFFER";
    return "ENQUIRY";
  };

  return (
    <div className="tab-page">
      <div className="sec a1">
        Letting — {data.letting.unitRef || "Unit"}, {data.letting.assetName}
      </div>
      <div
        style={{
          font: "300 13px var(--sans)",
          color: "var(--tx3)",
          marginBottom: "20px",
        }}
        className="a1"
      >
        {data.letting.sqft.toLocaleString()} sqft · {data.letting.status} · Asking{" "}
        {data.letting.sym}
        {data.letting.askingRentPerSqft.toFixed(2)}/sqft (
        {formatCurrency(data.letting.askingRent)}/yr)
      </div>

      {/* Letting KPIs */}
      <div className="kpis a1" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="kpi">
          <div className="kpi-l">Days Listed</div>
          <div className="kpi-v">{data.letting.daysListed}</div>
          <div className="kpi-note">
            since{" "}
            {new Date(
              Date.now() - data.letting.daysListed * 86_400_000
            ).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Enquiries</div>
          <div className="kpi-v">{data.stats.totalEnquiries}</div>
          <div className="kpi-note">
            {data.stats.viewingsBooked} viewing
            {data.stats.viewingsBooked !== 1 ? "s" : ""} booked
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Asking Rent</div>
          <div className="kpi-v">
            {data.letting.sym}
            {data.letting.askingRentPerSqft.toFixed(0)}
            <small>/sqft</small>
          </div>
          <div className="kpi-note">
            {formatCurrency(data.letting.askingRent)}/yr
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Void Cost</div>
          <div className="kpi-v" style={{ color: "var(--red)" }}>
            {formatCurrency(Math.round(data.stats.voidCostMonthly / 1000))}k
            <small>/mo</small>
          </div>
          <div className="kpi-note">
            <span className="neg">
              {formatCurrency(data.stats.voidCostAnnual)}/yr lost
            </span>
          </div>
        </div>
      </div>

      {/* ENQUIRIES */}
      <div className="card a2">
        <div className="card-hd">
          <h4>Enquiries</h4>
          <span className="card-link">Add enquiry →</span>
        </div>
        {data.enquiries.length > 0 ? (
          data.enquiries.map((enquiry) => (
            <div key={enquiry.id} className="row row-5">
              <div>
                <div className="row-name">{enquiry.companyName}</div>
                <div className="row-sub">
                  {enquiry.useCase && `${enquiry.useCase} · `}
                  {enquiry.sqftMin && enquiry.sqftMax
                    ? `${enquiry.sqftMin.toLocaleString()}–${enquiry.sqftMax.toLocaleString()} sqft`
                    : enquiry.sqftMin
                    ? `${enquiry.sqftMin.toLocaleString()} sqft`
                    : ""}
                  {enquiry.notes && ` · ${enquiry.notes}`}
                </div>
              </div>
              <span
                className={`row-tag ${getEnquiryStatusTag(enquiry.status)}`}
              >
                {getEnquiryStatusLabel(enquiry.status)}
              </span>
              <span className="row-mono">
                {enquiry.covenantGrade
                  ? `Grade ${enquiry.covenantGrade.toUpperCase()}`
                  : "—"}
              </span>
              <span className="row-val">
                {enquiry.priceOffered
                  ? `${data.letting.sym}${(
                      enquiry.priceOffered / data.letting.sqft
                    ).toFixed(0)}/sqft`
                  : "TBC"}
              </span>
              <span className="row-go">→</span>
            </div>
          ))
        ) : (
          <div
            style={{
              padding: "20px 18px",
              textAlign: "center",
              font: "400 13px var(--sans)",
              color: "var(--tx3)",
            }}
          >
            No enquiries yet
          </div>
        )}
      </div>

      {/* LISTING DETAILS */}
      <div className="card a3">
        <div className="card-hd">
          <h4>Listing Details</h4>
          <span className="card-link">Edit listing →</span>
        </div>
        <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
          <div className="row-name">Unit</div>
          <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
            {data.letting.unitRef || "—"}
          </div>
        </div>
        <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
          <div className="row-name">Size</div>
          <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
            {data.letting.sqft.toLocaleString()} sqft
          </div>
        </div>
        <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
          <div className="row-name">Asking rent</div>
          <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
            {data.letting.sym}
            {data.letting.askingRentPerSqft.toFixed(2)}/sqft (
            {formatCurrency(data.letting.askingRent)}/yr)
          </div>
        </div>
        {data.letting.leaseTermYears && (
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Lease term</div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
              {data.letting.leaseTermYears} years preferred
            </div>
          </div>
        )}
        {data.letting.useClass && (
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Use class</div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
              {data.letting.useClass}
            </div>
          </div>
        )}
        {data.letting.notes && (
          <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="row-name">Condition</div>
            <div style={{ font: "500 12px var(--sans)", color: "var(--tx)" }}>
              {data.letting.notes}
            </div>
          </div>
        )}
      </div>

      <div className="btn-row a3">
        <button
          className="btn-primary"
          style={{ flex: 1 }}
          disabled={data.enquiries.length === 0}
        >
          Generate HoTs for {data.enquiries[0]?.companyName || "tenant"} →
        </button>
        <button className="btn-secondary" style={{ flex: 1, marginTop: 0 }}>
          Create marketing brochure →
        </button>
      </div>

      <Link href={`/assets/${assetId}`}>
        <button className="btn-secondary" style={{ marginTop: "16px" }}>
          ← Back to property
        </button>
      </Link>
    </div>
  );
}
