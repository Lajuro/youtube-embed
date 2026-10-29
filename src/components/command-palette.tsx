"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Brain,
  Download,
  GraduationCap,
  Heart,
  House,
  Keyboard,
  Library,
  ListMusic,
  ListPlus,
  Maximize2,
  Moon,
  Palette,
  Pause,
  Play,
  Plus,
  Search,
  Settings,
  Shuffle,
  Square,
  Sun,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { PlaylistCover } from "@/components/playlist/playlist-cover";
import { VideoThumbnail } from "@/components/video/video-thumbnail";
import { ACCENTS, accentGradient } from "@/lib/accents";
import { addVideosToLibrary, downloadBackup, playList } from "@/lib/actions";
import { unlockAudio } from "@/lib/chime";
import { pluralize } from "@/lib/utils";
import { parseManyVideoIds } from "@/lib/youtube";
import { sortByAddedDesc, useLibrary } from "@/stores/library-store";
import { usePlayer } from "@/stores/player-store";
import { useTimer } from "@/stores/timer-store";
import { useSettings, useUi } from "@/stores/ui-store";

export function CommandPalette() {
  const open = useUi((s) => s.commandOpen);
  const setOpen = useUi((s) => s.setCommandOpen);
  const [search, setSearch] = useState("");

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
      }}
      title="Buscar"
      description="Busque vídeos, playlists e ações"
    >
      {open && <PaletteBody search={search} setSearch={setSearch} close={() => setOpen(false)} />}
    </CommandDialog>
  );
}

