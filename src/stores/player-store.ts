"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { getBridge } from "@/lib/youtube-bridge";
import { shuffleArray } from "@/lib/utils";

export type RepeatMode = "off" | "all" | "one";
export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "buffering" | "ended";
export type VideoMode = "mini" | "hidden";

export interface QueueSource {
  type: "playlist" | "favorites" | "library" | "single" | "custom" | "course";
  id?: string;
  label: string;
}

export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

/**
 * Permite que outra parte do app diga "de onde começar" cada vídeo (ex.: cursos
 * retomam a aula no ponto em que você parou). Registrado pelo CourseTracker.
 */
type StartResolver = (videoId: string, source: QueueSource | null) => number;
let startResolver: StartResolver | null = null;
export function setStartResolver(resolver: StartResolver | null) {
  startResolver = resolver;
}

/**
 * Permite que uma página impeça o avanço automático ao fim de um vídeo (ex.: a sala de
 * aula mostra a tela "Próxima aula em 5s" e decide sozinha quando avançar).
 */
type AdvanceGuard = (source: QueueSource | null) => boolean;
let advanceGuard: AdvanceGuard | null = null;
export function setAdvanceGuard(guard: AdvanceGuard | null) {
  advanceGuard = guard;
}

interface PlayQueueOptions {
  /** Ignora o modo aleatório (aulas de um curso sempre seguem a ordem). */
  ordered?: boolean;
  /** Segundo em que o primeiro vídeo deve começar. */
  startAt?: number;
}

interface PlayerState {
  /* ---- persistido ---- */
  queue: string[];
  /** Ordem original antes de ativar o aleatório (para restaurar ao desligar). */
  originalQueue: string[] | null;
  index: number;
  source: QueueSource | null;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
  muted: boolean;
  videoMode: VideoMode;
  /** Posição salva para retomar depois de recarregar a página (e onde o vídeo atual começa). */
  resumeAt: number;
  playbackRate: number;

  /* ---- em memória ---- */
  status: PlayerStatus;
  currentTime: number;
  duration: number;
  isLive: boolean;
  ready: boolean;
  /** Incrementa a cada pedido de "tocar" — força recarregar mesmo se o ID for o mesmo. */
  playToken: number;
  /** Se o próximo carregamento deve iniciar tocando (false ao restaurar sessão). */
  autoplay: boolean;
  expanded: boolean;
  queueOpen: boolean;

