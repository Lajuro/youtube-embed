"use client";

import { useMemo, useState } from "react";
import { Heart, Library, SearchX } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CollectionPlayButtons } from "@/components/collection-actions";
import { EmptyState } from "@/components/empty-state";
import { HydrationGate } from "@/components/hydration-gate";
import { MetaDot, PageHeader } from "@/components/page-header";
import { CollectionToolbar, useFilteredIds, type SortKey } from "@/components/video/collection-toolbar";
import { VideoList } from "@/components/video/video-list";
import { formatTotalDuration, pluralize } from "@/lib/utils";
import { useLibrary } from "@/stores/library-store";
import type { QueueSource } from "@/stores/player-store";

const SOURCE: QueueSource = { type: "favorites", label: "Favoritos" };

export function FavoritesView() {
  return (
    <HydrationGate>
      <FavoritesContent />
    </HydrationGate>
  );
}

function FavoritesContent() {
  const videos = useLibrary((s) => s.videos);
  const favorites = useLibrary((s) => s.favorites);
  const reorderFavorites = useLibrary((s) => s.reorderFavorites);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("custom");

  const allIds = useMemo(() => favorites.filter((id) => videos[id]), [favorites, videos]);
  const ids = useFilteredIds(allIds, videos, query, sort);
  const total = allIds.reduce((sum, id) => sum + (videos[id]?.duration ?? 0), 0);
  const canReorder = sort === "custom" && !query;

  return (
    <div className="pb-16">
      <PageHeader
        eyebrow="Coleção"
        title="Favoritos"
        cover={
          <div className="grid size-40 place-items-center rounded-2xl bg-brand-gradient text-white shadow-2xl md:size-52">
            <Heart className="size-16 fill-current md:size-20" />
          </div>
        }
        description="Os vídeos que você mais curte, sempre à mão."
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
            {allIds.length > 0 && (
              <CollectionToolbar
                className="ml-auto"
                query={query}
                onQueryChange={setQuery}
                sort={sort}
                onSortChange={setSort}
                sortOptions={["custom", "added", "title", "plays", "recent", "duration"]}
              />
            )}
          </>
        }
      />

      <div className="px-2 md:px-6">
        {allIds.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Nenhum favorito ainda"
            description="Toque no ♥ de um vídeo (ou aperte F enquanto ele toca) para guardá-lo aqui."
            className="mx-2"
          >
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/library">
                <Library /> Ir para a biblioteca
              </Link>
            </Button>
          </EmptyState>
        ) : ids.length === 0 ? (
          <EmptyState icon={SearchX} title="Nada encontrado" description={`Nenhum favorito corresponde a “${query}”.`} className="mx-2" />
        ) : (
          <VideoList ids={ids} source={SOURCE} onReorder={canReorder ? reorderFavorites : undefined} />
        )}
      </div>
    </div>
  );
}
