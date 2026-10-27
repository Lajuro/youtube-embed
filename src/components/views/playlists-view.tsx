"use client";

import { ListMusic, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { HydrationGate } from "@/components/hydration-gate";
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
    <div className="px-4 pt-6 pb-16 md:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Playlists</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {playlists.length ? pluralize(playlists.length, "playlist", "playlists") : "Organize seus vídeos por momento, humor ou projeto."}
          </p>
        </div>
        <Button variant="brand" className="rounded-full" onClick={() => openPlaylistDialog()}>
          <Plus /> Nova playlist
        </Button>
      </div>

      {playlists.length === 0 ? (
        <EmptyState
          icon={ListMusic}
          title="Nenhuma playlist ainda"
          description="Que tal uma para foco profundo, outra para o fim do expediente e outra para a sexta-feira?"
        >
          <Button variant="brand" className="rounded-full" onClick={() => openPlaylistDialog()}>
            <Plus /> Criar playlist
          </Button>
        </EmptyState>
      ) : (
        <div className="-mx-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {playlists.map((p) => (
            <PlaylistCard key={p.id} playlist={p} />
          ))}
          <button
            type="button"
            onClick={() => openPlaylistDialog()}
            className="group/new m-3 flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
          >
            <span className="grid size-12 place-items-center rounded-full bg-muted transition-transform group-hover/new:scale-110">
              <Plus className="size-6" />
            </span>
            <span className="text-sm font-medium">Nova playlist</span>
          </button>
        </div>
      )}
    </div>
  );
}
