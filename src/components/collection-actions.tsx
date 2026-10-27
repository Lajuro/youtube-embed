"use client";

import { Pause, Play, Shuffle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { playList } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { usePlayer, type QueueSource } from "@/stores/player-store";

/** Botões grandes de "tocar" e "aleatório" usados nos cabeçalhos. */
export function CollectionPlayButtons({ ids, source }: { ids: string[]; source: QueueSource }) {
  const active = usePlayer((s) => s.source?.type === source.type && s.source?.id === source.id);
  const isPlaying = usePlayer((s) => s.status === "playing" || s.status === "buffering");
  const shuffle = usePlayer((s) => s.shuffle);
  const playingThis = active && isPlaying;

  return (
    <>
      <Button
        variant="brand"
        size="icon"
        disabled={!ids.length}
        aria-label={playingThis ? "Pausar" : "Tocar"}
        onClick={() => (active ? usePlayer.getState().togglePlay() : playList(ids, 0, source))}
        className="size-14 rounded-full shadow-xl transition-transform hover:scale-105 active:scale-95 [&_svg:not([class*='size-'])]:size-6"
      >
        {playingThis ? <Pause className="fill-current" /> : <Play className="ml-0.5 fill-current" />}
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-lg"
            disabled={!ids.length}
            aria-label="Tocar no aleatório"
            onClick={() => playList(ids, 0, source, true)}
            className={cn("rounded-full text-muted-foreground hover:text-foreground [&_svg:not([class*='size-'])]:size-6", active && shuffle && "text-primary")}
          >
            <Shuffle />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Tocar no aleatório</TooltipContent>
      </Tooltip>
    </>
  );
}
