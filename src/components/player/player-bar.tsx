"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Eye,
  EyeOff,
  GraduationCap,
  ListMusic,
  Loader2,
  Maximize2,
  Pause,
  Play,
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
import { FavoriteHeart } from "@/components/video/favorite-heart";
import { toggleFavorite } from "@/lib/actions";
import { PLAYER_BAR_HEIGHT } from "@/lib/layout";
import { cn, formatTime } from "@/lib/utils";
import { useLibrary } from "@/stores/library-store";
import { useCurrentVideoId, usePlayer } from "@/stores/player-store";

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
            "relative rounded-full text-muted-foreground hover:text-foreground",
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
        "absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary transition-opacity",
        show ? "opacity-100" : "opacity-0"
      )}
    />
  );
}

/** Barra do player (modo música). Só aparece quando há algo na fila. */
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

  if (!hasQueue || !currentId) return null;

  const player = usePlayer.getState();
  const isPlaying = status === "playing" || status === "buffering";
  const isLoading = status === "loading" || status === "buffering";

  return (
    <footer
      className="relative z-40 flex shrink-0 items-center gap-3 border-t bg-background/80 px-3 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300 md:gap-4 md:px-4"
      style={{ height: PLAYER_BAR_HEIGHT }}
    >
      <SeekBar />

      {/* Esquerda: o que está tocando */}
      <div className="flex min-w-0 flex-1 items-center gap-3 md:w-[32%] md:flex-none">
        <button
          type="button"
          onClick={() => player.setExpanded(!expanded)}
          className="group/thumb relative shrink-0 cursor-pointer overflow-hidden rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label={expanded ? "Fechar “Tocando agora”" : "Abrir “Tocando agora”"}
        >
          <VideoThumbnail id={currentId} className="aspect-video h-11" />
          <span className="absolute inset-0 grid place-items-center bg-black/50 text-white opacity-0 transition-opacity group-hover/thumb:opacity-100">
            {expanded ? <ChevronDown className="size-5" /> : <Maximize2 className="size-4" />}
          </span>
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={video?.title}>
            {video?.title ?? "Carregando…"}
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
            <p className="truncate text-xs text-muted-foreground">{video?.author ?? "Canal desconhecido"}</p>
          )}
        </div>
        <IconButton
          label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          shortcut="F"
          onClick={() => toggleFavorite(currentId)}
          className="hidden shrink-0 sm:inline-flex"
        >
          <FavoriteHeart active={isFavorite} />
        </IconButton>
      </div>

      {/* Centro: controles */}
      <div className="flex shrink-0 items-center justify-center gap-0.5 md:flex-1 md:gap-1.5">
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
        <IconButton label="Anterior" shortcut="P" onClick={player.previous} className="hidden sm:inline-flex">
          <SkipBack className="fill-current" />
        </IconButton>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              aria-label={isPlaying ? "Pausar" : "Tocar"}
              onClick={player.togglePlay}
              className="size-10 rounded-full bg-foreground text-background shadow-md transition-transform hover:scale-105 hover:bg-foreground active:scale-95"
            >
              {isLoading && !isPlaying ? (
                <Loader2 key="loading" className="size-5 animate-spin" />
              ) : isPlaying ? (
                <Pause key="pause" className="size-5 fill-current animate-in zoom-in-50 fade-in duration-200" />
              ) : (
                <Play key="play" className="ml-0.5 size-5 fill-current animate-in zoom-in-50 fade-in duration-200" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="flex items-center gap-2">
            {isPlaying ? "Pausar" : "Tocar"} <Kbd>Espaço</Kbd>
          </TooltipContent>
        </Tooltip>
        <IconButton label="Próximo" shortcut="N" onClick={() => player.next()}>
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
        <TimeLabel className="ml-2 hidden lg:block" />
      </div>

      {/* Direita: velocidade, vídeo, fila, volume */}
      <div className="hidden items-center justify-end gap-0.5 md:flex md:w-[32%]">
        <PlaybackRateMenu className="hidden xl:inline-flex" />
        <IconButton
          label={videoMode === "hidden" ? "Mostrar mini player" : "Ocultar vídeo (só áudio)"}
          shortcut="V"
          active={videoMode === "mini"}
          onClick={() => player.setVideoMode(videoMode === "hidden" ? "mini" : "hidden")}
        >
          {videoMode === "hidden" ? <EyeOff /> : <Eye />}
        </IconButton>
        <IconButton label="Fila de reprodução" shortcut="Q" active={queueOpen} onClick={() => player.setQueueOpen(!queueOpen)}>
          <ListMusic />
          <ActiveDot show={queueOpen} />
        </IconButton>
        <VolumeControl />
        <IconButton
          label={expanded ? "Fechar “Tocando agora”" : "Abrir “Tocando agora”"}
          shortcut="E"
          active={expanded}
          onClick={() => player.setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown /> : <Maximize2 />}
        </IconButton>
      </div>

      {/* Mobile: fila */}
      <IconButton label="Fila de reprodução" onClick={() => player.setQueueOpen(!queueOpen)} className="md:hidden">
        <ListMusic />
      </IconButton>
    </footer>
  );
}

