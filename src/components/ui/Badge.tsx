interface BadgeProps {
  children: React.ReactNode;
  variant?: "green" | "amber" | "blue" | "red" | "gray";
  className?: string;
}

const variants = {
  green: { bg: "var(--grn-lt)", color: "#34d399", border: "var(--grn-bdr)" },
  amber: { bg: "var(--amb-lt)", color: "#fbbf24", border: "var(--amb-bdr)" },
  blue: { bg: "var(--acc-lt)", color: "#7c6af0", border: "var(--acc-bdr)" },
  red: { bg: "var(--red-lt)", color: "#f87171", border: "var(--red-bdr)" },
  gray: { bg: "var(--s2)", color: "var(--tx2)", border: "var(--bdr)" },
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
