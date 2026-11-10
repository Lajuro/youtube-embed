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
      <div className={cn("group/card relative flex min-w-0 flex-col gap-2 rounded-lg p-2 transition-colors hover:bg-accent/60", className)}>
        <button
          type="button"
          onClick={isCurrent ? () => usePlayer.getState().togglePlay() : onPlay}
          className="relative block cursor-pointer overflow-hidden rounded-md text-left ring-1 ring-foreground/[0.06] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label={`Tocar ${video.title}`}
        >
          <VideoThumbnail
            id={id}
            alt={video.title}
            className="aspect-video w-full"
            imgClassName="transition-transform duration-500 group-hover/card:scale-[1.03]"
          >
            <div className="absolute inset-0 bg-black/25 opacity-0 transition-opacity group-hover/card:opacity-100" />
            {video.isLive ? (
              <Badge variant="live" className="absolute top-2 left-2">
                Ao vivo
              </Badge>
            ) : video.duration ? (
              <span className="absolute bottom-1.5 left-1.5 rounded-[4px] bg-black/75 px-1 py-px text-[11px] font-medium text-white tabular-nums">
                {formatTime(video.duration)}
              </span>
            ) : null}
            {isCurrent && (
              <span className="absolute top-1.5 right-1.5 rounded-md bg-black/70 p-1.5 backdrop-blur">
                <Equalizer paused={!isPlaying} />
              </span>
            )}
            <span
              className={cn(
                "absolute right-2 bottom-2 grid size-9 translate-y-1 place-items-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg shadow-black/30 transition-all duration-200 group-hover/card:translate-y-0 group-hover/card:opacity-100",
                isCurrent && isPlaying && "translate-y-0 opacity-100"
              )}
            >
              {isCurrent && isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
            </span>
          </VideoThumbnail>
        </button>
        <div className="flex items-start gap-1 px-0.5">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "line-clamp-2 text-[13px] leading-snug font-medium",
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
