"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** O que foi feito em um dia (segundos tocando e sessões de foco concluídas). */
export interface DayStats {
  /** Música e vídeos fora dos cursos. */
  listen: number;
  /** Aulas dos cursos. */
  study: number;
  /** Pomodoros de foco concluídos. */
  focus: number;
}

/** Dias guardados (o resto é descartado para o localStorage não crescer para sempre). */
const KEEP_DAYS = 90;
/** Um dia conta para a sequência a partir de 1 minuto de atividade (ou um Pomodoro). */
const STREAK_MIN_SECONDS = 60;

/** Chave do dia no fuso local, ex.: "2026-10-29". */
export function dayKey(date = new Date()) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const EMPTY: DayStats = { listen: 0, study: 0, focus: 0 };

interface StatsState {
  days: Record<string, DayStats>;
  addTime: (kind: "listen" | "study", seconds: number) => void;
  addFocusSession: () => void;
}

function update(days: Record<string, DayStats>, patch: (day: DayStats) => DayStats) {
  const key = dayKey();
  const next = { ...days, [key]: patch(days[key] ?? EMPTY) };
  const keys = Object.keys(next).sort();
  for (const old of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete next[old];
  return next;
}

export const useStats = create<StatsState>()(
  persist(
    (set) => ({
      days: {},
      addTime: (kind, seconds) =>
        set((s) => ({ days: update(s.days, (d) => ({ ...d, [kind]: d[kind] + seconds })) })),
      addFocusSession: () => set((s) => ({ days: update(s.days, (d) => ({ ...d, focus: d.focus + 1 })) })),
    }),
    {
      name: "sintonia:stats",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);

export function statsOf(days: Record<string, DayStats>, date = new Date()): DayStats {
  return days[dayKey(date)] ?? EMPTY;
}

const isActive = (d: DayStats | undefined) => Boolean(d && (d.listen + d.study >= STREAK_MIN_SECONDS || d.focus > 0));

/** Os últimos `count` dias, do mais antigo para hoje. */
export function lastDays(days: Record<string, DayStats>, count: number) {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (count - 1 - i));
    return { date, key: dayKey(date), stats: days[dayKey(date)] ?? EMPTY };
  });
}

/** Dias seguidos com atividade, até hoje (ou até ontem, se hoje ainda não começou). */
export function streakOf(days: Record<string, DayStats>) {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < KEEP_DAYS; i++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    if (isActive(days[dayKey(date)])) streak++;
    else if (i > 0) break;
  }
  return streak;
}
