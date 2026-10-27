import type { Metadata } from "next";

import { FavoritesView } from "@/components/views/favorites-view";

export const metadata: Metadata = { title: "Favoritos · Sintonia" };

export default function FavoritesPage() {
  return <FavoritesView />;
}
