"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  GraduationCap,
  Eye,
  EyeOff,
  Heart,
  ListMusic,
  Loader2,
  Maximize2,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VideoThumbnail } from "@/components/video/video-thumbnail";
import { PlaybackRateMenu } from "@/components/player/playback-rate-menu";
import { PLAYER_BAR_HEIGHT } from "@/components/player/player-host";
import { toggleFavorite } from "@/lib/actions";
import { cn, formatTime } from "@/lib/utils";
import { useLibrary } from "@/stores/library-store";
import { useCurrentVideoId, usePlayer } from "@/stores/player-store";
import { useUi } from "@/stores/ui-store";

function IconButton({
  label,
  shortcut,
  className,
  active,
  ...props
}: React.ComponentProps<typeof Button> & { label: string; shortcut?: string; active?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={active}
          className={cn(
            "relative text-muted-foreground hover:bg-transparent hover:text-foreground dark:hover:bg-transparent",
            active && "text-primary hover:text-primary",
            className
          )}
          {...props}
        />
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        {label}
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </TooltipContent>
    </Tooltip>
  );
}

function ActiveDot({ show }: { show: boolean }) {
  return (
    <span
      className={cn(
        "absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary transition-opacity",
        show ? "opacity-100" : "opacity-0"
      )}
    />
  );
}

