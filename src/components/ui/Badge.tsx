interface BadgeProps {
  children: React.ReactNode;
  variant?: "green" | "amber" | "blue" | "red" | "gray";
  className?: string;
}

const variants = {
  green: { bg: "#0a2e1a", color: "#2dd68a", border: "#0d4f2e" },
  amber: { bg: "#2e1e0a", color: "#F5A94A", border: "#4f330d" },
  blue: { bg: "#0a1540", color: "#5a8fef", border: "#0d2080" },
  red: { bg: "#2e0f0a", color: "#f06040", border: "#5c1e14" },
  gray: { bg: "#111e2e", color: "#8ba0b8", border: "#1a2d45" },
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