  /* ---- ações ---- */
  playQueue: (ids: string[], startIndex?: number, source?: QueueSource | null, options?: PlayQueueOptions) => void;
  playVideo: (id: string, source?: QueueSource | null) => void;
  playNext: (ids: string[]) => void;
  addToQueue: (ids: string[]) => void;
  removeFromQueue: (index: number) => void;
  moveInQueue: (from: number, to: number) => void;
  jumpTo: (index: number, startAt?: number) => void;
  clearQueue: () => void;
  next: (auto?: boolean) => void;
  previous: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  seekBy: (delta: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setVideoMode: (mode: VideoMode) => void;
  setExpanded: (value: boolean) => void;
  setQueueOpen: (value: boolean) => void;
  stop: () => void;

  /* ---- sincronização vinda do iframe ---- */
  _sync: (patch: Partial<Pick<PlayerState, "status" | "currentTime" | "duration" | "isLive" | "ready">>) => void;
}

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => {
      const bridge = () => getBridge();

      /** Troca a faixa atual mantendo a fila. */
      const goTo = (index: number, autoplay = true, startAt?: number) => {
        const { queue, source } = get();
        const videoId = queue[index];
        const start = startAt ?? (videoId && startResolver ? startResolver(videoId, source) : 0);
        set((s) => ({
          index,
          playToken: s.playToken + 1,
          autoplay,
          status: "loading",
          currentTime: start,
          duration: 0,
          isLive: false,
          resumeAt: start,
        }));
      };

      return {
        queue: [],
        originalQueue: null,
        index: 0,
        source: null,
        shuffle: false,
        repeat: "off",
        volume: 70,
        muted: false,
        videoMode: "mini",
        resumeAt: 0,
        playbackRate: 1,

        status: "idle",
        currentTime: 0,
        duration: 0,
        isLive: false,
        ready: false,
        playToken: 0,
        autoplay: false,
        expanded: false,
        queueOpen: false,

        playQueue: (ids, startIndex = 0, source = null, options = {}) => {
          if (!ids.length) return;
          const shuffle = get().shuffle && !options.ordered;
          let queue = [...ids];
          let index = Math.min(Math.max(startIndex, 0), ids.length - 1);
          let originalQueue: string[] | null = null;
          if (shuffle) {
            originalQueue = [...ids];
            const first = queue[index];
            queue = [first, ...shuffleArray(queue.filter((_, i) => i !== index))];
            index = 0;
          }
          set({ queue, originalQueue, source });
          goTo(index, true, options.startAt);
        },

        playVideo: (id, source = null) => {
          const { queue, index } = get();
          const existing = queue.indexOf(id);
          if (existing !== -1 && source === null) {
            goTo(existing);
            return;
          }
          if (source) {
            get().playQueue([id], 0, source);
            return;
          }
          // Insere logo após a faixa atual e toca.
          const nextQueue = queue.length ? [...queue] : [];
          const insertAt = queue.length ? index + 1 : 0;
          nextQueue.splice(insertAt, 0, id);
          set({ queue: nextQueue, originalQueue: null });
          goTo(insertAt);
        },

        playNext: (ids) => {
          const { queue, index } = get();
          if (!queue.length) {
            get().playQueue(ids, 0, { type: "custom", label: "Fila" });
            return;
          }
          const nextQueue = [...queue];
          nextQueue.splice(index + 1, 0, ...ids);
          set({ queue: nextQueue });
        },

        addToQueue: (ids) => {
          const { queue } = get();
          if (!queue.length) {
            get().playQueue(ids, 0, { type: "custom", label: "Fila" });
            return;
          }
          set({ queue: [...queue, ...ids] });
        },

        removeFromQueue: (i) => {
          const { queue, index } = get();
          if (i < 0 || i >= queue.length) return;
          const nextQueue = queue.filter((_, idx) => idx !== i);
          if (!nextQueue.length) {
            get().stop();
            return;
          }
          if (i < index) {
            set({ queue: nextQueue, index: index - 1 });
          } else if (i === index) {
            set({ queue: nextQueue });
            goTo(Math.min(index, nextQueue.length - 1), get().status === "playing");
          } else {
            set({ queue: nextQueue });
          }
        },

        moveInQueue: (from, to) => {
          const { queue, index } = get();
          const nextQueue = [...queue];
          const [item] = nextQueue.splice(from, 1);
          nextQueue.splice(to, 0, item);
          let nextIndex = index;
          if (from === index) nextIndex = to;
          else if (from < index && to >= index) nextIndex = index - 1;
          else if (from > index && to <= index) nextIndex = index + 1;
          set({ queue: nextQueue, index: nextIndex });
        },

        jumpTo: (i, startAt) => {
          if (i >= 0 && i < get().queue.length) goTo(i, true, startAt);
        },

        clearQueue: () => {
          const { queue, index } = get();
          const current = queue[index];
          if (!current) return;
          set({ queue: [current], index: 0, originalQueue: null });
        },

        next: (auto = false) => {
          const { queue, index, repeat, source } = get();
          if (!queue.length) return;
          if (auto && advanceGuard && !advanceGuard(source)) {
            set({ status: "ended" });
            return;
          }
          if (auto && repeat === "one") {
            bridge().seekTo(0);
            bridge().play();
            return;
          }
          if (index < queue.length - 1) {
            goTo(index + 1);
          } else if (repeat === "all" || !auto) {
            // Fim da fila: volta ao início (no "próximo" manual também, como em players de música).
            goTo(0, repeat === "all" || !auto);
          } else {
            set({ status: "ended" });
          }
        },

        previous: () => {
          const { index, currentTime } = get();
          // Mesmo comportamento dos players de música: se já passou de 3s, volta ao começo.
          if (currentTime > 3 || index === 0) {
            bridge().seekTo(0);
            set({ currentTime: 0 });
            return;
          }
          goTo(index - 1);
        },

        togglePlay: () => {
          const { status, queue } = get();
          if (!queue.length) return;
          if (status === "playing" || status === "buffering") {
            bridge().pause();
            set({ status: "paused" });
          } else if (status === "ended") {
            bridge().seekTo(0);
            bridge().play();
          } else {
            bridge().play();
            set({ status: "playing" });
          }
        },

        seek: (seconds) => {
          bridge().seekTo(seconds);
          set({ currentTime: seconds });
        },

        seekBy: (delta) => {
          const { currentTime, duration, isLive } = get();
          if (isLive) return;
          const target = Math.max(0, Math.min(duration || Infinity, currentTime + delta));
          get().seek(target);
        },

        setVolume: (volume) => {
          const v = Math.max(0, Math.min(100, Math.round(volume)));
          bridge().setVolume(v);
          if (v > 0 && get().muted) bridge().unMute();
          set({ volume: v, muted: v === 0 ? get().muted : false });
        },

        setPlaybackRate: (rate) => {
          bridge().setPlaybackRate(rate);
          set({ playbackRate: rate });
        },

        toggleMute: () => {
          const muted = !get().muted;
          if (muted) bridge().mute();
          else {
            bridge().unMute();
            if (get().volume === 0) {
              bridge().setVolume(50);
              set({ volume: 50 });
            }
          }
          set({ muted });
        },

        toggleShuffle: () => {
          const { shuffle, queue, index, originalQueue } = get();
          const current = queue[index];
          if (!shuffle) {
            const rest = queue.filter((_, i) => i !== index);
            set({
              shuffle: true,
              originalQueue: [...queue],
              queue: current ? [current, ...shuffleArray(rest)] : queue,
              index: 0,
            });
          } else {
            const restored = originalQueue && originalQueue.length ? originalQueue : queue;
            // Mantém itens adicionados depois de ligar o aleatório.
            const extras = queue.filter((id) => !restored.includes(id));
            const merged = [...restored, ...extras];
            const newIndex = current ? Math.max(merged.indexOf(current), 0) : 0;
            set({ shuffle: false, originalQueue: null, queue: merged, index: newIndex });
          }
        },

        cycleRepeat: () => {
          const order: RepeatMode[] = ["off", "all", "one"];
          const current = get().repeat;
          set({ repeat: order[(order.indexOf(current) + 1) % order.length] });
        },

        setVideoMode: (videoMode) => set({ videoMode }),
        setExpanded: (expanded) => set({ expanded }),
        setQueueOpen: (queueOpen) => set({ queueOpen }),

        stop: () => {
          bridge().pause();
          set({
            queue: [],
            originalQueue: null,
            index: 0,
            source: null,
            status: "idle",
            currentTime: 0,
            duration: 0,
            resumeAt: 0,
            expanded: false,
          });
        },

        _sync: (patch) => set(patch),
      };
    },
    {
      name: "sintonia:player",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        queue: s.queue,
        originalQueue: s.originalQueue,
        index: s.index,
        source: s.source,
        shuffle: s.shuffle,
        repeat: s.repeat,
        volume: s.volume,
        muted: s.muted,
        videoMode: s.videoMode,
        playbackRate: s.playbackRate,
        resumeAt: s.isLive ? 0 : Math.floor(s.currentTime || s.resumeAt),
      }),
    }
  )
);

/**
 * "Encaixe" do vídeo: uma página pode oferecer um elemento (ex.: a área de vídeo da
 * sala de aula) para o player ocupar no lugar do mini player.
 */
export const usePlayerDock = create<{
  /** Elemento que o vídeo deve cobrir. */
  el: HTMLElement | null;
  /** Área rolável que contém o palco: o vídeo é recortado por ela e flutua quando sai dela. */
  scrollEl: HTMLElement | null;
  setDock: (el: HTMLElement, scrollEl: HTMLElement | null) => void;
  clearDock: (el: HTMLElement) => void;
}>()((set, get) => ({
  el: null,
  scrollEl: null,
  setDock: (el, scrollEl) => set({ el, scrollEl }),
  clearDock: (el) => {
    if (get().el === el) set({ el: null, scrollEl: null });
  },
}));

export function useCurrentVideoId() {
  return usePlayer((s) => s.queue[s.index] ?? null);
}
