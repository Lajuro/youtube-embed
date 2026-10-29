"use client";

import { useEffect } from "react";

import { useNow } from "@/components/timers/timer-popover";
import { formatTime } from "@/lib/utils";
import { useLibrary } from "@/stores/library-store";
import { useCurrentVideoId, usePlayer } from "@/stores/player-store";
import { timeLeft, useTimer } from "@/stores/timer-store";

/** Mostra o que está tocando no título da aba (e a contagem do timer de foco, se ligado). */
export function DocumentTitle() {
  const currentId = useCurrentVideoId();
  const title = useLibrary((s) => (currentId ? s.videos[currentId]?.title : undefined));
  const playing = usePlayer((s) => s.status === "playing");
  const phase = useTimer((s) => s.phase);
  const endsAt = useTimer((s) => s.endsAt);
  const remaining = useTimer((s) => s.remaining);
  const now = useNow(phase !== "idle");

  useEffect(() => {
    const base = title && playing ? `▶ ${title} · Sintonia` : "Sintonia";
    const timer =
      phase !== "idle" && now
        ? `${phase === "focus" ? "🎯" : "☕"} ${formatTime(Math.ceil(timeLeft({ endsAt, remaining }, now) / 1000))}${endsAt ? "" : " ⏸"} · `
        : "";
    document.title = timer + base;
  }, [title, playing, phase, endsAt, remaining, now]);

  return null;
}
