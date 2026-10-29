"use client";

import { AmbientBackdrop } from "@/components/player/now-playing";
import { cn } from "@/lib/utils";

/** Cabeçalho grande das telas de coleção (biblioteca, favoritos, playlist). */
export function PageHeader({
  cover,
  eyebrow,
  title,
  description,
  meta,
  actions,
  backdropVideoId,
  accent,
  className,
}: {
  cover: React.ReactNode;
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  /** Vídeo usado para o fundo desfocado. */
  backdropVideoId?: string | null;
  /** Cor de destaque do gradiente de fundo (CSS color). */
  accent?: string;
  className?: string;
}) {
  return (
    <section className={cn("relative -mt-14 overflow-hidden pt-14", className)}>
      {backdropVideoId ? (
        <AmbientBackdrop videoId={backdropVideoId} className="opacity-90" />
      ) : (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(80% 120% at 10% 0%, ${accent ?? "color-mix(in oklch, var(--brand-from) 40%, transparent)"}, transparent 70%)`,
          }}
        />
      )}
      <div className="relative flex flex-col gap-5 px-4 pt-4 pb-5 sm:flex-row sm:items-end md:px-8 md:pt-6">
        <div className="shrink-0 self-center sm:self-auto">{cover}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">{eyebrow}</p>
          <h1 className="mt-1.5 text-3xl font-extrabold tracking-tight text-balance break-words md:text-4xl xl:text-5xl">
            {title}
          </h1>
          {description && <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{description}</p>}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">{meta}</div>}
        </div>
      </div>
      {actions && <div className="relative flex flex-wrap items-center gap-3 px-4 pb-4 md:px-8">{actions}</div>}
    </section>
  );
}

export function MetaDot() {
  return <span className="text-muted-foreground/50">•</span>;
}
