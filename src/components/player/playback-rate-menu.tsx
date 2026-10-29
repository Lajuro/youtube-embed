"use client";

import { Gauge } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PLAYBACK_RATES, usePlayer } from "@/stores/player-store";

export function formatRate(rate: number) {
  return `${rate.toLocaleString("pt-BR")}x`;
}

/** Velocidade de reprodução (útil em aulas: 1,25x, 1,5x, 2x…). */
export function PlaybackRateMenu({ className, showIcon = false }: { className?: string; showIcon?: boolean }) {
  const rate = usePlayer((s) => s.playbackRate);
  const hasQueue = usePlayer((s) => s.queue.length > 0);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasQueue}
          aria-label={`Velocidade: ${formatRate(rate)}`}
          className={cn(
            "h-8 min-w-11 px-2 font-semibold tabular-nums text-muted-foreground hover:text-foreground",
            rate !== 1 && "text-primary hover:text-primary",
            className
          )}
        >
          {showIcon && <Gauge />}
          {formatRate(rate)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" side="top" className="w-40">
        <DropdownMenuLabel>Velocidade</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={String(rate)}
          onValueChange={(v) => usePlayer.getState().setPlaybackRate(Number(v))}
        >
          {PLAYBACK_RATES.map((r) => (
            <DropdownMenuRadioItem key={r} value={String(r)}>
              {r === 1 ? "Normal" : formatRate(r)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
