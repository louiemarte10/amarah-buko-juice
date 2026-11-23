export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-stone-200 ${className}`} />;
}

/** Skeleton rows to drop inside a <tbody> while a table loads. */
export function SkeletonRows({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-stone-100 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3.5">
              <Skeleton
                className={`h-4 ${c === 0 ? "w-32" : "w-16"} ${c === 0 ? "" : "ml-auto"}`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** A grid of skeleton cards (POS products, etc.). */
export function SkeletonCards({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-surface p-3"
        >
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </>
  );
}
