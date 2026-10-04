import { Skeleton } from "@/components/ui/states";

export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="جارٍ التحميل">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-56 rounded-[28px]" />
      <Skeleton className="h-24 rounded-[22px]" />
      <Skeleton className="h-24 rounded-[22px]" />
    </div>
  );
}