export function PlayerBar() {
  const currentId = useCurrentVideoId();
  const video = useLibrary((s) => (currentId ? s.videos[currentId] : undefined));
  const isFavorite = useLibrary((s) => (currentId ? s.favorites.includes(currentId) : false));
  const status = usePlayer((s) => s.status);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const expanded = usePlayer((s) => s.expanded);
  const videoMode = usePlayer((s) => s.videoMode);
  const queueOpen = usePlayer((s) => s.queueOpen);
  const source = usePlayer((s) => s.source);
  const hasQueue = usePlayer((s) => s.queue.length > 0);
  const openAddDialog = useUi((s) => s.openAddDialog);

  const player = usePlayer.getState();
  const isPlaying = status === "playing" || status === "buffering";
  const isLoading = status === "loading" || status === "buffering";

  return (
    <footer
      className="relative z-40 flex shrink-0 items-center gap-3 border-t bg-background/85 px-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 md:gap-6 md:px-4"
      style={{ height: PLAYER_BAR_HEIGHT }}
    >
      {/* Barra de progresso fininha no mobile */}
      <div className="absolute inset-x-0 top-0 md:hidden">
        <MobileProgress />
      </div>

      {/* Esquerda: vídeo atual */}
      <div className="flex min-w-0 flex-1 items-center gap-3 md:w-[30%] md:flex-none">
        {currentId && video ? (
          <>
            <button
              type="button"
              onClick={() => player.setExpanded(!expanded)}
              className="group/thumb relative shrink-0 cursor-pointer overflow-hidden rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              aria-label={expanded ? "Fechar “Tocando agora”" : "Abrir “Tocando agora”"}
            >
              <VideoThumbnail id={currentId} className="aspect-video h-12 md:h-14" />
              <span className="absolute inset-0 grid place-items-center bg-black/50 text-white opacity-0 transition-opacity group-hover/thumb:opacity-100">
                {expanded ? <ChevronDown className="size-5" /> : <Maximize2 className="size-4" />}
              </span>
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium" title={video.title}>
                {video.title}
              </p>
              {source?.type === "course" && source.id ? (
                <Link
                  href={`/courses/${source.id}`}
                  className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  <GraduationCap className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate">{source.label}</span>
                </Link>
              ) : (
                <p className="truncate text-xs text-muted-foreground">{video.author ?? "Canal desconhecido"}</p>
              )}
            </div>
            <IconButton
              label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              shortcut="F"
              onClick={() => toggleFavorite(currentId)}
              className="hidden shrink-0 sm:inline-flex"
            >
              <Heart className={cn(isFavorite && "fill-primary text-primary")} />
            </IconButton>
          </>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid aspect-video h-12 shrink-0 place-items-center rounded-md border border-dashed text-muted-foreground md:h-14">
              <ListMusic className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Nada tocando</p>
              <button
                type="button"
                onClick={() => openAddDialog()}
                className="inline-flex cursor-pointer items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="size-3" /> Adicionar um vídeo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Centro: controles */}
      <div className="flex shrink-0 items-center gap-1 md:flex-1 md:flex-col md:gap-1.5">
        <div className="flex items-center gap-1 md:gap-2">
          <IconButton
            label={shuffle ? "Desativar aleatório" : "Ativar aleatório"}
            shortcut="S"
            active={shuffle}
            onClick={player.toggleShuffle}
            className="hidden md:inline-flex"
          >
            <Shuffle />
            <ActiveDot show={shuffle} />
          </IconButton>
          <IconButton label="Anterior" shortcut="P" onClick={player.previous} disabled={!hasQueue} className="hidden sm:inline-flex">
            <SkipBack className="fill-current" />
          </IconButton>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                aria-label={isPlaying ? "Pausar" : "Tocar"}
                disabled={!hasQueue}
                onClick={player.togglePlay}
                className="size-10 rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-105 hover:bg-foreground active:scale-95"
              >
                {isLoading && !isPlaying ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="size-5 fill-current" />
                ) : (
                  <Play className="ml-0.5 size-5 fill-current" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
              {isPlaying ? "Pausar" : "Tocar"} <Kbd>Espaço</Kbd>
            </TooltipContent>
          </Tooltip>
          <IconButton label="Próximo" shortcut="N" onClick={() => player.next()} disabled={!hasQueue}>
            <SkipForward className="fill-current" />
          </IconButton>
          <IconButton
            label={repeat === "off" ? "Repetir tudo" : repeat === "all" ? "Repetir um" : "Desativar repetição"}
            shortcut="R"
            active={repeat !== "off"}
            onClick={player.cycleRepeat}
            className="hidden md:inline-flex"
          >
            {repeat === "one" ? <Repeat1 /> : <Repeat />}
            <ActiveDot show={repeat !== "off"} />
          </IconButton>
        </div>
        <div className="hidden w-full max-w-xl md:block">
          <DesktopProgress />
        </div>
      </div>

      {/* Direita: fila, vídeo, volume */}
      <div className="hidden items-center justify-end gap-1 md:flex md:w-[30%]">
        <PlaybackRateMenu className="hidden lg:inline-flex" />
        <IconButton
          label={videoMode === "hidden" ? "Mostrar mini player" : "Ocultar vídeo (só áudio)"}
          shortcut="V"
          active={videoMode === "mini" && hasQueue}
          disabled={!hasQueue}
          onClick={() => player.setVideoMode(videoMode === "hidden" ? "mini" : "hidden")}
        >
          {videoMode === "hidden" ? <EyeOff /> : <Eye />}
        </IconButton>
        <IconButton
          label="Fila de reprodução"
          shortcut="Q"
          active={queueOpen}
          onClick={() => player.setQueueOpen(!queueOpen)}
        >
          <ListMusic />
          <ActiveDot show={queueOpen} />
        </IconButton>
        <VolumeControl />
        <IconButton
          label={expanded ? "Fechar “Tocando agora”" : "Abrir “Tocando agora”"}
          shortcut="E"
          disabled={!hasQueue}
          active={expanded}
          onClick={() => player.setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown /> : <Maximize2 />}
        </IconButton>
      </div>

      {/* Mobile: fila */}
      <IconButton
        label="Fila de reprodução"
        onClick={() => player.setQueueOpen(!queueOpen)}
        className="md:hidden"
      >
        <ListMusic />
      </IconButton>
    </footer>
  );
}

function useProgress() {
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const isLive = usePlayer((s) => s.isLive);
  const hasQueue = usePlayer((s) => s.queue.length > 0);
  return { currentTime, duration, isLive, hasQueue };
}

function DesktopProgress() {
  const { currentTime, duration, isLive, hasQueue } = useProgress();
  const [dragValue, setDragValue] = useState<number | null>(null);
  const shown = dragValue ?? currentTime;

  return (
    <div className="flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
      <span className="w-12 text-right">{hasQueue && !isLive ? formatTime(shown) : isLive ? formatTime(currentTime) : "--:--"}</span>
      {isLive ? (
        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-foreground/15">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-red-500/60 to-red-500" />
        </div>
      ) : (
        <Slider
          aria-label="Progresso"
          min={0}
          max={Math.max(duration, 1)}
          step={1}
          value={[Math.min(shown, Math.max(duration, 1))]}
          disabled={!hasQueue || !duration}
          onValueChange={([v]) => setDragValue(v)}
          onValueCommit={([v]) => {
            usePlayer.getState().seek(v);
            setDragValue(null);
          }}
          className="flex-1"
        />
      )}
      <span className="min-w-12 whitespace-nowrap">
        {isLive ? (
          <span className="inline-flex items-center gap-1 font-semibold tracking-wider text-red-500 uppercase">
            <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
            Ao vivo
          </span>
        ) : (
          formatTime(hasQueue && duration ? duration : undefined)
        )}
      </span>
    </div>
  );
}

function MobileProgress() {
  const { currentTime, duration, isLive } = useProgress();
  const pct = isLive ? 100 : duration ? (currentTime / duration) * 100 : 0;
  return (
    <div className="h-0.5 w-full bg-foreground/10">
      <div
        className={cn("h-full transition-[width] duration-300", isLive ? "bg-red-500" : "bg-brand-gradient")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function VolumeControl() {
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const effective = muted ? 0 : volume;
  const Icon = effective === 0 ? VolumeX : effective < 50 ? Volume1 : Volume2;

  return (
    <div className="flex items-center gap-1">
      <IconButton label={muted ? "Ativar som" : "Silenciar"} shortcut="M" onClick={usePlayer.getState().toggleMute}>
        <Icon />
      </IconButton>
      <Slider
        aria-label="Volume"
        min={0}
        max={100}
        step={1}
        value={[effective]}
        onValueChange={([v]) => usePlayer.getState().setVolume(v)}
        className="w-24 lg:w-28"
      />
    </div>
  );
}