function PaletteBody({
  search,
  setSearch,
  close,
}: {
  search: string;
  setSearch: (v: string) => void;
  close: () => void;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const videos = useLibrary((s) => s.videos);
  const playlists = useLibrary((s) => s.playlists);
  const courses = useLibrary((s) => s.courses);
  const favorites = useLibrary((s) => s.favorites);
  const status = usePlayer((s) => s.status);
  const hasQueue = usePlayer((s) => s.queue.length > 0);
  const timerPhase = useTimer((s) => s.phase);
  const ui = useUi.getState();

  const allVideos = useMemo(() => sortByAddedDesc(videos), [videos]);
  const pastedIds = useMemo(() => parseManyVideoIds(search), [search]);
  const looksLikeLink = pastedIds.length > 0 && (search.includes("/") || search.trim().length === 11);

  const run = (fn: () => void) => {
    close();
    // Deixa o diálogo fechar antes de abrir outro.
    setTimeout(fn, 10);
  };

  return (
    <>
      <CommandInput
        value={search}
        onValueChange={setSearch}
        placeholder="Buscar na biblioteca ou no YouTube… ou colar um link"
      />
      <CommandList>
        {/* Com texto digitado sempre existe a opção "Buscar no YouTube", então não há lista vazia. */}
        {!search.trim() && <CommandEmpty>Nada encontrado.</CommandEmpty>}

        {search.trim() && !looksLikeLink && (
          <CommandGroup heading="YouTube" forceMount>
            <CommandItem
              forceMount
              value={`__yt-search ${search}`}
              onSelect={() => run(() => router.push(`/search?q=${encodeURIComponent(search.trim())}`))}
            >
              <Search className="text-primary" />
              Buscar “{search.trim()}” no YouTube
              <CommandShortcut>↵</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        )}

        {looksLikeLink && (
          <CommandGroup heading="Link detectado" forceMount>
            <CommandItem
              forceMount
              value={`__play-link ${search}`}
              onSelect={() =>
                run(() => {
                  addVideosToLibrary(pastedIds);
                  playList(pastedIds, 0, { type: "custom", label: "Adicionado agora" });
                })
              }
            >
              <Play className="text-primary" />
              Adicionar e tocar {pluralize(pastedIds.length, "vídeo", "vídeos")}
              <CommandShortcut>↵</CommandShortcut>
            </CommandItem>
            <CommandItem
              forceMount
              value={`__open-add ${search}`}
              onSelect={() => run(() => ui.openAddDialog({ initialValue: search }))}
            >
              <Plus /> Mais opções (favoritar, playlist)…
            </CommandItem>
          </CommandGroup>
        )}

        <CommandGroup heading="Ações">
          <CommandItem value="adicionar video novo link" onSelect={() => run(() => ui.openAddDialog())}>
            <Plus /> Adicionar vídeo
            <CommandShortcut>A</CommandShortcut>
          </CommandItem>
          <CommandItem value="nova playlist criar" onSelect={() => run(() => ui.openPlaylistDialog())}>
            <ListPlus /> Nova playlist
          </CommandItem>
          <CommandItem value="novo curso criar importar playlist aulas" onSelect={() => run(() => ui.openCourseDialog())}>
            <GraduationCap /> Novo curso
          </CommandItem>
          {hasQueue && (
            <CommandItem value="tocar pausar play pause" onSelect={() => run(() => usePlayer.getState().togglePlay())}>
              {status === "playing" ? <Pause /> : <Play />}
              {status === "playing" ? "Pausar" : "Tocar"}
              <CommandShortcut>Espaço</CommandShortcut>
            </CommandItem>
          )}
          {hasQueue && (
            <CommandItem value="tocando agora tela cheia expandir" onSelect={() => run(() => usePlayer.getState().setExpanded(true))}>
              <Maximize2 /> Abrir “Tocando agora”
              <CommandShortcut>E</CommandShortcut>
            </CommandItem>
          )}
          {allVideos.length > 0 && (
            <CommandItem
              value="tocar tudo aleatorio shuffle biblioteca"
              onSelect={() =>
                run(() => playList(allVideos.map((v) => v.id), 0, { type: "library", label: "Biblioteca" }, true))
              }
            >
              <Shuffle /> Tocar biblioteca no aleatório
            </CommandItem>
          )}
          {favorites.length > 0 && (
            <CommandItem
              value="tocar favoritos"
              onSelect={() => run(() => playList(favorites, 0, { type: "favorites", label: "Favoritos" }))}
            >
              <Heart /> Tocar favoritos
            </CommandItem>
          )}
          {timerPhase === "idle" ? (
            <CommandItem
              value="comecar foco pomodoro timer concentracao"
              onSelect={() =>
                run(() => {
                  unlockAudio();
                  useTimer.getState().startFocus();
                })
              }
            >
              <Brain /> Começar foco (Pomodoro)
            </CommandItem>
          ) : (
            <CommandItem value="encerrar parar timer foco pomodoro" onSelect={() => run(() => useTimer.getState().stop())}>
              <Square /> Encerrar o timer de foco
            </CommandItem>
          )}
          {hasQueue && (
            <CommandItem
              value="desligar parar musica 30 minutos sleep timer dormir"
              onSelect={() =>
                run(() => {
                  usePlayer.getState().setStopAfterCurrent(false);
                  useTimer.getState().setSleep(30);
                })
              }
            >
              <Moon /> Parar a música em 30 min
            </CommandItem>
          )}
          <CommandItem
            value="tema claro escuro dark light"
            onSelect={() => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}
          >
            {resolvedTheme === "dark" ? <Sun /> : <Moon />}
            Mudar para tema {resolvedTheme === "dark" ? "claro" : "escuro"}
          </CommandItem>
          <CommandItem value="configuracoes ajustes settings" onSelect={() => run(() => ui.setSettingsOpen(true))}>
            <Settings /> Configurações
          </CommandItem>
          <CommandItem value="exportar backup download" onSelect={() => run(downloadBackup)}>
            <Download /> Exportar backup
          </CommandItem>
          <CommandItem value="atalhos teclado shortcuts" onSelect={() => run(() => ui.setShortcutsOpen(true))}>
            <Keyboard /> Atalhos de teclado
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        {search.trim().length > 0 && (
          <CommandGroup heading="Cor de destaque">
            {ACCENTS.map((a) => (
              <CommandItem
                key={a.id}
                value={`cor destaque tema accent ${a.label}`}
                onSelect={() => run(() => useSettings.getState().setAccent(a.id))}
              >
                <Palette />
                <span className="size-3.5 rounded-full" style={{ backgroundImage: accentGradient(a) }} />
                Cor {a.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Ir para">
          <CommandItem value="inicio home" onSelect={() => run(() => router.push("/"))}>
            <House /> Início
          </CommandItem>
          <CommandItem value="buscar youtube pesquisar" onSelect={() => run(() => router.push("/search"))}>
            <Search /> Buscar no YouTube
          </CommandItem>
          <CommandItem value="biblioteca todos videos" onSelect={() => run(() => router.push("/library"))}>
            <Library /> Biblioteca
          </CommandItem>
          <CommandItem value="favoritos curtidos" onSelect={() => run(() => router.push("/favorites"))}>
            <Heart /> Favoritos
          </CommandItem>
          <CommandItem value="playlists todas" onSelect={() => run(() => router.push("/playlists"))}>
            <ListMusic /> Playlists
          </CommandItem>
          <CommandItem value="cursos aprender aulas" onSelect={() => run(() => router.push("/courses"))}>
            <GraduationCap /> Cursos
          </CommandItem>
        </CommandGroup>

        {courses.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Cursos">
              {courses.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`curso ${c.title} ${c.author ?? ""} ${c.id}`}
                  onSelect={() => run(() => router.push(`/courses/${c.id}`))}
                >
                  <GraduationCap />
                  <span className="truncate">{c.title}</span>
                  <CommandShortcut className="tracking-normal">
                    {pluralize(c.sections.reduce((n, s) => n + s.lessons.length, 0), "aula", "aulas")}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {playlists.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Playlists">
              {playlists.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`playlist ${p.name} ${p.id}`}
                  onSelect={() => run(() => router.push(`/playlists/${p.id}`))}
                >
                  <PlaylistCover seed={p.id} videoIds={p.videoIds} className="size-8 rounded" iconClassName="size-4" />
                  <span className="truncate">{p.name}</span>
                  <CommandShortcut className="tracking-normal">{pluralize(p.videoIds.length, "vídeo", "vídeos")}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {allVideos.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Vídeos">
              {allVideos.map((v) => (
                <CommandItem
                  key={v.id}
                  value={`video ${v.title} ${v.author ?? ""} ${v.id}`}
                  onSelect={() => run(() => usePlayer.getState().playVideo(v.id))}
                >
                  <VideoThumbnail id={v.id} quality="default" className="aspect-video w-12 shrink-0 rounded" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{v.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{v.author ?? "Canal desconhecido"}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </>
  );
}
