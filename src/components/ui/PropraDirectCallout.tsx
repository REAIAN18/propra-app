export function PropraDirectCallout({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="py-3 px-4 rounded-r-2xl"
      style={{
        background: "rgba(91,240,172,.04)",
        border: "1px solid rgba(91,240,172,.18)",
        borderLeft: "3px solid #0A8A4C",
      }}
    >
      <p className="text-[13px] font-bold mb-0.5" style={{ color: "#5BF0AC" }}>
        {title}
      </p>
      <p className="text-[11px]" style={{ color: "rgba(255,255,255,.5)" }}>
        {body}
      </p>
    </div>
  );
}
