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
      style={{ background: "linear-gradient(170deg, #0B1622 0%, #0E1C30 65%, #080F1A 100%)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 72% -10%, rgba(91,240,172,.08) 0%, transparent 68%)" }}
      />
      <div className="relative z-10">
        {greeting ? (
          <>
            <h1
              style={{
                fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
                fontSize: 24,
                color: "#fff",
                lineHeight: 1.15,
                marginBottom: 2,
                fontWeight: 400,
              }}
            >
              {greeting}
            </h1>
            <p className="text-[11px] mb-4" style={{ color: "rgba(255,255,255,.3)" }}>
              {subtitle}
            </p>
          </>
        ) : (
          <>
            <h1
              style={{
                fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
                fontSize: 22,
                color: "#fff",
                lineHeight: 1.15,
                marginBottom: subtitle ? 2 : 14,
                fontWeight: 400,
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] mb-4" style={{ color: "rgba(255,255,255,.3)" }}>
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
            background: "rgba(255,255,255,.07)",
          }}
        >
          {cells.map((cell, i) => (
            <div key={i} className="px-3 py-2.5" style={{ background: "rgba(255,255,255,.04)" }}>
              <p
                className="text-[8px] font-bold uppercase tracking-wider mb-1"
                style={{ color: "rgba(255,255,255,.3)" }}
              >
                {cell.label}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
                  fontSize: 18,
                  color: cell.valueColor || "#fff",
                  lineHeight: 1,
                  marginBottom: 2,
                }}
              >
                {cell.value}
              </p>
              <p className="text-[9px]" style={{ color: cell.subColor || "rgba(255,255,255,.35)" }}>
                {cell.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
