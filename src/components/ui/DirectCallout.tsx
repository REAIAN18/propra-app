export function DirectCallout({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="py-3 px-4 rounded-r-2xl"
      style={{
        background: "#F0FDF4",
        border: "1px solid #BBF7D0",
        borderLeft: "3px solid #0A8A4C",
      }}
    >
      <p className="text-[13px] font-bold mb-0.5" style={{ color: "#0A8A4C" }}>
        {title}
      </p>
      <p className="text-[11px]" style={{ color: "#6B7280" }}>
        {body}
      </p>
    </div>
  );
}
