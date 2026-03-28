"use client";

import { useRouter } from "next/navigation";
import { type ReactNode } from "react";

interface ActionAlertBadge {
  label: string;
  type: "red" | "amber" | "blue";
}

interface ActionAlertProps {
  type: "red" | "amber";
  icon: ReactNode;
  title: string;
  description: string;
  badges?: ActionAlertBadge[];
  valueDisplay?: string;
  valueSub?: string;
  href?: string;
}

export function ActionAlert({
  type,
  icon,
  title,
  description,
  badges,
  valueDisplay,
  valueSub,
  href,
}: ActionAlertProps) {
  const router = useRouter();
  const borderColor = type === "red" ? "rgba(248,113,113,.22)" : "rgba(251,191,36,.22)";
  const bgColor = type === "red" ? "rgba(248,113,113,.07)" : "rgba(251,191,36,.07)";
  const valueColor = type === "red" ? "#f87171" : "#fbbf24";

  return (
    <div
      className="rounded-2xl px-5 py-3.5 flex items-center gap-3.5 cursor-pointer transition-all"
      style={{ background: bgColor, border: `1.5px solid ${borderColor}` }}
      onClick={() => href && router.push(href)}
    >
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold mb-0.5" style={{ color: "#e4e4ec" }}>{title}</p>
        <p className="text-[11px] mb-2" style={{ color: "#8888a0" }}>
          {description}
        </p>
        {badges && (
          <div className="flex gap-1.5 flex-wrap">
            {badges.map((b, i) => (
              <span
                key={i}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background:
                    b.type === "red"
                      ? "rgba(248,113,113,.07)"
                      : b.type === "amber"
                      ? "rgba(251,191,36,.07)"
                      : "rgba(124,106,240,.10)",
                  color:
                    b.type === "red" ? "#f87171" : b.type === "amber" ? "#fbbf24" : "#7c6af0",
                }}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>
      {valueDisplay && (
        <div className="flex-shrink-0 text-right">
          <p
            style={{
              fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
              fontSize: 26,
              color: valueColor,
              lineHeight: 1,
            }}
          >
            {valueDisplay}
          </p>
          {valueSub && (
            <p className="text-[10px] mt-0.5" style={{ color: "#8888a0" }}>
              {valueSub}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
