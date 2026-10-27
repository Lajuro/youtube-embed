"use client";

import Link from "next/link";
import { Pause, Play } from "lucide-react";

import { PlaylistCover } from "@/components/playlist/playlist-cover";
import { playList } from "@/lib/actions";
import { cn, pluralize } from "@/lib/utils";
import { useLibrary, type Playlist } from "@/stores/library-store";
import { usePlayer } from "@/stores/player-store";

export function PlaylistCard({ playlist, className }: { playlist: Playlist; className?: string }) {
  const videos = useLibrary((s) => s.videos);
  const playingThis = usePlayer((s) => s.source?.type === "playlist" && s.source.id === playlist.id);
  const isPlaying = usePlayer((s) => s.status === "playing" || s.status === "buffering");
  const ids = playlist.videoIds.filter((id) => videos[id]);

  return (
    <div className={cn("group/pl relative rounded-xl p-3 transition-colors hover:bg-accent/50", className)}>
      <Link href={`/playlists/${playlist.id}`} className="absolute inset-0 z-0 rounded-xl" aria-label={playlist.name} />
      <div className="pointer-events-none relative">
        <PlaylistCover
          seed={playlist.id}
          videoIds={ids}
          className="w-full rounded-lg shadow-lg shadow-black/20 transition-transform duration-500 group-hover/pl:scale-[1.02]"
        />
        {ids.length > 0 && (
          <button
            type="button"
            onClick={() =>
              playingThis
                ? usePlayer.getState().togglePlay()
                : playList(ids, 0, { type: "playlist", id: playlist.id, label: playlist.name })
            }
            aria-label={`Tocar ${playlist.name}`}
            className={cn(
              "pointer-events-auto absolute right-2 bottom-2 z-10 grid size-12 translate-y-2 cursor-pointer place-items-center rounded-full bg-brand-gradient text-white opacity-0 shadow-xl transition-all duration-300 group-hover/pl:translate-y-0 group-hover/pl:opacity-100 hover:scale-105",
              playingThis && isPlaying && "translate-y-0 opacity-100"
            )}
          >
            {playingThis && isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
          </button>
        )}
      </div>
      <div className="pointer-events-none relative mt-3 min-w-0">
        <p className={cn("truncate font-semibold", playingThis && "text-primary")}>{playlist.name}</p>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
          {playlist.description || pluralize(ids.length, "vídeo", "vídeos")}
        </p>
      </div>
    </div>
  );
}
