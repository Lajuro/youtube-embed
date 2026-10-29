"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { create } from "zustand";

import { usePlayerBarHeight } from "@/lib/layout";

interface OsdMessage {
  id: number;
  icon: LucideIcon;
  label: string;
  /** Valor de 0 a 100 para desenhar uma barrinha (ex.: volume). */
  value?: number;
}

const useOsd = create<{ message: OsdMessage | null }>(() => ({ message: null }));
let counter = 0;

/** Mostra um aviso rápido na tela (estilo TV): volume, velocidade, ±10s, aleatório… */
export function showOsd(icon: LucideIcon, label: string, value?: number) {
  useOsd.setState({ message: { id: ++counter, icon, label, value } });
}

const VISIBLE_MS = 1100;
const FADE_MS = 200;

export function Osd() {
  const message = useOsd((s) => s.message);
  const bar = usePlayerBarHeight();
  const [leaving, setLeaving] = useState<number | null>(null);

  useEffect(() => {
    if (!message) return;
    const hide = setTimeout(() => setLeaving(message.id), VISIBLE_MS);
    const clear = setTimeout(() => useOsd.setState((s) => (s.message?.id === message.id ? { message: null } : s)), VISIBLE_MS + FADE_MS);
    return () => {
      clearTimeout(hide);
      clearTimeout(clear);
    };
  }, [message]);

  if (!message) return null;
  const Icon = message.icon;
  const isLeaving = leaving === message.id;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
      style={{ bottom: bar + 24 }}
      role="status"
      aria-live="polite"
    >
      <div
        // Mesma mensagem repetida (ex.: subir o volume várias vezes) não remonta: só a barrinha anda.
        key={message.label}
        className={
          isLeaving
            ? "flex items-center gap-3 rounded-2xl bg-popover/90 px-4 py-2.5 text-popover-foreground shadow-2xl ring-1 ring-border backdrop-blur-xl animate-out fade-out zoom-out-95 fill-mode-forwards"
            : "flex items-center gap-3 rounded-2xl bg-popover/90 px-4 py-2.5 text-popover-foreground shadow-2xl ring-1 ring-border backdrop-blur-xl animate-in fade-in zoom-in-90 slide-in-from-bottom-2 duration-200"
        }
        style={isLeaving ? { animationDuration: `${FADE_MS}ms` } : undefined}
      >
        <Icon className="size-5 shrink-0 text-primary" />
        <span className="text-sm font-medium whitespace-nowrap">{message.label}</span>
        {message.value !== undefined && (
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-28 overflow-hidden rounded-full bg-foreground/10">
              <span
                className="block h-full rounded-full bg-brand-gradient transition-[width] duration-150"
                style={{ width: `${Math.max(0, Math.min(100, message.value))}%` }}
              />
            </span>
            <span className="w-8 text-right text-xs text-muted-foreground tabular-nums">{Math.round(message.value)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
