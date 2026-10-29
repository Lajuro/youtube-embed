"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpToLine, EyeOff, Maximize2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getPlayerBarHeight } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { getBridge, PlayerState, type PlayerInfo } from "@/lib/youtube-bridge";
import { playerErrorMessage } from "@/lib/youtube";
import { useLibrary } from "@/stores/library-store";
import { useCurrentVideoId, usePlayer, usePlayerDock, type PlayerStatus } from "@/stores/player-store";
import { useHydration, useSettings, useUi } from "@/stores/ui-store";

export const PLAYER_STAGE_ID = "player-stage";

/**
 * Onde o vídeo está:
 * - expanded: tela "Tocando agora";
 * - docked:   encaixado no palco de uma página (sala de aula);
 * - float:    o palco saiu da tela ao rolar — vira um mini player no canto da área;
 * - mini:     mini player flutuante comum;
 * - hidden:   invisível (só áudio, ou modo foco tocando outra coisa).
 */
type HostMode = "expanded" | "docked" | "float" | "mini" | "hidden";

const EASE = "cubic-bezier(0.22,1,0.36,1)";
const BASE_TRANSITION = "opacity 300ms ease, border-radius 300ms ease";
const MODE_TRANSITION = `top 480ms ${EASE}, left 480ms ${EASE}, width 480ms ${EASE}, height 480ms ${EASE}, ${BASE_TRANSITION}`;
/** Fração mínima do palco visível para o vídeo continuar encaixado (abaixo disso, flutua). */
const MIN_VISIBLE = 0.4;

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
  const width = viewportW < 640 ? 192 : viewportW < 1280 ? 272 : 320;
  const height = Math.round((width * 9) / 16);
  const margin = viewportW < 640 ? 12 : 16;
  return {
    width,
    height,
    left: viewportW - width - margin,
    top: viewportH - getPlayerBarHeight() - height - margin,
  };
}

function rectOf(el: Element | null | undefined): Rect | null {
  if (!el || !el.isConnected) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? { top: r.top, left: r.left, width: r.width, height: r.height } : null;
}

