import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  rows?: number;
  columns?: number;
};

export default function AdminTableSkeleton({
  rows = 6,
  columns = 4,
}: Props) {
  return (
    <div className="space-y-3 rounded-2xl border bg-white p-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((__, col) => (
            <Skeleton key={col} className="h-8 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
