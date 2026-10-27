import { Suspense } from "react";

import { PageSkeleton } from "@/components/hydration-gate";
import { PlaylistView } from "@/components/views/playlist-view";

/**
 * As playlists vivem no localStorage, então o ID só é conhecido no navegador.
 * Com Cache Components, o acesso a `params` precisa ficar dentro de um Suspense.
 */
export default function PlaylistPage({ params }: PageProps<"/playlists/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PlaylistView params={params} />
    </Suspense>
  );
}
