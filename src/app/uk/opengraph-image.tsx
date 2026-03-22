import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0B1622",
          padding: "72px 80px",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "48px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#0A8A4C",
            }}
          />
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#5a7a96",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontFamily: "sans-serif",
            }}
          >
            RealHQ · UK Commercial
          </span>
        </div>

        {/* Main headline */}
        <div
          style={{
            fontSize: "68px",
            fontWeight: 400,
            color: "#e8eef5",
            lineHeight: 1.1,
            marginBottom: "32px",
            maxWidth: "800px",
          }}
        >
          Every asset earning what it should.
        </div>

        {/* Sub */}
        <div
          style={{
            fontSize: "24px",
            color: "#5a7a96",
            lineHeight: 1.5,
            maxWidth: "680px",
            fontFamily: "sans-serif",
            fontWeight: 400,
            marginBottom: "60px",
          }}
        >
          RealHQ benchmarks your UK commercial portfolio against live market data
          and recovers every pound you&apos;re leaving behind.
        </div>

        {/* Stat pills */}
        <div style={{ display: "flex", gap: "24px" }}>
          {[
            { label: "Insurance", value: "avg 23% overpay" },
            { label: "Energy", value: "avg 31% overpay" },
            { label: "Rent", value: "avg 12% below ERV" },
            { label: "Income", value: "avg £614k untapped" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                padding: "16px 24px",
                backgroundColor: "#111e2e",
                border: "1px solid #1a2d45",
                borderRadius: "12px",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  color: "#5a7a96",
                  fontFamily: "sans-serif",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {s.label}
              </span>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#0A8A4C",
                  fontFamily: "sans-serif",
                }}
              >
                {s.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
