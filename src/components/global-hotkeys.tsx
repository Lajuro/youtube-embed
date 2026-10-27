"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { toggleFavorite } from "@/lib/actions";
import { parseManyVideoIds } from "@/lib/youtube";
import { useLibrary } from "@/stores/library-store";
import { usePlayer } from "@/stores/player-store";
import { useUi } from "@/stores/ui-store";

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function anyOverlayOpen() {
  const ui = useUi.getState();
  return (
    ui.addDialog.open ||
    ui.playlistDialog.open ||
    ui.commandOpen ||
    ui.settingsOpen ||
    ui.shortcutsOpen ||
    Boolean(ui.editVideoId) ||
    Boolean(document.querySelector("[role=dialog][data-state=open], [role=alertdialog][data-state=open], [role=menu]"))
  );
}

/** Atalhos de teclado globais + "colar link em qualquer lugar". */
export function GlobalHotkeys() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const ui = useUi.getState();
      const player = usePlayer.getState();

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ui.setCommandOpen(!ui.commandOpen);
        return;
      }
      if (e.key === "Escape" && player.expanded && !anyOverlayOpen()) {
        player.setExpanded(false);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || anyOverlayOpen()) return;

      // Em sliders, as setas controlam o próprio slider.
      const onSlider = e.target instanceof HTMLElement && e.target.getAttribute("role") === "slider";
      const currentId = player.queue[player.index];

      switch (e.key) {
        case " ":
        case "k":
          if (e.target instanceof HTMLButtonElement && e.key === " ") return; // espaço em botão = clique
          e.preventDefault();
          player.togglePlay();
          break;
        case "n":
        case "N":
          player.next();
          break;
        case "p":
        case "P":
          player.previous();
          break;
        case "ArrowRight":
          if (onSlider) return;
          e.preventDefault();
          player.seekBy(10);
          break;
        case "ArrowLeft":
          if (onSlider) return;
          e.preventDefault();
          player.seekBy(-10);
          break;
        case "m":
        case "M":
          player.toggleMute();
          break;
        case "s":
        case "S":
          player.toggleShuffle();
          toast(usePlayer.getState().shuffle ? "Aleatório ativado" : "Aleatório desativado");
          break;
        case "r":
        case "R": {
          player.cycleRepeat();
          const mode = usePlayer.getState().repeat;
          toast(mode === "off" ? "Repetição desativada" : mode === "all" ? "Repetindo a fila" : "Repetindo este vídeo");
          break;
        }
        case "e":
        case "E":
          if (currentId) player.setExpanded(!player.expanded);
          break;
        case "q":
        case "Q":
          player.setQueueOpen(!player.queueOpen);
          break;
        case "v":
        case "V":
          if (currentId) player.setVideoMode(player.videoMode === "hidden" ? "mini" : "hidden");
          break;
        case "f":
        case "F":
          if (currentId) toggleFavorite(currentId);
          break;
        case "a":
        case "A":
          e.preventDefault();
          ui.openAddDialog();
          break;
        case "/":
          e.preventDefault();
          ui.setCommandOpen(true);
          break;
        case "?":
          ui.setShortcutsOpen(true);
          break;
      }
    };

    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target) || anyOverlayOpen()) return;
      const text = e.clipboardData?.getData("text") ?? "";
      const ids = parseManyVideoIds(text);
      if (!ids.length) return;
      e.preventDefault();
      const known = ids.every((id) => useLibrary.getState().videos[id]);
      useUi.getState().openAddDialog({ initialValue: text.trim() });
      if (known) toast.info("Esse vídeo já está na sua biblioteca");
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("paste", onPaste);
    };
  }, []);

  return null;
}
