"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { playChime } from "@/lib/chime";
import { getBridge } from "@/lib/youtube-bridge";
import { usePlayer } from "@/stores/player-store";
import { useStats } from "@/stores/stats-store";
import { phaseMinutes, SESSIONS_PER_CYCLE, useTimer } from "@/stores/timer-store";

/** Se o app ficou fechado bem depois do fim da fase, o Pomodoro simplesmente recomeça do zero. */
const OVERDUE_RESET_MS = 5 * 60_000;
/** O desligamento automático abaixa o volume aos poucos nestes últimos milissegundos. */
export const SLEEP_FADE_MS = 15_000;

/** Aviso na tela e, se você permitiu e a aba está escondida, notificação do sistema. */
function notify(title: string, body: string) {
  toast(title, { description: body, duration: 8000 });
  try {
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
      new Notification(title, { body, icon: "/icon.svg", tag: "sintonia-timer" });
    }
  } catch {
    // Alguns navegadores não deixam criar notificações assim (ex.: Android) — o toast basta.
  }
}

const isPlaying = () => {
  const { status } = usePlayer.getState();
  return status === "playing" || status === "buffering";
};

/**
 * O "motor" dos timers (sem interface): troca as fases do Pomodoro, toca o aviso sonoro,
 * pausa/retoma a música nas pausas e faz o desligamento automático com fade-out.
 * Os horários ficam salvos no localStorage, então recarregar a página não perde o timer.
 */
export function TimerEngine() {
  useEffect(() => {
    let fading = false;
    const restoreVolume = () => {
      const { volume, muted } = usePlayer.getState();
      if (!muted) getBridge().setVolume(volume);
    };

    const tick = () => {
      const now = Date.now();
      const timer = useTimer.getState();

      /* ---- Pomodoro ---- */
      if (timer.phase !== "idle" && timer.endsAt && now >= timer.endsAt) {
        if (now - timer.endsAt > OVERDUE_RESET_MS) {
          timer.stop();
        } else if (timer.phase === "focus") {
          const sessions = timer.completeSession();
          useStats.getState().addFocusSession();
          const long = sessions % SESSIONS_PER_CYCLE === 0;
          timer.startPhase("break", long);
          playChime("break");
          notify(
            long ? "Hora da pausa longa ☕" : "Hora da pausa ☕",
            `Foco concluído! Descanse ${phaseMinutes(timer, "break", long)} min: levante, alongue, beba água.`
          );
          if (timer.pauseMusicOnBreak && isPlaying()) {
            usePlayer.getState().togglePlay();
            timer.setMusicPausedByTimer(true);
          }
        } else {
          timer.startPhase("focus");
          playChime("focus");
          notify("De volta ao foco 🎯", `Mais ${phaseMinutes(timer, "focus")} min de concentração.`);
          if (timer.musicPausedByTimer) {
            timer.setMusicPausedByTimer(false);
            const player = usePlayer.getState();
            if (player.queue.length && !isPlaying()) player.togglePlay();
          }
        }
      }

      /* ---- Desligamento automático ---- */
      if (timer.sleepAt) {
        const left = timer.sleepAt - now;
        if (left <= 0) {
          timer.setSleep(null);
          const wasPlaying = isPlaying();
          if (wasPlaying) usePlayer.getState().togglePlay();
          // Devolve o volume normal para a próxima vez que você der play.
          if (fading) setTimeout(restoreVolume, 400);
          fading = false;
          if (wasPlaying) toast("Música pausada pelo desligamento automático", { icon: "🌙" });
        } else if (left <= SLEEP_FADE_MS && isPlaying()) {
          fading = true;
          const { volume, muted } = usePlayer.getState();
          if (!muted) getBridge().setVolume(Math.round((volume * left) / SLEEP_FADE_MS));
        }
      } else if (fading) {
        // Cancelado no meio do fade-out.
        fading = false;
        restoreVolume();
      }
    };

    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, []);

  return null;
}
