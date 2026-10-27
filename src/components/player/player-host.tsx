"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EyeOff, Maximize2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getBridge, PlayerState, type PlayerInfo } from "@/lib/youtube-bridge";
import { playerErrorMessage } from "@/lib/youtube";
import { useLibrary } from "@/stores/library-store";
import { useCurrentVideoId, usePlayer, type PlayerStatus } from "@/stores/player-store";
import { useHydration, useSettings } from "@/stores/ui-store";

/** Altura reservada para a barra do player na parte de baixo da tela. */
export const PLAYER_BAR_HEIGHT = 88;
export const PLAYER_STAGE_ID = "player-stage";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface IframeSeed {
  host: string;
  token: number;
  /** URL do iframe, calculada uma única vez: qualquer mudança no src recarregaria o player. */
  src: string;
}

function buildSrc(host: string, id: string, start: number, autoplay: boolean) {
  const params = new URLSearchParams({
    enablejsapi: "1",
    autoplay: autoplay ? "1" : "0",
    start: String(Math.floor(start) || 0),
    playsinline: "1",
    rel: "0",
    iv_load_policy: "3",
    origin: window.location.origin,
    widget_referrer: window.location.origin,
  });
  return `https://${host}/embed/${id}?${params.toString()}`;
}

const stateToStatus: Record<number, PlayerStatus | undefined> = {
  [PlayerState.PLAYING]: "playing",
  [PlayerState.PAUSED]: "paused",
  [PlayerState.BUFFERING]: "buffering",
  [PlayerState.CUED]: "paused",
  [PlayerState.ENDED]: "ended",
};

function miniRect(viewportW: number, viewportH: number): Rect {
  const width = viewportW < 640 ? 192 : viewportW < 1280 ? 288 : 336;
  const height = Math.round((width * 9) / 16);
  const margin = viewportW < 640 ? 12 : 20;
  return {
    width,
    height,
    left: viewportW - width - margin,
    top: viewportH - PLAYER_BAR_HEIGHT - height - margin,
  };
}

/**
 * Hospeda o <iframe> do YouTube. Ele é montado UMA vez e nunca muda de lugar na
 * árvore do React (mover um iframe no DOM recarrega o vídeo). Para alternar entre
 * mini player e tela cheia, só mudamos a posição dele com CSS (position: fixed).
 */