function TimeLabel({ className }: { className?: string }) {
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const isLive = usePlayer((s) => s.isLive);
  if (isLive) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold tracking-wider text-red-500 uppercase", className)}>
        <span className="size-1.5 animate-pulse rounded-full bg-red-500" /> Ao vivo
      </span>
    );
  }
  return (
    <span className={cn("text-xs whitespace-nowrap text-muted-foreground tabular-nums", className)}>
      {formatTime(currentTime)} / {formatTime(duration || undefined)}
    </span>
  );
}

/**
 * Barra de progresso na borda de cima da barra do player (fina; engrossa ao passar o
 * mouse e mostra o tempo do ponto sob o cursor).
 */
function SeekBar() {
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const isLive = usePlayer((s) => s.isLive);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const [hover, setHover] = useState<{ x: number; time: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  if (isLive) {
    return (
      <div className="absolute inset-x-0 top-0 h-[3px] -translate-y-1/2 bg-red-500/80">
        <div className="h-full w-full animate-pulse bg-red-500" />
      </div>
    );
  }

  const shown = dragValue ?? currentTime;
  const max = Math.max(duration, 1);

  return (
    <div
      ref={ref}
      className="group/seek absolute inset-x-0 top-0 z-10 -translate-y-1/2 py-1.5"
      onPointerMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r || !duration) return;
        const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        setHover({ x: e.clientX - r.left, time: ratio * duration });
      }}
      onPointerLeave={() => setHover(null)}
    >
      <Slider
        aria-label="Progresso"
        min={0}
        max={max}
        step={1}
        value={[Math.min(shown, max)]}
        disabled={!duration}
        onValueChange={([v]) => setDragValue(v)}
        onValueCommit={([v]) => {
          usePlayer.getState().seek(v);
          setDragValue(null);
        }}
        trackClassName="rounded-none bg-foreground/10 data-[orientation=horizontal]:h-[3px] group-hover/seek:data-[orientation=horizontal]:h-[5px] group-hover/slider:data-[orientation=horizontal]:h-[5px]"
        rangeClassName="bg-brand-gradient group-hover/slider:bg-brand-gradient"
        thumbClassName="size-3"
      />
      {hover && duration > 0 && (
        <span
          className="pointer-events-none absolute -top-6 -translate-x-1/2 rounded-md bg-popover px-1.5 py-0.5 text-[11px] font-medium text-popover-foreground tabular-nums shadow-md ring-1 ring-border"
          style={{ left: hover.x }}
        >
          {formatTime(hover.time)}
        </span>
      )}
    </div>
  );
}

function VolumeControl() {
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const effective = muted ? 0 : volume;
  const Icon = effective === 0 ? VolumeX : effective < 50 ? Volume1 : Volume2;

  return (
    <div
      className="flex items-center gap-1"
      // Rodinha do mouse sobre o volume ajusta de 5 em 5.
      onWheel={(e) => {
        if (e.deltaY === 0) return;
        const player = usePlayer.getState();
        player.setVolume((player.muted ? 0 : player.volume) + (e.deltaY < 0 ? 5 : -5));
      }}
    >
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
        className="hidden w-20 lg:flex xl:w-24"
      />
    </div>
  );
}
