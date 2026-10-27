import { Suspense } from "react";
import type { Metadata } from "next";

import { PageSkeleton } from "@/components/hydration-gate";
import { SearchView } from "@/components/views/search-view";

export const metadata: Metadata = { title: "Buscar · Sintonia" };

/** `useSearchParams` só é conhecido no momento da requisição, por isso o Suspense. */
export default function SearchPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SearchView />
    </Suspense>
  );
}
