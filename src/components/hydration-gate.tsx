"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useHydration } from "@/stores/ui-store";

/** Evita "piscar" a tela vazia enquanto os dados do localStorage ainda não carregaram. */
export function HydrationGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const hydrated = useHydration((s) => s.hydrated);
  if (!hydrated) return <>{fallback ?? <PageSkeleton />}</>;
  return <>{children}</>;
}

export function PageSkeleton() {
  return (
    <div className="px-4 py-8 md:px-8">
      <div className="flex items-end gap-5">
        <Skeleton className="size-28 rounded-xl md:size-36" />
        <div className="flex flex-1 flex-col gap-2.5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-9 w-1/2" />
          <Skeleton className="h-3.5 w-1/4" />
        </div>
      </div>
      <div className="mt-10 flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
