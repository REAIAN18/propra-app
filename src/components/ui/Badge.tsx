interface BadgeProps {
  children: React.ReactNode;
  variant?: "green" | "amber" | "blue" | "red" | "gray";
  className?: string;
}

const variants = {
  green: { bg: "#F0FDF4", color: "#0A8A4C", border: "#BBF7D0" },
  amber: { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
  blue: { bg: "#EEF2FF", color: "#1647E8", border: "#C7D2FE" },
  red: { bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
  gray: { bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" },
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
