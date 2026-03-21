interface PageHeroCell {
  label: string;
  value: string;
  valueColor?: string;
  sub: string;
  subColor?: string;
}

interface PageHeroProps {
  greeting?: string;
  title?: string;
  subtitle?: string;
  cells: PageHeroCell[];
}

export function PageHero({ greeting, title, subtitle, cells }: PageHeroProps) {
  return (
    <div
      className="rounded-2xl px-6 pt-5 pb-5 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #F0FDF4 0%, #fff 100%)", border: "1px solid #BBF7D0" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 72% -10%, rgba(10,138,76,.05) 0%, transparent 68%)" }}
      />
      <div className="relative z-10">
        {greeting ? (
          <>
            <h1
              style={{
                fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                fontSize: 24,
                color: "#111827",
                lineHeight: 1.15,
                marginBottom: 2,
                fontWeight: 400,
              }}
            >
              {greeting}
            </h1>
            <p className="text-[11px] mb-4" style={{ color: "#9CA3AF" }}>
              {subtitle}
            </p>
          </>
        ) : (
          <>
            <h1
              style={{
                fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                fontSize: 22,
                color: "#111827",
                lineHeight: 1.15,
                marginBottom: subtitle ? 2 : 14,
                fontWeight: 400,
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] mb-4" style={{ color: "#9CA3AF" }}>
                {subtitle}
              </p>
            )}
          </>
        )}
        <div
          className="grid rounded-xl overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${cells.length}, 1fr)`,
            gap: 1,
            background: "#E5E7EB",
          }}
        >
          {cells.map((cell, i) => (
            <div key={i} className="px-3 py-2.5" style={{ background: "#fff" }}>
              <p
                className="text-[8px] font-bold uppercase tracking-wider mb-1"
                style={{ color: "#9CA3AF" }}
              >
                {cell.label}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif",
                  fontSize: 18,
                  color: cell.valueColor || "#111827",
                  lineHeight: 1,
                  marginBottom: 2,
                }}
              >
                {cell.value}
              </p>
              <p className="text-[9px]" style={{ color: cell.subColor || "#9CA3AF" }}>
                {cell.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
