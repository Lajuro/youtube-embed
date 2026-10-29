"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type FocusPhase = "idle" | "focus" | "break";

export const FOCUS_PRESETS = [
  { id: "classic", label: "25 / 5", hint: "Pomodoro clássico", focus: 25, short: 5, long: 15 },
  { id: "deep", label: "50 / 10", hint: "Concentrado", focus: 50, short: 10, long: 20 },
  { id: "flow", label: "90 / 20", hint: "Imersão", focus: 90, short: 20, long: 30 },
] as const;
export type FocusPresetId = (typeof FOCUS_PRESETS)[number]["id"];

/** A cada quantos focos vem a pausa longa. */
export const SESSIONS_PER_CYCLE = 4;

export const SLEEP_OPTIONS = [15, 30, 45, 60, 90, 120] as const;

interface TimerState {
  /* ---- Timer de foco (Pomodoro) ---- */
  phase: FocusPhase;
  /** Pausa longa (a cada 4 focos) em vez de curta. */
  longBreak: boolean;
  /** Quando a fase atual termina (timestamp). null = pausado ou parado. */
  endsAt: number | null;
  /** Tempo que faltava quando o timer foi pausado (ms). */
  remaining: number | null;
  /** Duração total da fase atual (ms) — para desenhar o anel de progresso. */
  phaseLength: number;
  /** Focos concluídos no ciclo atual. */
  sessions: number;
  preset: FocusPresetId;
  pauseMusicOnBreak: boolean;
  /** A música foi pausada pela pausa do Pomodoro (volta a tocar quando o foco recomeça). */
  musicPausedByTimer: boolean;

  /* ---- Desligamento automático ---- */
  /** Quando parar a música (timestamp). */
  sleepAt: number | null;

  startFocus: () => void;
  startPhase: (phase: Exclude<FocusPhase, "idle">, longBreak?: boolean) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setPreset: (preset: FocusPresetId) => void;
  setPauseMusicOnBreak: (value: boolean) => void;
  setMusicPausedByTimer: (value: boolean) => void;
  completeSession: () => number;
  setSleep: (minutes: number | null) => void;
}

export function presetOf(id: FocusPresetId) {
  return FOCUS_PRESETS.find((p) => p.id === id) ?? FOCUS_PRESETS[0];
}

export function phaseMinutes(state: Pick<TimerState, "preset">, phase: Exclude<FocusPhase, "idle">, longBreak = false) {
  const preset = presetOf(state.preset);
  if (phase === "focus") return preset.focus;
  return longBreak ? preset.long : preset.short;
}

/** Quanto falta (ms) na fase atual, rodando ou pausada. */
export function timeLeft(state: Pick<TimerState, "endsAt" | "remaining">, now = Date.now()) {
  if (state.endsAt) return Math.max(0, state.endsAt - now);
  return state.remaining ?? 0;
}

export const useTimer = create<TimerState>()(
  persist(
    (set, get) => ({
      phase: "idle",
      longBreak: false,
      endsAt: null,
      remaining: null,
      phaseLength: 0,
      sessions: 0,
      preset: "classic",
      pauseMusicOnBreak: true,
      musicPausedByTimer: false,
      sleepAt: null,

      startFocus: () => get().startPhase("focus"),
      startPhase: (phase, longBreak = false) => {
        const length = phaseMinutes(get(), phase, longBreak) * 60_000;
        set({ phase, longBreak, endsAt: Date.now() + length, remaining: null, phaseLength: length });
      },
      pause: () => {
        const { endsAt } = get();
        if (!endsAt) return;
        set({ endsAt: null, remaining: Math.max(0, endsAt - Date.now()) });
      },
      resume: () => {
        const { remaining, phase } = get();
        if (phase === "idle" || remaining == null) return;
        set({ endsAt: Date.now() + remaining, remaining: null });
      },
      stop: () =>
        set({ phase: "idle", longBreak: false, endsAt: null, remaining: null, phaseLength: 0, sessions: 0, musicPausedByTimer: false }),
      setPreset: (preset) => set({ preset }),
      setPauseMusicOnBreak: (pauseMusicOnBreak) => set({ pauseMusicOnBreak }),
      setMusicPausedByTimer: (musicPausedByTimer) => set({ musicPausedByTimer }),
      completeSession: () => {
        const sessions = get().sessions + 1;
        set({ sessions });
        return sessions;
      },
      setSleep: (minutes) => set({ sleepAt: minutes ? Date.now() + minutes * 60_000 : null }),
    }),
    {
      name: "sintonia:timers",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
