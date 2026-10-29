"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLines,
  GraduationCap,
  Heart,
  House,
  Keyboard,
  Library,
  ListMusic,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PlaylistCover } from "@/components/playlist/playlist-cover";
import { Equalizer } from "@/components/video/equalizer";
import { cn, pluralize } from "@/lib/utils";
import { countLibraryVideos, useLibrary } from "@/stores/library-store";
import { usePlayer } from "@/stores/player-store";
import { useHydration, useSettings, useUi } from "@/stores/ui-store";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn("group/logo flex items-center gap-2.5", className)} aria-label="Sintonia — início">
      <span className="relative grid size-8 shrink-0 place-items-center rounded-[10px] bg-brand-gradient text-white shadow-md shadow-[color-mix(in_oklch,var(--brand-from)_35%,transparent)] transition-transform group-hover/logo:scale-105 group-hover/logo:-rotate-3">
        <AudioLines className="size-[18px]" />
      </span>
      {!compact && <span className="text-[17px] font-semibold tracking-tight">Sintonia</span>}
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

interface ContentProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

/**
 * Com Cache Components, `usePathname` suspende durante o prerender de rotas dinâmicas
 * (ex.: /playlists/[id]). Por isso a versão "com rota ativa" fica dentro de um Suspense
 * cujo fallback é a mesma barra lateral sem destaque.
 */
function SidebarContent(props: ContentProps) {
  return (
    <Suspense fallback={<SidebarBody pathname="" {...props} />}>
      <SidebarWithPath {...props} />
    </Suspense>
  );
}

function SidebarWithPath(props: ContentProps) {
  return <SidebarBody pathname={usePathname()} {...props} />;
}

