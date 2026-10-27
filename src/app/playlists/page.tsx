import type { Metadata } from "next";

import { PlaylistsView } from "@/components/views/playlists-view";

export const metadata: Metadata = { title: "Playlists · Sintonia" };

export default function PlaylistsPage() {
  return <PlaylistsView />;
}
