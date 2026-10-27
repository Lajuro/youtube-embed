"use client";

import { useEffect } from "react";

import { useLibrary } from "@/stores/library-store";
import { useCurrentVideoId, usePlayer } from "@/stores/player-store";

/** Mostra o que está tocando no título da aba. */
export function DocumentTitle() {
  const currentId = useCurrentVideoId();
  const title = useLibrary((s) => (currentId ? s.videos[currentId]?.title : undefined));
  const playing = usePlayer((s) => s.status === "playing");

  useEffect(() => {
    document.title = title && playing ? `▶ ${title} · Sintonia` : "Sintonia";
  }, [title, playing]);

  return null;
}
