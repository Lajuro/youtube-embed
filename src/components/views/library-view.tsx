"use client";

import { useMemo, useState } from "react";
import { Library, Plus, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CollectionPlayButtons } from "@/components/collection-actions";
import { EmptyState } from "@/components/empty-state";
import { HydrationGate } from "@/components/hydration-gate";
import { MetaDot, PageHeader } from "@/components/page-header";
import { CollectionToolbar, useFilteredIds, type SortKey } from "@/components/video/collection-toolbar";
import { VideoCard } from "@/components/video/video-card";
import { VideoList } from "@/components/video/video-list";
import { playList } from "@/lib/actions";
import { formatTotalDuration, pluralize } from "@/lib/utils";
import { sortByAddedDesc, useLibrary } from "@/stores/library-store";
import type { QueueSource } from "@/stores/player-store";
import { useUi } from "@/stores/ui-store";

const SOURCE: QueueSource = { type: "library", label: "Biblioteca" };

export function LibraryView() {
  return (
    <HydrationGate>
      <LibraryContent />
    </HydrationGate>
  );
}

function LibraryContent() {
  const videos = useLibrary((s) => s.videos);
  const openAddDialog = useUi((s) => s.openAddDialog);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("added");
  const [view, setView] = useState<"list" | "grid">("list");

  const allIds = useMemo(() => sortByAddedDesc(videos).map((v) => v.id), [videos]);
  const ids = useFilteredIds(allIds, videos, query, sort);
  const total = allIds.reduce((sum, id) => sum + (videos[id]?.duration ?? 0), 0);

  return (
    <div className="pb-16">
      <PageHeader
        eyebrow="Coleção"
        title="Biblioteca"
        accent="color-mix(in oklch, oklch(0.6 0.18 250) 45%, transparent)"
        cover={
          <div className="grid size-32 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-2xl md:size-40">
            <Library className="size-12 md:size-16" />
          </div>
        }
        description="Todos os vídeos que você já adicionou."
        meta={
          <>
            <span className="font-medium text-foreground">{pluralize(allIds.length, "vídeo", "vídeos")}</span>
            {total > 0 && (
              <>
                <MetaDot /> {formatTotalDuration(total)}
              </>
            )}
          </>
        }
        actions={
          <>
            <CollectionPlayButtons ids={ids} source={SOURCE} />
            <Button variant="outline" className="rounded-full" onClick={() => openAddDialog()}>
              <Plus /> Adicionar vídeos
            </Button>
            {allIds.length > 0 && (
              <CollectionToolbar
                className="ml-auto"
                query={query}
                onQueryChange={setQuery}
                sort={sort}
                onSortChange={setSort}
                sortOptions={["added", "title", "plays", "recent", "duration"]}
                view={view}
                onViewChange={setView}
              />
            )}
          </>
        }
      />

      <div className="px-2 md:px-6">
        {allIds.length === 0 ? (
          <EmptyState
            icon={Library}
            title="Sua biblioteca está vazia"
            description="Cole um link do YouTube para adicionar o primeiro vídeo."
            className="mx-2"
          >
            <Button variant="brand" className="rounded-full" onClick={() => openAddDialog()}>
              <Plus /> Adicionar vídeo
            </Button>
          </EmptyState>
        ) : ids.length === 0 ? (
          <EmptyState icon={SearchX} title="Nada encontrado" description={`Nenhum vídeo corresponde a “${query}”.`} className="mx-2" />
        ) : view === "list" ? (
          <VideoList ids={ids} source={SOURCE} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {ids.map((id, i) => (
              <VideoCard key={id} id={id} onPlay={() => playList(ids, i, SOURCE)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
