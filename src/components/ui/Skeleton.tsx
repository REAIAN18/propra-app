interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ backgroundColor: "#E5E7EB", ...style }}
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
    >
      <Skeleton className="h-3 w-20" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }}
    >
      <Skeleton className="h-4 w-32 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
