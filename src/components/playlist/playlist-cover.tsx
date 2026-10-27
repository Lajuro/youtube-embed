/* eslint-disable @next/next/no-img-element -- miniaturas vêm direto do i.ytimg.com */
"use client";

import { ListMusic } from "lucide-react";

import { cn } from "@/lib/utils";
import { thumbnailUrl } from "@/lib/youtube";
import { gradientFor } from "@/components/video/video-thumbnail";

/** Capa estilo "mosaico" com as 4 primeiras miniaturas da playlist. */
export function PlaylistCover({
  seed,
  videoIds,
  className,
  iconClassName,
}: {
  seed: string;
  videoIds: string[];
  className?: string;
  iconClassName?: string;
}) {
  const ids = videoIds.slice(0, 4);

  if (ids.length === 0) {
    return (
      <div
        className={cn("grid aspect-square place-items-center overflow-hidden text-white/90", className)}
        style={{ backgroundImage: gradientFor(seed) }}
      >
        <ListMusic className={cn("size-1/3", iconClassName)} />
      </div>
    );
  }

  if (ids.length < 4) {
    return (
      <div className={cn("aspect-square overflow-hidden bg-muted", className)}>
        <img
          src={thumbnailUrl(ids[0], "hqdefault")}
          alt=""
          loading="lazy"
          draggable={false}
          className="size-full scale-[1.34] object-cover"
        />
      </div>
    );
  }

  return (
    <div className={cn("grid aspect-square grid-cols-2 grid-rows-2 overflow-hidden bg-muted", className)}>
      {ids.map((id) => (
        <img
          key={id}
          src={thumbnailUrl(id, "mqdefault")}
          alt=""
          loading="lazy"
          draggable={false}
          className="size-full object-cover"
        />
      ))}
    </div>
  );
}
