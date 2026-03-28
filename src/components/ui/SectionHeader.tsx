interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h2 className="text-base font-semibold" style={{ color: "var(--tx)" }}>{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm" style={{ color: "var(--tx3)" }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
