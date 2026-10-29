/**
 * "Sonda" do YouTube: um segundo player, invisível, usado só para LER informações.
 *
 * Na rede da empresa o youtube.com é bloqueado, mas o player embutido funciona.
 * E o player sabe coisas que de outro jeito exigiriam a API oficial:
 *
 *  - com uma playlist carregada (embed/videoseries?list=...), ele informa a lista
 *    de IDs dos vídeos (campo `playlist` das mensagens do player);
 *  - ao "preparar" um vídeo (cueVideoById, sem tocar), ele informa título e canal
 *    (campo `videoData`).
 *
 * Usamos isso para importar playlists como cursos e para descobrir títulos quando
 * o oEmbed (youtube.com/oembed) está bloqueado.
 */

import { YouTubeBridge, type PlayerInfo } from "@/lib/youtube-bridge";
import { useSettings } from "@/stores/ui-store";

type Waiter = { test: (info: PlayerInfo) => boolean; resolve: (info: PlayerInfo | null) => void };

class HiddenPlayer {
  private iframe: HTMLIFrameElement;
  private bridge = new YouTubeBridge();
  private waiters = new Set<Waiter>();
  private failed = false;

  constructor(path: string) {
    const host = useSettings.getState().embedHost;
    const params = new URLSearchParams({
      enablejsapi: "1",
      autoplay: "0",
      mute: "1",
      playsinline: "1",
      origin: window.location.origin,
      widget_referrer: window.location.origin,
    });
    this.iframe = document.createElement("iframe");
    this.iframe.src = `https://${host}/embed/${path}${path.includes("?") ? "&" : "?"}${params}`;
    this.iframe.title = "Leitor de informações do YouTube";
    this.iframe.setAttribute("aria-hidden", "true");
    this.iframe.tabIndex = -1;
    this.iframe.referrerPolicy = "strict-origin-when-cross-origin";
    Object.assign(this.iframe.style, {
      position: "fixed",
      left: "-10000px",
      top: "0",
      width: "320px",
      height: "180px",
      opacity: "0",
      pointerEvents: "none",
    });
    this.bridge.setHandlers({
      onInfo: (info) => {
        for (const waiter of [...this.waiters]) {
          if (waiter.test(info)) {
            this.waiters.delete(waiter);
            waiter.resolve(info);
          }
        }
      },
      onUnresponsive: () => {
        this.failed = true;
        for (const waiter of this.waiters) waiter.resolve(null);
        this.waiters.clear();
      },
    });
    this.iframe.addEventListener("load", () => this.bridge.attach(this.iframe, `https://${host}`));
    document.body.appendChild(this.iframe);
  }

  /** Espera uma mensagem do player que satisfaça `test` (ou desiste após `timeoutMs`). */
  waitFor(test: (info: PlayerInfo) => boolean, timeoutMs: number): Promise<PlayerInfo | null> {
    if (this.failed) return Promise.resolve(null);
    return new Promise((resolve) => {
      const waiter: Waiter = {
        test,
        resolve: (info) => {
          clearTimeout(timer);
          resolve(info);
        },
      };
      const timer = setTimeout(() => {
        this.waiters.delete(waiter);
        resolve(null);
      }, timeoutMs);
      this.waiters.add(waiter);
    });
  }

  cue(videoId: string) {
    this.bridge.cueVideo(videoId);
  }

  destroy() {
    this.bridge.dispose();
    this.iframe.remove();
    for (const waiter of this.waiters) waiter.resolve(null);
    this.waiters.clear();
  }
}

export interface ProbedInfo {
  id: string;
  title: string;
  author?: string;
  /** Duração em segundos, quando o player já a informa sem tocar. */
  duration?: number;
}

function toProbed(id: string, info: PlayerInfo): ProbedInfo {
  const duration = typeof info.duration === "number" && info.duration > 0 ? Math.round(info.duration) : undefined;
  return { id, title: info.videoData!.title!, author: info.videoData?.author, duration };
}

const hasTitleFor = (id: string) => (info: PlayerInfo) =>
  info.videoData?.video_id === id && Boolean(info.videoData.title);

/* ---------- Playlist ---------- */

/** Extrai o ID de uma playlist de um link (…/playlist?list=PL… ou watch?v=…&list=PL…). */
export function parsePlaylistId(input: string): string | null {
  const match = input.match(/[?&]list=([\w-]{10,})/);
  if (match) return match[1];
  const raw = input.trim();
  return /^(PL|OLAK5uy_|UU|FL|RD)[\w-]{10,}$/.test(raw) ? raw : null;
}

export interface PlaylistImportHandlers {
  /** Chamado assim que a lista de vídeos é lida (antes dos títulos). */
  onIds?: (ids: string[]) => void;
  /** Chamado a cada título descoberto. */
  onTitle?: (info: ProbedInfo, done: number, total: number) => void;
}

/**
 * Lê os vídeos de uma playlist do YouTube pelo player embutido e, em seguida,
 * descobre o título de cada um. Resolve com os IDs quando termina tudo.
 */
export async function importPlaylist(listId: string, handlers: PlaylistImportHandlers = {}): Promise<string[]> {
  const player = new HiddenPlayer(`videoseries?list=${encodeURIComponent(listId)}`);
  try {
    const info = await player.waitFor((i) => Array.isArray(i.playlist) && i.playlist.length > 0, 20_000);
    const ids = [
      ...new Set((info?.playlist ?? []).filter((id): id is string => typeof id === "string" && /^[\w-]{11}$/.test(id))),
    ];
    if (!ids.length) {
      throw new Error("Não consegui ler essa playlist (ela é pública? o link está completo?).");
    }
    handlers.onIds?.(ids);
    if (handlers.onTitle) {
      for (let i = 0; i < ids.length; i++) {
        player.cue(ids[i]);
        const found = await player.waitFor(hasTitleFor(ids[i]), 6_000);
        if (found?.videoData?.title) {
          handlers.onTitle(toProbed(ids[i], found), i + 1, ids.length);
        }
      }
    }
    return ids;
  } finally {
    player.destroy();
  }
}

/* ---------- Títulos em segundo plano ---------- */

const queue: string[] = [];
const listeners = new Set<(info: ProbedInfo) => void>();
let running = false;

/** Recebe os títulos descobertos pela sonda. */
export function onProbedTitle(listener: (info: ProbedInfo) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Coloca vídeos na fila para descobrir o título pelo player escondido. */
export function probeTitles(ids: string[]) {
  for (const id of ids) if (!queue.includes(id)) queue.push(id);
  if (!running) void run();
}

async function run() {
  running = true;
  const first = queue[0];
  if (!first) {
    running = false;
    return;
  }
  const player = new HiddenPlayer(first);
  try {
    let isFirst = true;
    while (queue.length) {
      const id = queue[0];
      if (!isFirst) player.cue(id);
      isFirst = false;
      const info = await player.waitFor(hasTitleFor(id), 8_000);
      queue.shift();
      if (info?.videoData?.title) {
        const probed = toProbed(id, info);
        for (const listener of listeners) listener(probed);
      }
    }
  } finally {
    player.destroy();
    running = false;
    if (queue.length) void run();
  }
}
