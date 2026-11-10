"use client";

import { AmbientBackdrop } from "@/components/player/now-playing";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho das telas de coleção (biblioteca, favoritos, playlist): capa, nome e ações.
 * O fundo usa a capa de um vídeo bem desfocada ("luz ambiente") — é o único lugar em que
 * a tela ganha cor que não vem do conteúdo.
 */
export function PageHeader({
  cover,
  eyebrow,
  title,
  description,
  meta,
  actions,
  backdropVideoId,
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
  className?: string;
}) {
  return (
    <section className={cn("relative -mt-13 overflow-hidden pt-13", className)}>
      {backdropVideoId && <AmbientBackdrop videoId={backdropVideoId} className="opacity-80" />}
      <div className="relative flex flex-col gap-5 px-4 pt-6 pb-6 sm:flex-row sm:items-end md:px-8 md:pt-8">
        <div className="shrink-0 self-center sm:self-auto">{cover}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance break-words md:text-4xl">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-sm text-pretty text-muted-foreground">{description}</p>}
          {meta && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-muted-foreground">{meta}</div>
          )}
        </div>
      </div>
      {actions && <div className="relative flex flex-wrap items-center gap-2 px-4 pb-4 md:px-8">{actions}</div>}
    </section>
  );
}

/**
 * Cabeçalho simples das outras telas (início, busca, playlists, cursos): título,
 * uma linha de apoio e as ações à direita. Mantém todas as páginas com o mesmo começo.
 */
export function PageIntro({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 pt-6 pb-5 md:px-8 md:pt-8", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Capa das coleções sem imagem própria (biblioteca, favoritos): um ícone sobre fundo neutro. */
export function CollectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="grid size-28 place-items-center rounded-xl border bg-card text-foreground/80 shadow-soft md:size-36">
      <Icon className="size-10 md:size-12" />
    </div>
  );
}

export function MetaDot() {
  return <span className="text-muted-foreground/50">·</span>;
}
