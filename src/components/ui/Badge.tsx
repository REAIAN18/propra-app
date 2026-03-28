interface BadgeProps {
  children: React.ReactNode;
  variant?: "green" | "amber" | "blue" | "red" | "gray";
  className?: string;
}

const variants = {
  green: { bg: "rgba(52,211,153,.07)", color: "#34d399", border: "rgba(52,211,153,.22)" },
  amber: { bg: "rgba(251,191,36,.07)", color: "#fbbf24", border: "rgba(251,191,36,.22)" },
  blue: { bg: "rgba(124,106,240,.10)", color: "#7c6af0", border: "rgba(124,106,240,.22)" },
  red: { bg: "rgba(248,113,113,.07)", color: "#f87171", border: "rgba(248,113,113,.22)" },
  gray: { bg: "#1f1f28", color: "#555568", border: "#252533" },
};

export function Badge({ children, variant = "gray", className = "" }: BadgeProps) {
  const v = variants[variant];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}
      style={{ backgroundColor: v.bg, color: v.color, border: `1px solid ${v.border}` }}
    >
      {children}
    </span>
  );
}
