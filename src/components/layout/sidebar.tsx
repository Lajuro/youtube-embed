"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AudioLines, GraduationCap, Heart, House, Keyboard, Library, ListMusic, Plus, Search, Settings, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PlaylistCover } from "@/components/playlist/playlist-cover";
import { cn, pluralize } from "@/lib/utils";
import { countLibraryVideos, useLibrary } from "@/stores/library-store";
import { usePlayer } from "@/stores/player-store";
import { useHydration, useUi } from "@/stores/ui-store";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group/logo flex items-center gap-2.5", className)}>
      <span className="relative grid size-9 place-items-center rounded-xl bg-brand-gradient text-white shadow-lg shadow-[color-mix(in_oklch,var(--brand-from)_40%,transparent)] transition-transform group-hover/logo:scale-105 group-hover/logo:-rotate-3">
        <AudioLines className="size-5" />
      </span>
      <span className="text-lg font-semibold tracking-tight">
        Sintonia
      </span>
    </Link>
  );
}

const NAV = [
  { href: "/", label: "Início", icon: House },
  { href: "/search", label: "Buscar", icon: Search },
  { href: "/library", label: "Biblioteca", icon: Library },
  { href: "/favorites", label: "Favoritos", icon: Heart },
  { href: "/playlists", label: "Playlists", icon: ListMusic },
  { href: "/courses", label: "Cursos", icon: GraduationCap },
] as const;

/**
 * Com Cache Components, `usePathname` suspende durante o prerender de rotas dinâmicas
 * (ex.: /playlists/[id]). Por isso a versão "com rota ativa" fica dentro de um Suspense
 * cujo fallback é a mesma barra lateral sem destaque.
 */
function SidebarContent(props: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<SidebarBody pathname="" {...props} />}>
      <SidebarWithPath {...props} />
    </Suspense>
  );
}

function SidebarWithPath(props: { onNavigate?: () => void }) {
  return <SidebarBody pathname={usePathname()} {...props} />;
}

function SidebarBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const hydrated = useHydration((s) => s.hydrated);
  const videoCount = useLibrary((s) => countLibraryVideos(s.videos));
  const courseCount = useLibrary((s) => s.courses.length);
  const favoriteCount = useLibrary((s) => s.favorites.length);
  const playlists = useLibrary((s) => s.playlists);
  const source = usePlayer((s) => s.source);
  const isPlaying = usePlayer((s) => s.status === "playing");
  const { openPlaylistDialog, setSettingsOpen, setShortcutsOpen } = useUi.getState();

  const counts: Record<string, number | undefined> = {
    "/library": videoCount,
    "/favorites": favoriteCount,
    "/playlists": playlists.length,
    "/courses": courseCount,
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-4">
        <Logo />
      </div>

      <nav className="grid gap-0.5 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const count = counts[href];
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "group/nav relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                active && "bg-sidebar-accent text-sidebar-foreground"
              )}
            >
              {active && <span className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brand-gradient" />}
              <Icon className={cn("size-[18px]", active && "text-primary", href === "/favorites" && active && "fill-primary")} />
              {label}
              {hydrated && count ? (
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">{count}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 flex items-center justify-between px-5">
        <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Suas playlists</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-xs"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => openPlaylistDialog()}
              aria-label="Nova playlist"
            >
              <Plus />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Nova playlist</TooltipContent>
        </Tooltip>
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto scrollbar-thin px-3 pb-3">
        {hydrated && playlists.length === 0 && (
          <button
            type="button"
            onClick={() => openPlaylistDialog()}
            className="mt-1 flex w-full cursor-pointer flex-col items-start gap-1 rounded-xl border border-dashed p-4 text-left text-sm transition-colors hover:border-primary/60 hover:bg-sidebar-accent/50"
          >
            <span className="font-medium">Crie sua primeira playlist</span>
            <span className="text-xs text-muted-foreground">Ex.: “Foco”, “Lofi da manhã”, “Sexta-feira”.</span>
          </button>
        )}
        <ul className="grid gap-0.5">
          {playlists.map((p) => {
            const href = `/playlists/${p.id}`;
            const active = pathname === href;
            const playingThis = source?.type === "playlist" && source.id === p.id;
            return (
              <li key={p.id}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg p-1.5 pr-2 transition-colors hover:bg-sidebar-accent",
                    active && "bg-sidebar-accent"
                  )}
                >
                  <PlaylistCover seed={p.id} videoIds={p.videoIds} className="size-10 shrink-0 rounded-md" iconClassName="size-4" />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm font-medium", playingThis && "text-primary")}>{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {pluralize(p.videoIds.length, "vídeo", "vídeos")}
                    </span>
                  </span>
                  {playingThis && (
                    <Volume2 className={cn("size-4 shrink-0 text-primary", !isPlaying && "opacity-50")} />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center gap-1 border-t border-sidebar-border px-3 py-3">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 justify-start text-muted-foreground"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings /> Configurações
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              onClick={() => setShortcutsOpen(true)}
              aria-label="Atalhos de teclado"
            >
              <Keyboard />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="flex items-center gap-2">
            Atalhos <Kbd>?</Kbd>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block xl:w-72">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar() {
  const open = useUi((s) => s.mobileNavOpen);
  const setOpen = useUi((s) => s.setMobileNavOpen);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-72 bg-sidebar p-0" showCloseButton={false}>
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Navegação e playlists</SheetDescription>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
