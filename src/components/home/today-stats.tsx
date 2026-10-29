"use client";

import { Brain, Flame, GraduationCap, Music2 } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { lastDays, statsOf, streakOf, useStats, type DayStats } from "@/stores/stats-store";

/** "1 h 12 min", "35 min", "< 1 min" ou "0 min". */
function formatMinutes(seconds: number) {
  if (seconds <= 0) return "0 min";
  if (seconds < 60) return "< 1 min";
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
}

const total = (d: DayStats) => d.listen + d.study;

const weekday = (date: Date) => date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");

/**
 * "Seu dia": minutos de música e de estudo hoje, focos concluídos, dias seguidos
 * e uma mini linha do tempo dos últimos 7 dias. Tudo calculado no navegador.
 */
export function TodayStats() {
  const days = useStats((s) => s.days);
  const week = lastDays(days, 7);
  const today = statsOf(days);
  const streak = streakOf(days);
  if (!week.some((d) => total(d.stats) > 0 || d.stats.focus > 0)) return null;

  const max = Math.max(...week.map((d) => total(d.stats)), 1);
  const tiles = [
    { icon: Music2, label: "Música hoje", value: formatMinutes(today.listen) },
    { icon: GraduationCap, label: "Estudo hoje", value: formatMinutes(today.study) },
    { icon: Brain, label: "Focos hoje", value: String(today.focus) },
    { icon: Flame, label: "Sequência", value: streak === 1 ? "1 dia" : `${streak} dias` },
  ];

  return (
    <section
      aria-label="Seu dia"
      className="flex flex-col gap-5 rounded-2xl border bg-card/60 p-4 backdrop-blur md:p-5 lg:flex-row lg:items-center lg:gap-8"
    >
      <div className="stagger grid flex-1 grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <t.icon className="size-3.5 shrink-0" /> {t.label}
            </p>
            <p className="mt-1 truncate text-xl font-semibold tracking-tight md:text-2xl">{t.value}</p>
          </div>
        ))}
      </div>

      <div className="lg:w-72">
        <p className="mb-2 text-xs text-muted-foreground">Últimos 7 dias</p>
        {/* Colunas finas a partir de uma linha de base; hoje em destaque, o resto discreto. */}
        <div className="flex h-20 items-end gap-1 border-b border-foreground/10" role="list" aria-label="Minutos por dia nos últimos 7 dias">
          {week.map((d, i) => {
            const isToday = i === week.length - 1;
            const value = total(d.stats);
            const description = `${isToday ? "Hoje" : d.date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric" })}: ${formatMinutes(d.stats.listen)} de música, ${formatMinutes(d.stats.study)} de estudo${d.stats.focus ? `, ${d.stats.focus} ${d.stats.focus === 1 ? "foco" : "focos"}` : ""}`;
            return (
              <Tooltip key={d.key}>
                <TooltipTrigger asChild>
                  {/* O alvo do mouse é a faixa inteira do dia, maior que a coluna. */}
                  <div role="listitem" tabIndex={0} aria-label={description} className="flex h-full flex-1 cursor-default items-end justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                    <div
                      className={cn(
                        "w-full max-w-6 rounded-t-[4px] transition-[height] duration-700 ease-out",
                        isToday ? "bg-primary" : "bg-foreground/20"
                      )}
                      style={{ height: value > 0 ? `max(3px, ${(value / max) * 100}%)` : 0 }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-center">
                  <p className="font-medium">{isToday ? "Hoje" : weekday(d.date)}</p>
                  <p>{formatMinutes(value)} no total</p>
                  <p className="opacity-70">
                    {formatMinutes(d.stats.listen)} música · {formatMinutes(d.stats.study)} estudo
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-1" aria-hidden>
          {week.map((d, i) => (
            <span
              key={d.key}
              className={cn("flex-1 text-center text-[10px] text-muted-foreground", i === week.length - 1 && "font-semibold text-foreground")}
            >
              {i === week.length - 1 ? "hoje" : weekday(d.date)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
