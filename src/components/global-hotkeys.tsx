"use client";

import { useEffect } from "react";
import {
  Eye,
  EyeOff,
  FastForward,
  Gauge,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Rewind,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";

import { showOsd } from "@/components/player/osd";
import { toggleFavorite } from "@/lib/actions";
import { parseManyVideoIds } from "@/lib/youtube";
import { useLibrary } from "@/stores/library-store";
import { formatTime } from "@/lib/utils";
import { PLAYBACK_RATES, usePlayer } from "@/stores/player-store";
import { useSettings, useUi } from "@/stores/ui-store";

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function anyOverlayOpen() {
  const ui = useUi.getState();
  return (
    ui.addDialog.open ||
    ui.courseDialog.open ||
    ui.playlistDialog.open ||
    ui.commandOpen ||
    ui.settingsOpen ||
    ui.shortcutsOpen ||
    Boolean(ui.editVideoId) ||
    Boolean(document.querySelector("[role=dialog][data-state=open], [role=alertdialog][data-state=open], [role=menu]"))
  );
}

function showVolume() {
  const { volume, muted } = usePlayer.getState();
  const value = muted ? 0 : volume;
  showOsd(value === 0 ? VolumeX : value < 50 ? Volume1 : Volume2, muted ? "Mudo" : "Volume", value);
}

function changeVolume(delta: number) {
  const player = usePlayer.getState();
  player.setVolume((player.muted ? 0 : player.volume) + delta);
  showVolume();
}

function changeRate(direction: 1 | -1) {
  const player = usePlayer.getState();
  const i = PLAYBACK_RATES.indexOf(player.playbackRate as (typeof PLAYBACK_RATES)[number]);
  const next = PLAYBACK_RATES[Math.max(0, Math.min(PLAYBACK_RATES.length - 1, (i === -1 ? 1 : i) + direction))];
  player.setPlaybackRate(next);
  showOsd(Gauge, `Velocidade ${next === 1 ? "normal" : `${String(next).replace(".", ",")}×`}`);
}

function seekWithOsd(delta: number) {
  const player = usePlayer.getState();
  if (!player.queue.length || player.isLive) return;
  player.seekBy(delta);
  const { currentTime } = usePlayer.getState();
  showOsd(delta > 0 ? FastForward : Rewind, `${delta > 0 ? "+" : "−"}${Math.abs(delta)} s · ${formatTime(currentTime)}`);
}

function currentTitle() {
  const { queue, index } = usePlayer.getState();
  const id = queue[index];
  return id ? useLibrary.getState().videos[id]?.title : undefined;
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
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b" && !isTyping(e.target)) {
        e.preventDefault();
        useSettings.getState().toggleSidebar();
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
        case "K": {
          if (e.target instanceof HTMLButtonElement && e.key === " ") return; // espaço em botão = clique
          e.preventDefault();
          if (!currentId) return;
          const wasPlaying = player.status === "playing" || player.status === "buffering";
          player.togglePlay();
          showOsd(wasPlaying ? Pause : Play, wasPlaying ? "Pausado" : "Tocando");
          break;
        }
        case "n":
        case "N":
          if (!currentId) return;
          player.next();
          showOsd(SkipForward, currentTitle() ?? "Próximo");
          break;
        case "p":
        case "P":
          if (!currentId) return;
          player.previous();
          showOsd(SkipBack, currentTitle() ?? "Anterior");
          break;
        case "ArrowRight":
          if (onSlider) return;
          e.preventDefault();
          seekWithOsd(10);
          break;
        case "ArrowLeft":
          if (onSlider) return;
          e.preventDefault();
          seekWithOsd(-10);
          break;
        case "ArrowUp":
        case "ArrowDown":
          // Só no "Tocando agora" (fora dele as setas continuam rolando a página).
          if (onSlider || !player.expanded) return;
          e.preventDefault();
          changeVolume(e.key === "ArrowUp" ? 5 : -5);
          break;
        case "+":
        case "=":
          changeVolume(5);
          break;
        case "-":
        case "_":
          changeVolume(-5);
          break;
        case ">":
          changeRate(1);
          break;
        case "<":
          changeRate(-1);
          break;
        case "m":
        case "M":
          player.toggleMute();
          showVolume();
          break;
        case "s":
        case "S":
          player.toggleShuffle();
          showOsd(Shuffle, usePlayer.getState().shuffle ? "Aleatório ativado" : "Aleatório desativado");
          break;
        case "r":
        case "R": {
          player.cycleRepeat();
          const mode = usePlayer.getState().repeat;
          showOsd(
            mode === "one" ? Repeat1 : Repeat,
            mode === "off" ? "Repetição desativada" : mode === "all" ? "Repetindo a fila" : "Repetindo este vídeo"
          );
          break;
        }
        case "e":
        case "E":
          if (currentId) player.setExpanded(!player.expanded);
          break;
        case "t":
        case "T": {
          // Modo cinema: na sala de aula esconde o conteúdo do curso; no "Tocando agora", a fila.
          const settings = useSettings.getState();
          if (ui.focusMode) settings.setCourseTheater(!settings.courseTheater);
          else if (player.expanded) settings.setNowPlayingQueue(!settings.nowPlayingQueue);
          else if (currentId) {
            settings.setNowPlayingQueue(false);
            player.setExpanded(true);
          }
          break;
        }
        case "q":
        case "Q":
          player.setQueueOpen(!player.queueOpen);
          break;
        case "v":
        case "V":
          if (!currentId) return;
          player.setVideoMode(player.videoMode === "hidden" ? "mini" : "hidden");
          showOsd(
            player.videoMode === "hidden" ? Eye : EyeOff,
            player.videoMode === "hidden" ? "Mini player visível" : "Vídeo oculto — só áudio"
          );
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
