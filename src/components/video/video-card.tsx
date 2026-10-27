"use client";

import { MoreHorizontal, Pause, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Equalizer } from "@/components/video/equalizer";
import { VideoContextMenu, VideoDropdownMenu } from "@/components/video/video-menu";
import { VideoThumbnail } from "@/components/video/video-thumbnail";
import { cn, formatTime } from "@/lib/utils";
import { useLibrary } from "@/stores/library-store";
import { useCurrentVideoId, usePlayer } from "@/stores/player-store";

export function VideoCard({ id, onPlay, className }: { id: string; onPlay: () => void; className?: string }) {
  const video = useLibrary((s) => s.videos[id]);
  const isCurrent = useCurrentVideoId() === id;
  const isPlaying = usePlayer((s) => isCurrent && (s.status === "playing" || s.status === "buffering"));

  if (!video) return null;

  return (
    <VideoContextMenu videoId={id} onPlay={onPlay}>
      <div className={cn("group/card relative flex min-w-0 flex-col gap-2.5 rounded-xl p-2 transition-colors hover:bg-accent/50", className)}>
        <button
          type="button"
          onClick={isCurrent ? () => usePlayer.getState().togglePlay() : onPlay}
          className="relative block cursor-pointer overflow-hidden rounded-lg text-left focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label={`Tocar ${video.title}`}
        >
          <VideoThumbnail
            id={id}
            alt={video.title}
            className="aspect-video w-full"
            imgClassName="transition-transform duration-500 group-hover/card:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover/card:opacity-100" />
            {video.isLive ? (
              <Badge variant="live" className="absolute top-2 left-2">
                Ao vivo
              </Badge>
            ) : video.duration ? (
              <span className="absolute right-2 bottom-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
                {formatTime(video.duration)}
              </span>
            ) : null}
            {isCurrent && (
              <span className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 backdrop-blur">
                <Equalizer paused={!isPlaying} />
              </span>
            )}
            <span
              className={cn(
                "absolute bottom-2 left-2 grid size-11 translate-y-2 place-items-center rounded-full bg-brand-gradient text-white opacity-0 shadow-xl transition-all duration-300 group-hover/card:translate-y-0 group-hover/card:opacity-100",
                isCurrent && isPlaying && "translate-y-0 opacity-100"
              )}
            >
              {isCurrent && isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
            </span>
          </VideoThumbnail>
        </button>
        <div className="flex items-start gap-1 px-0.5">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "line-clamp-2 text-sm leading-snug font-medium",
                isCurrent && "text-primary",
                video.titleSource === "pending" && "text-muted-foreground italic"
              )}
              title={video.title}
            >
              {video.title}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{video.author ?? "Canal desconhecido"}</p>
          </div>
          <VideoDropdownMenu videoId={id} onPlay={onPlay}>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Mais opções"
              className="-mr-1 shrink-0 text-muted-foreground opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal />
            </Button>
          </VideoDropdownMenu>
        </div>
      </div>
    </VideoContextMenu>
  );
}
