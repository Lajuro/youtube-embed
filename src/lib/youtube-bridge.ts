/**
 * Ponte de comunicação com o player do YouTube via `postMessage`.
 *
 * Por que não usar a "IFrame Player API" oficial (https://www.youtube.com/iframe_api)?
 * Ela é só um script que, por baixo, conversa com o iframe usando exatamente
 * este protocolo de mensagens. Falando o protocolo diretamente evitamos baixar
 * um script extra de youtube.com — que pode estar bloqueado na rede corporativa
 * mesmo quando o iframe /embed funciona.
 *
 * Protocolo (resumo):
 *  - Página → iframe: JSON {"event":"listening","id":1,"channel":"widget"} para se inscrever.
 *  - Página → iframe: JSON {"event":"command","func":"playVideo","args":[]} para comandar.
 *  - iframe → página: {"event":"onReady"}, {"event":"onStateChange","info":1},
 *    {"event":"infoDelivery","info":{currentTime, duration, videoData, ...}}, {"event":"onError","info":150}
 */

export const PlayerState = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

export interface PlayerInfo {
  currentTime?: number;
  duration?: number;
  playerState?: number;
  volume?: number;
  muted?: boolean;
  playbackRate?: number;
  /** IDs dos vídeos quando o player carregou uma playlist (embed/videoseries?list=...). */
  playlist?: string[] | null;
  videoData?: {
    video_id?: string;
    title?: string;
    author?: string;
    isLive?: boolean;
  };
}

export interface BridgeHandlers {
  onReady?: () => void;
  onStateChange?: (state: number) => void;
  onInfo?: (info: PlayerInfo) => void;
  onError?: (code: number) => void;
  /** Disparado se o iframe não responder ao handshake (ex.: rede bloqueando a API). */
  onUnresponsive?: () => void;
}

const LISTEN_INTERVAL_MS = 250;
const UNRESPONSIVE_AFTER_MS = 12_000;

export class YouTubeBridge {
  private iframe: HTMLIFrameElement | null = null;
  private origin = "*";
  private handlers: BridgeHandlers = {};
  private listenTimer: ReturnType<typeof setInterval> | null = null;
  private unresponsiveTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;
  private queue: Array<[string, unknown[]]> = [];
  ready = false;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("message", this.handleMessage);
    }
  }

  setHandlers(handlers: BridgeHandlers) {
    this.handlers = handlers;
  }

  /** Conecta a um iframe recém-carregado e inicia o handshake. */
  attach(iframe: HTMLIFrameElement, embedOrigin: string) {
    this.detach();
    this.iframe = iframe;
    this.origin = embedOrigin;
    this.ready = false;
    this.connected = false;

    const ping = () => this.post({ event: "listening", id: 1, channel: "widget" });
    ping();
    this.listenTimer = setInterval(ping, LISTEN_INTERVAL_MS);
    this.unresponsiveTimer = setTimeout(() => {
      if (!this.connected) {
        this.stopListening();
        this.handlers.onUnresponsive?.();
      }
    }, UNRESPONSIVE_AFTER_MS);
  }

  /** Desliga de vez (para instâncias temporárias, como a sonda de informações). */
  dispose() {
    this.detach();
    if (typeof window !== "undefined") window.removeEventListener("message", this.handleMessage);
  }

  detach() {
    this.stopListening();
    if (this.unresponsiveTimer) clearTimeout(this.unresponsiveTimer);
    this.unresponsiveTimer = null;
    this.iframe = null;
    this.ready = false;
    this.connected = false;
  }

  /** Envia um comando. Se o player ainda não estiver pronto, guarda para depois. */
  command(func: string, ...args: unknown[]) {
    if (!this.ready) {
      // Para comandos que substituem estado (ex.: carregar outro vídeo), manter só o último.
      this.queue = this.queue.filter(([f]) => f !== func);
      this.queue.push([func, args]);
      return;
    }
    this.post({ event: "command", func, args, id: 1, channel: "widget" });
  }

  play = () => this.command("playVideo");
  pause = () => this.command("pauseVideo");
  seekTo = (seconds: number) => this.command("seekTo", seconds, true);
  setVolume = (volume: number) => this.command("setVolume", Math.round(volume));
  mute = () => this.command("mute");
  unMute = () => this.command("unMute");
  setPlaybackRate = (rate: number) => this.command("setPlaybackRate", rate);
  loadVideo = (videoId: string, startSeconds = 0) =>
    this.command("loadVideoById", { videoId, startSeconds });
  cueVideo = (videoId: string, startSeconds = 0) =>
    this.command("cueVideoById", { videoId, startSeconds });

  private post(message: Record<string, unknown>) {
    const target = this.iframe?.contentWindow;
    if (!target) return;
    try {
      target.postMessage(JSON.stringify(message), this.origin);
    } catch {
      // iframe ainda navegando; o próximo ping resolve
    }
  }

  private stopListening() {
    if (this.listenTimer) clearInterval(this.listenTimer);
    this.listenTimer = null;
  }

  private flushQueue() {
    const pending = this.queue;
    this.queue = [];
    for (const [func, args] of pending) this.command(func, ...args);
  }

  private markConnected() {
    if (this.connected) return;
    this.connected = true;
    this.stopListening();
    if (this.unresponsiveTimer) clearTimeout(this.unresponsiveTimer);
    // Garante que vamos receber os eventos que nos interessam.
    for (const event of ["onReady", "onStateChange", "onError"]) {
      this.post({ event: "command", func: "addEventListener", args: [event], id: 1, channel: "widget" });
    }
  }

  private markReady() {
    if (this.ready) return;
    this.markConnected();
    this.ready = true;
    this.flushQueue();
    this.handlers.onReady?.();
  }

  private handleMessage = (event: MessageEvent) => {
    if (!this.iframe || event.source !== this.iframe.contentWindow) return;
    if (!/^https:\/\/(www\.)?youtube(-nocookie)?\.com$/.test(event.origin)) return;

    let data: { event?: string; info?: unknown };
    try {
      data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
    } catch {
      return;
    }
    if (!data || typeof data !== "object") return;

    switch (data.event) {
      case "initialDelivery":
        this.markConnected();
        if (data.info && typeof data.info === "object") this.handlers.onInfo?.(data.info as PlayerInfo);
        break;
      case "onReady":
        this.markReady();
        break;
      case "infoDelivery":
        this.markConnected();
        if (!this.ready) this.markReady();
        if (data.info && typeof data.info === "object") this.handlers.onInfo?.(data.info as PlayerInfo);
        break;
      case "onStateChange":
        if (!this.ready) this.markReady();
        if (typeof data.info === "number") this.handlers.onStateChange?.(data.info);
        break;
      case "onError":
        if (typeof data.info === "number") this.handlers.onError?.(data.info);
        break;
    }
  };
}

let bridge: YouTubeBridge | null = null;

/** Instância única compartilhada pelo app inteiro. */
export function getBridge() {
  if (!bridge) bridge = new YouTubeBridge();
  return bridge;
}
