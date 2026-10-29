"use client";

import { usePlayer } from "@/stores/player-store";
import { useUi } from "@/stores/ui-store";

/** Altura da barra do player (embaixo da tela) quando ela está visível. */
export const PLAYER_BAR_HEIGHT = 72;

/**
 * A barra do player só aparece quando há algo na fila e fora do modo foco.
 * Quem posiciona coisas "acima da barra" usa esta altura (0 quando ela some).
 */
export function getPlayerBarHeight() {
  const hasQueue = usePlayer.getState().queue.length > 0;
  return hasQueue && !useUi.getState().focusMode ? PLAYER_BAR_HEIGHT : 0;
}

export function usePlayerBarHeight() {
  const hasQueue = usePlayer((s) => s.queue.length > 0);
  const focus = useUi((s) => s.focusMode);
  return hasQueue && !focus ? PLAYER_BAR_HEIGHT : 0;
}
