"use client";

import { useEffect, useId, useState } from "react";
import { Bell, Brain, Coffee, ListEnd, Moon, Pause, Play, Plus, SkipForward, Square, Timer, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { unlockAudio } from "@/lib/chime";
import { cn, formatTime } from "@/lib/utils";
import { usePlayer } from "@/stores/player-store";
import { statsOf, useStats } from "@/stores/stats-store";
import {
  FOCUS_PRESETS,
  SESSIONS_PER_CYCLE,
  SLEEP_OPTIONS,
  phaseMinutes,
  timeLeft,
  useTimer,
  type FocusPhase,
} from "@/stores/timer-store";

/** Relógio que atualiza sozinho enquanto `active` (para contagens regressivas na tela). */
export function useNow(active: boolean, interval = 1000) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    const update = () => setNow(Date.now());
    const raf = requestAnimationFrame(update);
    const id = setInterval(update, interval);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, [active, interval]);
  return now;
}

const PHASE_LABEL: Record<FocusPhase, string> = { idle: "Pronto para focar?", focus: "Foco", break: "Pausa" };

/** Contagem regressiva no formato 24:59 (ou 1:29:59). */
const clock = (ms: number) => formatTime(Math.ceil(ms / 1000));

/** Botão do timer (barra do topo e sala de aula) com o painel de foco e desligamento automático. */
export function TimerButton({ className }: { className?: string }) {
  const phase = useTimer((s) => s.phase);
  const endsAt = useTimer((s) => s.endsAt);
  const remaining = useTimer((s) => s.remaining);
  const sleepAt = useTimer((s) => s.sleepAt);
  const stopAfterCurrent = usePlayer((s) => s.stopAfterCurrent);
  const running = phase !== "idle";
  const sleeping = Boolean(sleepAt) || stopAfterCurrent;
  const now = useNow(running || Boolean(sleepAt));
  const [tab, setTab] = useState<"focus" | "sleep">("focus");
  const left = now ? timeLeft({ endsAt, remaining }, now) : 0;
  const label = running ? `${PHASE_LABEL[phase]}: faltam ${clock(left)}` : "Timer de foco e desligamento automático";

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) setTab(!running && sleeping ? "sleep" : "focus");
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size={running ? "sm" : "icon-sm"}
              aria-label={label}
              className={cn(
                "relative rounded-full text-muted-foreground",
                running && "h-8 gap-1.5 bg-foreground/[0.06] px-3 text-foreground tabular-nums",
                className
              )}
            >
              {running ? (
                <>
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      phase === "focus" ? "bg-primary" : "bg-emerald-500",
                      endsAt && "animate-pulse"
                    )}
                  />
                  {now ? clock(left) : "--:--"}
                  {!endsAt && <Pause className="size-3.5" />}
                </>
              ) : (
                <Timer />
              )}
              {sleeping && (
                <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
                  <Moon className="size-2.5 fill-current" />
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-[22rem] p-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "focus" | "sleep")}>
          <TabsList className="w-full">
            <TabsTrigger value="focus">
              <Brain /> Foco
            </TabsTrigger>
            <TabsTrigger value="sleep">
              <Moon /> Desligar
            </TabsTrigger>
          </TabsList>
          <TabsContent value="focus">
            <FocusPanel now={now} />
          </TabsContent>
          <TabsContent value="sleep">
            <SleepPanel now={now} />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