/** Item que, com o menu recolhido, mostra o nome num tooltip à direita. */
function RailTip({ show, label, children }: { show: boolean; label: React.ReactNode; children: React.ReactElement }) {
  if (!show) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarBody({ pathname, collapsed = false, onNavigate }: ContentProps & { pathname: string }) {
  const hydrated = useHydration((s) => s.hydrated);
  const videoCount = useLibrary((s) => countLibraryVideos(s.videos));
  const courseCount = useLibrary((s) => s.courses.length);
  const favoriteCount = useLibrary((s) => s.favorites.length);
  const playlists = useLibrary((s) => s.playlists);
  const source = usePlayer((s) => s.source);
  const isPlaying = usePlayer((s) => s.status === "playing");
  const toggleSidebar = useSettings((s) => s.toggleSidebar);
  const { openPlaylistDialog, setSettingsOpen, setShortcutsOpen } = useUi.getState();

  const counts: Record<string, number | undefined> = {
    "/library": videoCount,
    "/favorites": favoriteCount,
    "/playlists": playlists.length,
    "/courses": courseCount,
  };

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-14 shrink-0 items-center", collapsed ? "justify-center" : "justify-between pr-2 pl-4")}>
        <Logo compact={collapsed} />
        {!collapsed && !onNavigate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={toggleSidebar}
                aria-label="Recolher menu"
              >
                <PanelLeftClose />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
              Recolher menu
              <KbdGroup>
                <Kbd>Ctrl</Kbd>
                <Kbd>B</Kbd>
              </KbdGroup>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <nav className={cn("grid gap-0.5", collapsed ? "justify-items-center px-2" : "px-2.5")}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const count = hydrated ? counts[href] : undefined;
          return (
            <RailTip key={href} show={collapsed} label={count ? `${label} · ${count}` : label}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-label={label}
                className={cn(
                  "group/nav relative flex items-center rounded-lg text-sm font-medium text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  collapsed ? "size-10 justify-center" : "h-9 gap-3 px-2.5",
                  active && "bg-sidebar-accent text-sidebar-foreground"
                )}
              >
                {active && (
                  <span
                    className={cn(
                      "absolute top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-brand-gradient",
                      collapsed ? "-left-2" : "-left-2.5"
                    )}
                  />
                )}
                <Icon
                  className={cn("size-[18px] shrink-0", active && "text-primary", href === "/favorites" && active && "fill-primary")}
                />
                {!collapsed && (
                  <>
                    <span className="truncate">{label}</span>
                    {count ? <span className="ml-auto text-xs text-muted-foreground/80 tabular-nums">{count}</span> : null}
                  </>
                )}
              </Link>
            </RailTip>
          );
        })}
      </nav>

      <div className={cn("mt-5 flex items-center", collapsed ? "flex-col gap-2 px-2" : "justify-between pr-2 pl-5")}>
        {collapsed ? (
          <div className="h-px w-8 bg-sidebar-border" />
        ) : (
          <h2 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Playlists</h2>
        )}
        <RailTip show={collapsed} label="Nova playlist">
          <Button
            size="icon-xs"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => openPlaylistDialog()}
            aria-label="Nova playlist"
          >
            <Plus />
          </Button>
        </RailTip>
      </div>

      <div className={cn("mt-1.5 min-h-0 flex-1 overflow-y-auto scrollbar-none pb-3", collapsed ? "px-2" : "px-2.5")}>
        {hydrated && playlists.length === 0 && !collapsed && (
          <button
            type="button"
            onClick={() => openPlaylistDialog()}
            className="mt-1 flex w-full cursor-pointer flex-col items-start gap-1 rounded-xl border border-dashed p-3 text-left text-sm transition-colors hover:border-primary/60 hover:bg-sidebar-accent/50"
          >
            <span className="font-medium">Crie sua primeira playlist</span>
            <span className="text-xs text-muted-foreground">Ex.: “Foco”, “Lofi da manhã”.</span>
          </button>
        )}
        <ul className={cn("grid gap-0.5", collapsed && "justify-items-center")}>
          {playlists.map((p) => {
            const href = `/playlists/${p.id}`;
            const active = pathname === href;
            const playingThis = source?.type === "playlist" && source.id === p.id;
            return (
              <li key={p.id}>
                <RailTip show={collapsed} label={`${p.name} · ${pluralize(p.videoIds.length, "vídeo", "vídeos")}`}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-label={p.name}
                    className={cn(
                      "relative flex items-center rounded-lg transition-colors hover:bg-sidebar-accent",
                      collapsed ? "p-1" : "gap-2.5 p-1.5 pr-2",
                      active && "bg-sidebar-accent"
                    )}
                  >
                    <PlaylistCover
                      seed={p.id}
                      videoIds={p.videoIds}
                      className={cn("shrink-0 rounded-md", collapsed ? "size-9" : "size-9")}
                      iconClassName="size-4"
                    />
                    {collapsed ? (
                      playingThis && (
                        <span className="absolute right-0 bottom-0 grid size-4 place-items-center rounded-full bg-sidebar ring-2 ring-sidebar">
                          <span className="size-2 rounded-full bg-primary" />
                        </span>
                      )
                    ) : (
                      <>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-[13px] font-medium", playingThis && "text-primary")}>
                            {p.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {pluralize(p.videoIds.length, "vídeo", "vídeos")}
                          </span>
                        </span>
                        {playingThis && <Equalizer paused={!isPlaying} className="shrink-0" />}
                      </>
                    )}
                  </Link>
                </RailTip>
              </li>
            );
          })}
        </ul>
      </div>

      <div
        className={cn(
          "flex shrink-0 border-t border-sidebar-border",
          collapsed ? "flex-col items-center gap-1 py-3" : "items-center gap-1 px-2 py-2"
        )}
      >
        <RailTip show={collapsed} label="Configurações">
          <Button
            variant="ghost"
            size={collapsed ? "icon-sm" : "sm"}
            className={cn("text-muted-foreground", !collapsed && "flex-1 justify-start")}
            onClick={() => setSettingsOpen(true)}
            aria-label="Configurações"
          >
            <Settings />
            {!collapsed && "Configurações"}
          </Button>
        </RailTip>
        <RailTip show={collapsed} label="Atalhos (?)">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            onClick={() => setShortcutsOpen(true)}
            aria-label="Atalhos de teclado"
          >
            <Keyboard />
          </Button>
        </RailTip>
        {collapsed && (
          <RailTip show label="Expandir menu (Ctrl+B)">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              onClick={toggleSidebar}
              aria-label="Expandir menu"
            >
              <PanelLeftOpen />
            </Button>
          </RailTip>
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  const collapsed = useSettings((s) => s.sidebarCollapsed);
  return (
    <aside
      className={cn(
        "hidden shrink-0 overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      <SidebarContent collapsed={collapsed} />
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
