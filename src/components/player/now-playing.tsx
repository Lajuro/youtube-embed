/* eslint-disable @next/next/no-img-element -- fundo usa a miniatura direto do i.ytimg.com */
"use client";

import { useEffect } from "react";
import { ChevronDown, Copy, ListPlus, MoreHorizontal, PanelRight, Plus, RectangleHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { QueueList } from "@/components/player/queue-list";
import { PLAYER_STAGE_ID } from "@/components/player/player-host";
import { FavoriteHeart } from "@/components/video/favorite-heart";
import { usePlayerBarHeight } from "@/lib/layout";
import { VideoDropdownMenu } from "@/components/video/video-menu";
import { addToPlaylist, copyVideoLink, toggleFavorite } from "@/lib/actions";
import { cn, formatTime } from "@/lib/utils";
import { thumbnailUrl } from "@/lib/youtube";
import { useLibrary } from "@/stores/library-store";
import { useCurrentVideoId, usePlayer } from "@/stores/player-store";
import { useSettings, useUi } from "@/stores/ui-store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Fundo "ambient": a miniatura do vídeo bem desfocada, como o modo ambiente do YouTube. */
export function AmbientBackdrop({ videoId, className }: { videoId: string | null; className?: string }) {
  const ambient = useSettings((s) => s.ambient);
  if (!videoId || !ambient) return null;
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <img
        key={videoId}
        src={thumbnailUrl(videoId, "hqdefault")}
        alt=""
        className="absolute inset-0 size-full scale-125 object-cover opacity-50 blur-3xl saturate-150 animate-in fade-in duration-1000 dark:opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />
      <div className="bg-noise absolute inset-0 opacity-[0.04] mix-blend-overlay" />
    </div>
  );
}

/** O vídeo usa a maior largura que ainda cabe na altura (descontando topo, título e barra do player). */
const stageMaxWidth = (bar: number) => `max(18rem, calc((100dvh - ${bar}px - 190px) * 16 / 9))`;

export function NowPlaying() {
  const expanded = usePlayer((s) => s.expanded);
  const setExpanded = usePlayer((s) => s.setExpanded);
  const currentId = useCurrentVideoId();
  const source = usePlayer((s) => s.source);
  const isLive = usePlayer((s) => s.isLive);
  const duration = usePlayer((s) => s.duration);
  const video = useLibrary((s) => (currentId ? s.videos[currentId] : undefined));
  const isFavorite = useLibrary((s) => (currentId ? s.favorites.includes(currentId) : false));
  const playlists = useLibrary((s) => s.playlists);
  const openPlaylistDialog = useUi((s) => s.openPlaylistDialog);
  const showQueue = useSettings((s) => s.nowPlayingQueue);
  const setShowQueue = useSettings((s) => s.setNowPlayingQueue);
  const bar = usePlayerBarHeight();
  const maxWidth = stageMaxWidth(bar);

  // Fecha automaticamente se a fila acabar.
  useEffect(() => {
    if (expanded && !currentId) setExpanded(false);
  }, [expanded, currentId, setExpanded]);

  if (!expanded || !currentId) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[35] flex flex-col overflow-hidden bg-background animate-in fade-in duration-300"
      style={{ bottom: bar }}
      role="dialog"
      aria-label="Tocando agora"
    >
      <AmbientBackdrop videoId={currentId} />

      <header className="relative flex items-center justify-between gap-4 px-4 py-3 md:px-8 md:py-4">
        <Button variant="ghost" size="icon" onClick={() => setExpanded(false)} aria-label="Fechar">
          <ChevronDown className="size-5" />
        </Button>
        <div className="min-w-0 text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">Tocando agora</p>
          {source && <p className="truncate text-sm font-medium">{source.label}</p>}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:inline-flex"
                aria-pressed={!showQueue}
                aria-label={showQueue ? "Modo cinema" : "Mostrar a fila"}
                onClick={() => setShowQueue(!showQueue)}
              >
                {showQueue ? <RectangleHorizontal className="size-5" /> : <PanelRight className="size-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
              {showQueue ? "Modo cinema" : "Mostrar a fila"} <Kbd>T</Kbd>
            </TooltipContent>
          </Tooltip>
          <span className="hidden items-center gap-1.5 pl-2 text-xs text-muted-foreground xl:flex">
            <Kbd>Esc</Kbd> fecha
          </span>
        </div>
      </header>

      <div
        className={cn(
          "relative grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto scrollbar-thin px-4 pb-5 md:px-8 lg:gap-8 lg:overflow-hidden",
          showQueue && "lg:grid-cols-[minmax(0,1fr)_360px]"
        )}
      >
        <div className="flex min-w-0 flex-col items-center lg:justify-center">
          {/* O iframe é posicionado exatamente sobre este elemento (ver PlayerHost). */}
          <div
            id={PLAYER_STAGE_ID}
            className="aspect-video w-full rounded-2xl bg-black/40"
            style={{ maxWidth }}
          />
          <div
            className="mt-5 flex w-full items-start justify-between gap-4"
            style={{ maxWidth }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {isLive && <Badge variant="live">Ao vivo</Badge>}
                {!isLive && duration > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">{formatTime(duration)}</span>
                )}
              </div>
              <h2 className="mt-1 line-clamp-2 text-xl font-bold tracking-tight text-balance md:text-2xl">
                {video?.title ?? currentId}
              </h2>
              <p className="mt-1 truncate text-sm text-muted-foreground">{video?.author ?? "Canal desconhecido"}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleFavorite(currentId)}
                aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                <FavoriteHeart active={isFavorite} className="size-5" />
              </Button>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Adicionar à playlist">
                    <ListPlus className="size-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Adicionar à playlist</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => openPlaylistDialog({ videoIds: [currentId] })}>
                    <Plus /> Nova playlist…
                  </DropdownMenuItem>
                  {playlists.length > 0 && <DropdownMenuSeparator />}
                  {playlists.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      disabled={p.videoIds.includes(currentId)}
                      onSelect={() => addToPlaylist(p.id, [currentId])}
                    >
                      <span className="truncate">{p.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex"
                onClick={() => copyVideoLink(currentId)}
                aria-label="Copiar link"
              >
                <Copy className="size-5" />
              </Button>
              <VideoDropdownMenu videoId={currentId}>
                <Button variant="ghost" size="icon" aria-label="Mais opções">
                  <MoreHorizontal className="size-5" />
                </Button>
              </VideoDropdownMenu>
            </div>
          </div>
        </div>

        <aside
          className={cn(
            "min-h-0 rounded-2xl border bg-background/40 p-3 backdrop-blur-xl lg:overflow-y-auto lg:scrollbar-thin",
            !showQueue && "lg:hidden"
          )}
        >
          <QueueList compact />
        </aside>
      </div>
    </div>
  );
}