function FocusPanel({ now }: { now: number }) {
  const timer = useTimer();
  const todaySessions = useStats((s) => statsOf(s.days).focus);
  const running = timer.phase !== "idle";
  const paused = running && !timer.endsAt;
  const length = running ? timer.phaseLength : phaseMinutes(timer, "focus") * 60_000;
  const left = running ? (now ? timeLeft(timer, now) : length) : length;
  const progress = running && length ? 1 - left / length : 0;
  const doneInCycle = timer.phase === "focus" ? timer.sessions % SESSIONS_PER_CYCLE : ((timer.sessions - 1) % SESSIONS_PER_CYCLE) + 1;
  const [permission, setPermission] = useState(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );

  return (
    <div className="grid gap-4 pt-2">
      <div className="flex items-center gap-4">
        <ProgressRing progress={progress} phase={timer.phase}>
          <span className="text-2xl font-bold tracking-tight tabular-nums">{clock(left)}</span>
          <span className="text-[11px] font-medium text-muted-foreground">
            {timer.phase === "break" ? (timer.longBreak ? "Pausa longa" : "Pausa curta") : "Foco"}
          </span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {timer.phase === "idle"
              ? "Pronto para focar?"
              : timer.phase === "focus"
                ? paused
                  ? "Foco pausado"
                  : "Concentração total"
                : paused
                  ? "Pausa pausada"
                  : "Respire um pouco"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {timer.phase === "idle"
              ? "Blocos de foco com pausas no meio. A cada 4, uma pausa longa."
              : timer.phase === "focus"
                ? "Celular longe, uma tarefa só."
                : "Levante, alongue, beba água."}
          </p>
          <div className="mt-2 flex items-center gap-1.5" aria-label={`${doneInCycle} de ${SESSIONS_PER_CYCLE} focos do ciclo`}>
            {Array.from({ length: SESSIONS_PER_CYCLE }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  running && i < doneInCycle ? "bg-brand-gradient" : "bg-foreground/10"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {!running ? (
          <Button
            variant="brand"
            className="flex-1 rounded-full"
            onClick={() => {
              unlockAudio();
              timer.startFocus();
            }}
          >
            <Play className="fill-current" /> Começar foco
          </Button>
        ) : (
          <>
            {paused ? (
              <Button variant="brand" className="flex-1 rounded-full" onClick={timer.resume}>
                <Play className="fill-current" /> Continuar
              </Button>
            ) : (
              <Button variant="secondary" className="flex-1 rounded-full" onClick={timer.pause}>
                <Pause className="fill-current" /> Pausar
              </Button>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  aria-label={timer.phase === "focus" ? "Pular para a pausa" : "Pular a pausa"}
                  onClick={() => {
                    unlockAudio();
                    // Pular = encerrar a fase agora; o motor dos timers faz a troca.
                    useTimer.setState({ endsAt: Date.now(), remaining: null });
                  }}
                >
                  <SkipForward />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{timer.phase === "focus" ? "Pular para a pausa" : "Pular a pausa"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full" aria-label="Encerrar o timer" onClick={timer.stop}>
                  <Square className="size-3.5 fill-current" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Encerrar o timer</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Duração">
        {FOCUS_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={timer.preset === p.id}
            disabled={running}
            onClick={() => timer.setPreset(p.id)}
            className={cn(
              "cursor-pointer rounded-xl border px-2 py-1.5 text-center transition-colors hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-60",
              timer.preset === p.id && "border-primary bg-primary/10 text-primary"
            )}
          >
            <span className="block text-sm font-semibold tabular-nums">{p.label}</span>
            <span className="block text-[10px] text-muted-foreground">{p.hint}</span>
          </button>
        ))}
      </div>

      <Label className="flex cursor-pointer items-center justify-between gap-3 font-normal">
        <span className="flex items-center gap-2 text-sm">
          <Coffee className="size-4 text-muted-foreground" /> Pausar a música nas pausas
        </span>
        <Switch checked={timer.pauseMusicOnBreak} onCheckedChange={timer.setPauseMusicOnBreak} />
      </Label>

      <div className="flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span>
          Hoje: <strong className="text-foreground tabular-nums">{todaySessions}</strong>{" "}
          {todaySessions === 1 ? "foco concluído" : "focos concluídos"}
        </span>
        {permission === "default" && (
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1 text-primary hover:underline"
            onClick={() => Notification.requestPermission().then(setPermission)}
          >
            <Bell className="size-3.5" /> Avisar com notificação
          </button>
        )}
      </div>
    </div>
  );
}

function ProgressRing({ progress, phase, children }: { progress: number; phase: FocusPhase; children: React.ReactNode }) {
  // O id vira referência url(#...) do gradiente; tira os caracteres especiais do useId.
  const id = `ring-${useId().replace(/[^\w-]/g, "")}`;
  const size = 112;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            {phase === "break" ? (
              <>
                <stop offset="0" stopColor="#34d399" />
                <stop offset="1" stopColor="#22d3ee" />
              </>
            ) : (
              <>
                <stop offset="0" style={{ stopColor: "var(--brand-from)" }} />
                <stop offset="1" style={{ stopColor: "var(--brand-to)" }} />
              </>
            )}
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-foreground/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={`url(#${id})`}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.min(1, Math.max(0, progress)))}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">{children}</div>
    </div>
  );
}

function SleepPanel({ now }: { now: number }) {
  const sleepAt = useTimer((s) => s.sleepAt);
  const setSleep = useTimer((s) => s.setSleep);
  const stopAfterCurrent = usePlayer((s) => s.stopAfterCurrent);
  const setStopAfterCurrent = usePlayer((s) => s.setStopAfterCurrent);
  const hasQueue = usePlayer((s) => s.queue.length > 0);
  const isLive = usePlayer((s) => s.isLive);

  const choose = (minutes: number) => {
    setStopAfterCurrent(false);
    setSleep(minutes);
  };

  if (sleepAt || stopAfterCurrent) {
    return (
      <div className="grid gap-4 pt-2">
        <div className="flex items-center gap-3 rounded-xl bg-primary/10 p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
            <Moon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">A música para</p>
            <p className="text-lg font-semibold tabular-nums">
              {sleepAt ? `em ${now ? clock(Math.max(0, sleepAt - now)) : "--:--"}` : "ao fim deste vídeo"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {sleepAt && (
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => useTimer.setState({ sleepAt: sleepAt + 15 * 60_000 })}>
              <Plus /> 15 min
            </Button>
          )}
          <Button
            variant="ghost"
            className="flex-1 rounded-full"
            onClick={() => {
              setSleep(null);
              setStopAfterCurrent(false);
            }}
          >
            <X /> Cancelar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">O volume vai baixando aos poucos nos últimos 15 segundos.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 pt-2">
      <p className="text-sm text-muted-foreground">Pausar a música automaticamente daqui a…</p>
      <div className="grid grid-cols-3 gap-1.5">
        {SLEEP_OPTIONS.map((minutes) => (
          <Button key={minutes} variant="outline" className="rounded-xl tabular-nums" onClick={() => choose(minutes)}>
            {minutes < 60 ? `${minutes} min` : minutes % 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60}` : `${minutes / 60} h`}
          </Button>
        ))}
      </div>
      <Button
        variant="secondary"
        className="rounded-xl"
        disabled={!hasQueue || isLive}
        onClick={() => {
          setSleep(null);
          setStopAfterCurrent(true);
        }}
      >
        <ListEnd /> Ao fim deste vídeo
      </Button>
      <p className="text-xs text-muted-foreground">
        Útil para não ficar tocando depois do expediente ou de uma aula. O volume baixa aos poucos antes de parar.
      </p>
    </div>
  );
}
