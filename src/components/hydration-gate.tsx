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
    <div className="px-4 py-6 md:px-8">
      <div className="flex items-end gap-6">
        <Skeleton className="size-40 rounded-2xl md:size-52" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <div className="mt-10 flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
