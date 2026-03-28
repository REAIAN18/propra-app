export function DirectCallout({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="py-3 px-4 rounded-r-2xl"
      style={{
        background: "var(--acc-lt)",
        border: "1px solid var(--acc-bdr)",
        borderLeft: "3px solid #7c6af0",
      }}
    >
      <p className="text-[13px] font-bold mb-0.5" style={{ color: "#7c6af0" }}>
        {title}
      </p>
      <p className="text-[11px]" style={{ color: "var(--tx2)" }}>
        {body}
      </p>
    </div>
  );
}