export function PlayerHost() {
  const hydrated = useHydration((s) => s.hydrated);
  const currentId = useCurrentVideoId();
  const playToken = usePlayer((s) => s.playToken);
  const expanded = usePlayer((s) => s.expanded);
  const videoMode = usePlayer((s) => s.videoMode);
  const embedHost = useSettings((s) => s.embedHost);

  const [seed, setSeed] = useState<IframeSeed | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const loadedTokenRef = useRef<number | null>(null);

  /* ---------- Criação / recriação do iframe ---------- */
  // Ajuste de estado durante o render (padrão recomendado pelo React em vez de um effect):
  // o iframe nasce com o primeiro vídeo e só é recriado se o domínio do player mudar.
  if (hydrated && !currentId && seed) {
    setSeed(null);
  } else if (hydrated && currentId && (!seed || seed.host !== embedHost)) {
    const player = usePlayer.getState();
    const start = seed ? player.currentTime : player.resumeAt;
    const autoplay = seed ? player.status === "playing" : player.autoplay;
    setSeed({ host: embedHost, token: playToken, src: buildSrc(embedHost, currentId, start, autoplay) });
  }

  useEffect(() => {
    if (!seed) getBridge().detach();
  }, [seed]);

  // Com o iframe já criado, trocar de vídeo é só um comando (sem recarregar o player).
  useEffect(() => {
    if (!seed || !currentId) return;
    if (loadedTokenRef.current === null || loadedTokenRef.current < seed.token) {
      loadedTokenRef.current = seed.token;
    }
    if (loadedTokenRef.current === playToken) return;
    loadedTokenRef.current = playToken;
    const bridge = getBridge();
    if (usePlayer.getState().autoplay) bridge.loadVideo(currentId);
    else bridge.cueVideo(currentId);
  }, [seed, currentId, playToken]);

  /* ---------- Eventos vindos do player ---------- */
  useEffect(() => {
    const bridge = getBridge();
    const endedToken = { current: -1 };
    const playedToken = { current: -1 };
    const erroredToken = { current: -1 };
    let warnedUnresponsive = false;

    const handleStatus = (state: number) => {
      const status = stateToStatus[state];
      if (!status) return;
      const player = usePlayer.getState();
      const token = player.playToken;
      if (status === "playing") {
        const id = player.queue[player.index];
        if (playedToken.current !== token && id) {
          playedToken.current = token;
          useLibrary.getState().markPlayed(id);
          const video = useLibrary.getState().videos[id];
          if (video?.unavailable) useLibrary.getState().updateVideo(id, { unavailable: false });
        }
      }
      if (status === "ended") {
        if (endedToken.current === token) return;
        endedToken.current = token;
        player._sync({ status });
        player.next(true);
        return;
      }
      if (player.status !== status) player._sync({ status });
    };

    bridge.setHandlers({
      onReady: () => {
        const { volume, muted } = usePlayer.getState();
        bridge.setVolume(volume);
        if (muted) bridge.mute();
        else bridge.unMute();
        usePlayer.getState()._sync({ ready: true });
      },
      onStateChange: handleStatus,
      onInfo: (info: PlayerInfo) => {
        const player = usePlayer.getState();
        const id = player.queue[player.index];
        const data = info.videoData;
        // Ignora atualizações atrasadas do vídeo anterior logo após uma troca.
        if (data?.video_id && id && data.video_id !== id) return;

        const patch: Parameters<typeof player._sync>[0] = {};
        if (typeof info.currentTime === "number" && Math.abs(info.currentTime - player.currentTime) >= 0.5) {
          patch.currentTime = info.currentTime;
        }
        if (typeof info.duration === "number" && info.duration > 0 && info.duration !== player.duration) {
          patch.duration = info.duration;
        }
        if (data && typeof data.isLive === "boolean" && data.isLive !== player.isLive) {
          patch.isLive = data.isLive;
        }
        if (Object.keys(patch).length) player._sync(patch);
        if (typeof info.playerState === "number") handleStatus(info.playerState);

        // Aproveita os dados do player para completar a biblioteca.
        if (!id) return;
        const library = useLibrary.getState();
        const video = library.videos[id];
        if (!video) return;
        const update: Parameters<typeof library.updateVideo>[1] = {};
        if (data?.title && video.titleSource === "pending") {
          update.title = data.title;
          update.titleSource = "auto";
          if (data.author) update.author = data.author;
        }
        if (data?.author && !video.author) update.author = data.author;
        const isLive = data?.isLive ?? usePlayer.getState().isLive;
        if (isLive && !video.isLive) update.isLive = true;
        const duration = usePlayer.getState().duration;
        if (!isLive && duration > 0 && Math.round(duration) !== video.duration) {
          update.duration = Math.round(duration);
        }
        if (Object.keys(update).length) library.updateVideo(id, update);
      },
      onError: (code: number) => {
        const player = usePlayer.getState();
        const token = player.playToken;
        if (erroredToken.current === token) return;
        erroredToken.current = token;
        const id = player.queue[player.index];
        const video = id ? useLibrary.getState().videos[id] : undefined;
        if (id && video && [101, 150].includes(code)) {
          useLibrary.getState().updateVideo(id, { unavailable: true });
        }
        const hasNext = player.index < player.queue.length - 1 || player.repeat === "all";
        const autoSkip = useSettings.getState().autoSkipErrors && hasNext && player.queue.length > 1;
        toast.error(playerErrorMessage(code), {
          description: autoSkip ? `${video?.title ?? "Vídeo"} — pulando para o próximo…` : video?.title,
        });
        player._sync({ status: "paused" });
        if (autoSkip) setTimeout(() => usePlayer.getState().next(true), 1200);
      },
      onUnresponsive: () => {
        if (warnedUnresponsive) return;
        warnedUnresponsive = true;
        toast.warning("O player não respondeu aos comandos", {
          description:
            "O vídeo ainda pode ser controlado direto nele. Tente trocar o domínio do player nas Configurações.",
          duration: 10000,
        });
      },
    });
  }, []);

  /* ---------- Posicionamento (mini x palco do "Tocando agora") ---------- */
  const measure = useCallback(() => {
    if (usePlayer.getState().expanded) {
      const stage = document.getElementById(PLAYER_STAGE_ID);
      if (stage) {
        const r = stage.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        return;
      }
    }
    setRect(miniRect(window.innerWidth, window.innerHeight));
  }, []);

  useEffect(() => {
    // O palco é montado junto com o overlay; mede no próximo frame.
    const raf = requestAnimationFrame(measure);
    const stage = document.getElementById(PLAYER_STAGE_ID);
    const observer = new ResizeObserver(measure);
    if (stage) observer.observe(stage);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [expanded, measure, seed]);

  if (!seed || !rect) return null;

  const hiddenMini = !expanded && videoMode === "hidden";

  return (
    <div
      className={cn(
        "group/host fixed overflow-hidden bg-black transition-[top,left,width,height,opacity,border-radius,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        expanded
          ? "z-[45] rounded-2xl shadow-[0_30px_120px_-20px_rgba(0,0,0,0.8)]"
          : "z-30 rounded-xl shadow-2xl ring-1 ring-white/10",
        hiddenMini && "pointer-events-none opacity-0"
      )}
      style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
      aria-hidden={hiddenMini}
    >
      <iframe
        key={`${seed.host}-${seed.token}`}
        src={seed.src}
        title="Player do YouTube"
        className="size-full"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={(e) => getBridge().attach(e.currentTarget, `https://${seed.host}`)}
      />

      {!expanded && !hiddenMini && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end gap-1 bg-gradient-to-b from-black/70 to-transparent p-1.5 opacity-0 transition-opacity group-hover/host:opacity-100">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="Abrir “Tocando agora”"
                className="pointer-events-auto text-white hover:bg-white/20 hover:text-white"
                onClick={() => usePlayer.getState().setExpanded(true)}
              >
                <Maximize2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Abrir “Tocando agora” (E)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="Ocultar vídeo"
                className="pointer-events-auto text-white hover:bg-white/20 hover:text-white"
                onClick={() => usePlayer.getState().setVideoMode("hidden")}
              >
                <EyeOff />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ocultar vídeo (só áudio) (V)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="Parar e limpar a fila"
                className="pointer-events-auto text-white hover:bg-white/20 hover:text-white"
                onClick={() => usePlayer.getState().stop()}
              >
                <X />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Parar e limpar a fila</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