/** Decide modo, posição e recorte do vídeo a partir do estado atual da página. */
function computePlacement(): { mode: HostMode; rect: Rect; clip?: string } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const player = usePlayer.getState();

  if (player.expanded) {
    const stage = rectOf(document.getElementById(PLAYER_STAGE_ID));
    if (stage) return { mode: "expanded", rect: stage };
  }

  const dock = usePlayerDock.getState();
  const stage = rectOf(dock.el);
  if (stage) {
    const area = rectOf(dock.scrollEl) ?? { top: 0, left: 0, width: vw, height: vh };
    const visibleTop = Math.max(stage.top, area.top);
    const visibleBottom = Math.min(stage.top + stage.height, area.top + area.height);
    const visible = Math.max(0, visibleBottom - visibleTop);
    if (visible / stage.height >= MIN_VISIBLE) {
      // Recorta a parte que passou por baixo do cabeçalho (ou abaixo da área).
      const top = Math.round(visibleTop - stage.top);
      const bottom = Math.round(stage.top + stage.height - visibleBottom);
      return { mode: "docked", rect: stage, clip: top || bottom ? `inset(${top}px 0 ${bottom}px 0)` : undefined };
    }
    // Rolou para baixo: o vídeo vira um mini player no canto da área da página.
    const width = vw < 640 ? 200 : 336;
    const height = Math.round((width * 9) / 16);
    const margin = 16;
    return {
      mode: "float",
      rect: {
        width,
        height,
        left: area.left + area.width - width - margin,
        top: area.top + area.height - height - margin,
      },
    };
  }

  const mini = miniRect(vw, vh);
  // No modo foco (sala de aula) um vídeo que não é da aula não fica por cima: só o som continua.
  if (useUi.getState().focusMode || player.videoMode === "hidden") return { mode: "hidden", rect: mini };
  return { mode: "mini", rect: mini };
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
  const embedHost = useSettings((s) => s.embedHost);

  const [seed, setSeed] = useState<IframeSeed | null>(null);
  const loadedTokenRef = useRef<number | null>(null);

  const hostRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<HostMode>("mini");

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
    const { autoplay, resumeAt } = usePlayer.getState();
    if (autoplay) bridge.loadVideo(currentId, resumeAt);
    else bridge.cueVideo(currentId, resumeAt);
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
          // O YouTube pode voltar à velocidade normal ao trocar de vídeo.
          if (player.playbackRate !== 1) getBridge().setPlaybackRate(player.playbackRate);
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
        const { volume, muted, playbackRate } = usePlayer.getState();
        bridge.setVolume(volume);
        if (playbackRate !== 1) bridge.setPlaybackRate(playbackRate);
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

  /* ---------- Posicionamento ---------- */
  // A posição é escrita direto no estilo do elemento (sem passar pelo React) para o vídeo
  // acompanhar a rolagem da página no mesmo quadro, sem atraso. O React só fica sabendo
  // quando o *modo* muda (para trocar cantos, sombra e botões).
  useEffect(() => {
    if (!seed) return;
    let currentMode: HostMode | null = null;
    let transitionTimer: ReturnType<typeof setTimeout> | undefined;

    const apply = () => {
      const el = hostRef.current;
      if (!el) return;
      const placement = computePlacement();
      if (placement.mode !== currentMode) {
        // Só anima posição/tamanho quando troca de modo (ex.: aula → flutuante).
        if (currentMode) {
          el.style.transition = MODE_TRANSITION;
          clearTimeout(transitionTimer);
          transitionTimer = setTimeout(() => (el.style.transition = BASE_TRANSITION), 520);
        } else {
          el.style.transition = BASE_TRANSITION;
        }
        currentMode = placement.mode;
        setMode(placement.mode);
      }
      const { rect, clip } = placement;
      el.style.top = `${rect.top}px`;
      el.style.left = `${rect.left}px`;
      el.style.width = `${rect.width}px`;
      el.style.height = `${rect.height}px`;
      el.style.clipPath = clip ?? "";
    };

    const nextFrame = () => requestAnimationFrame(apply);
    const raf = nextFrame();

    const observer = new ResizeObserver(apply);
    const observe = () => {
      observer.disconnect();
      const { el, scrollEl } = usePlayerDock.getState();
      for (const target of [el, scrollEl, document.getElementById(PLAYER_STAGE_ID)]) {
        if (target) observer.observe(target);
      }
    };
    observe();

    const unsubscribers = [
      usePlayer.subscribe((s, prev) => {
        if (s.expanded !== prev.expanded || s.videoMode !== prev.videoMode || (s.queue.length > 0) !== (prev.queue.length > 0)) {
          // O palco do "Tocando agora" monta junto; espera o próximo quadro para medir.
          requestAnimationFrame(() => {
            observe();
            apply();
          });
        }
      }),
      usePlayerDock.subscribe(() => {
        observe();
        nextFrame();
      }),
      useUi.subscribe((s, prev) => {
        if (s.focusMode !== prev.focusMode) nextFrame();
      }),
    ];

    window.addEventListener("resize", apply);
    window.addEventListener("scroll", apply, { capture: true, passive: true });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(transitionTimer);
      observer.disconnect();
      unsubscribers.forEach((u) => u());
      window.removeEventListener("resize", apply);
      window.removeEventListener("scroll", apply, { capture: true });
    };
  }, [seed]);

  if (!seed) return null;

  const hidden = mode === "hidden";

  return (
    <div
      ref={hostRef}
      className={cn(
        "group/host fixed -top-[9999px] -left-[9999px] size-0 overflow-hidden bg-black",
        mode === "expanded" && "z-[45] rounded-2xl shadow-[0_30px_120px_-20px_rgba(0,0,0,0.8)]",
        mode === "docked" && "z-30",
        mode === "float" && "z-40 rounded-xl shadow-2xl ring-1 ring-white/10",
        mode === "mini" && "z-30 rounded-xl shadow-2xl ring-1 ring-white/10",
        hidden && "pointer-events-none z-0 opacity-0"
      )}
      aria-hidden={hidden}
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

      {(mode === "mini" || mode === "float") && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end gap-1 bg-gradient-to-b from-black/70 to-transparent p-1.5 opacity-0 transition-opacity group-hover/host:opacity-100">
          {mode === "float" ? (
            <HostButton
              label="Voltar para a aula"
              onClick={() => usePlayerDock.getState().el?.scrollIntoView({ behavior: "smooth", block: "center" })}
            >
              <ArrowUpToLine />
            </HostButton>
          ) : (
            <>
              <HostButton label="Abrir “Tocando agora” (E)" onClick={() => usePlayer.getState().setExpanded(true)}>
                <Maximize2 />
              </HostButton>
              <HostButton label="Ocultar vídeo — só áudio (V)" onClick={() => usePlayer.getState().setVideoMode("hidden")}>
                <EyeOff />
              </HostButton>
              <HostButton label="Parar e limpar a fila" onClick={() => usePlayer.getState().stop()}>
                <X />
              </HostButton>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function HostButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={label}
          className="pointer-events-auto text-white hover:bg-white/20 hover:text-white"
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
