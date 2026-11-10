"use client";

import { ListMusic, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { HydrationGate } from "@/components/hydration-gate";
import { PageIntro } from "@/components/page-header";
import { PlaylistCard } from "@/components/playlist/playlist-card";
import { pluralize } from "@/lib/utils";
import { useLibrary } from "@/stores/library-store";
import { useUi } from "@/stores/ui-store";

export function PlaylistsView() {
  return (
    <HydrationGate>
      <PlaylistsContent />
    </HydrationGate>
  );
}

function PlaylistsContent() {
  const playlists = useLibrary((s) => s.playlists);
  const openPlaylistDialog = useUi((s) => s.openPlaylistDialog);

  return (
    <div className="pb-16">
      <PageIntro
        title="Playlists"
        description={
          playlists.length ? pluralize(playlists.length, "playlist", "playlists") : "Organize seus vídeos por momento, clima ou projeto."
        }
        actions={
          <Button onClick={() => openPlaylistDialog()}>
            <Plus /> Nova playlist
          </Button>
        }
      />

      <div className="px-4 md:px-8">
        {playlists.length === 0 ? (
          <EmptyState
            icon={ListMusic}
            title="Nenhuma playlist ainda"
            description="Crie uma para foco profundo, outra para o fim do expediente, outra para a sexta-feira."
          >
            <Button onClick={() => openPlaylistDialog()}>
              <Plus /> Criar playlist
            </Button>
          </EmptyState>
        ) : (
          <div className="stagger -mx-2.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {playlists.map((p) => (
              <PlaylistCard key={p.id} playlist={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
