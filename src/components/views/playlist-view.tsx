"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Library,
  Link2,
  ListMusic,
  ListPlus,
  MoreHorizontal,
  Pencil,
  SearchX,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CollectionPlayButtons } from "@/components/collection-actions";
import { EmptyState } from "@/components/empty-state";
import { HydrationGate } from "@/components/hydration-gate";
import { MetaDot, PageHeader } from "@/components/page-header";
import { PlaylistCover } from "@/components/playlist/playlist-cover";
import { CollectionToolbar, useFilteredIds, type SortKey } from "@/components/video/collection-toolbar";
import { VideoList } from "@/components/video/video-list";
import { VideoThumbnail } from "@/components/video/video-thumbnail";
import { addToQueue, addToPlaylist } from "@/lib/actions";
import { cn, formatRelative, formatTotalDuration, pluralize } from "@/lib/utils";
import { sortByAddedDesc, useLibrary } from "@/stores/library-store";
import { usePlayer } from "@/stores/player-store";
import { useUi } from "@/stores/ui-store";

export function PlaylistView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <HydrationGate>
      <PlaylistContent id={id} />
    </HydrationGate>
  );
}

function PlaylistContent({ id }: { id: string }) {
  const router = useRouter();
  const playlist = useLibrary((s) => s.playlists.find((p) => p.id === id));
  const videos = useLibrary((s) => s.videos);
  const reorderPlaylist = useLibrary((s) => s.reorderPlaylist);
  const { openAddDialog, openPlaylistDialog } = useUi.getState();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("custom");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const allIds = useMemo(() => playlist?.videoIds.filter((v) => videos[v]) ?? [], [playlist, videos]);
  const ids = useFilteredIds(allIds, videos, query, sort);

  if (!playlist) {
    return (
      <div className="px-4 py-10 md:px-8">
        <EmptyState
          icon={ListMusic}
          title="Playlist não encontrada"
          description="Ela pode ter sido apagada, ou foi criada em outro navegador."
        >
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/playlists">Ver todas as playlists</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  const total = allIds.reduce((sum, v) => sum + (videos[v]?.duration ?? 0), 0);
  const source = { type: "playlist" as const, id: playlist.id, label: playlist.name };
  const canReorder = sort === "custom" && !query;

  return (
    <div className="pb-16">
      <PageHeader
        eyebrow="Playlist"
        title={playlist.name}
        backdropVideoId={allIds[0]}
        cover={
          <PlaylistCover
            seed={playlist.id}
            videoIds={allIds}
            className="size-40 rounded-2xl shadow-2xl shadow-black/40 md:size-52"
          />
        }
        description={playlist.description}
        meta={
          <>
            <span className="font-medium text-foreground">{pluralize(allIds.length, "vídeo", "vídeos")}</span>
            {total > 0 && (
              <>
                <MetaDot /> {formatTotalDuration(total)}
              </>
            )}
            <MetaDot />
            <span>atualizada {formatRelative(playlist.updatedAt)}</span>
          </>
        }
        actions={
          <>
            <CollectionPlayButtons ids={ids} source={source} />
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full">
                  <ListPlus /> Adicionar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <DropdownMenuItem onSelect={() => openAddDialog({ playlistId: playlist.id })}>
                  <Link2 /> Colar links do YouTube
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPickerOpen(true)}>
                  <Library /> Escolher da biblioteca
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Mais opções">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onSelect={() => openPlaylistDialog({ playlistId: playlist.id })}>
                  <Pencil /> Editar detalhes
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!allIds.length} onSelect={() => addToQueue(allIds)}>
                  <ListPlus /> Adicionar tudo à fila
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    const newId = useLibrary.getState().duplicatePlaylist(playlist.id);
                    if (newId) {
                      toast.success("Playlist duplicada");
                      router.push(`/playlists/${newId}`);
                    }
                  }}
                >
                  <Copy /> Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                  <Trash2 /> Excluir playlist
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {allIds.length > 0 && (
              <CollectionToolbar
                className="ml-auto"
                query={query}
                onQueryChange={setQuery}
                sort={sort}
                onSortChange={setSort}
                sortOptions={["custom", "added", "title", "plays", "duration"]}
              />
            )}
          </>
        }
      />

      <div className="px-2 md:px-6">
        {allIds.length === 0 ? (
          <EmptyState
            icon={ListMusic}
            title="Essa playlist está vazia"
            description="Cole links do YouTube ou escolha vídeos que já estão na sua biblioteca."
            className="mx-2"
          >
            <Button variant="brand" className="rounded-full" onClick={() => openAddDialog({ playlistId: playlist.id })}>
              <Link2 /> Colar links
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => setPickerOpen(true)}>
              <Library /> Escolher da biblioteca
            </Button>
          </EmptyState>
        ) : ids.length === 0 ? (
          <EmptyState icon={SearchX} title="Nada encontrado" description={`Nenhum vídeo corresponde a “${query}”.`} className="mx-2" />
        ) : (
          <>
            <VideoList
              ids={ids}
              source={source}
              playlistId={playlist.id}
              onReorder={canReorder ? (from, to) => reorderPlaylist(playlist.id, from, to) : undefined}
            />
            {canReorder && allIds.length > 1 && (
              <p className="mt-4 px-3 text-xs text-muted-foreground">Dica: arraste pela alça ⋮⋮ para reordenar.</p>
            )}
          </>
        )}
      </div>

      <LibraryPicker open={pickerOpen} onOpenChange={setPickerOpen} playlistId={playlist.id} existing={playlist.videoIds} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{playlist.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Os vídeos continuam na sua biblioteca — só a playlist é apagada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const snapshot = playlist;
                useLibrary.getState().deletePlaylist(playlist.id);
                const player = usePlayer.getState();
                if (player.source?.type === "playlist" && player.source.id === playlist.id) {
                  usePlayer.setState({ source: { type: "custom", label: playlist.name } });
                }
                router.push("/playlists");
                toast("Playlist excluída", {
                  action: {
                    label: "Desfazer",
                    onClick: () => useLibrary.setState((s) => ({ playlists: [...s.playlists, snapshot] })),
                  },
                });
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LibraryPicker({
  open,
  onOpenChange,
  playlistId,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlistId: string;
  existing: string[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 p-0 sm:max-w-lg">
        {open && <PickerBody playlistId={playlistId} existing={existing} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function PickerBody({ playlistId, existing, onDone }: { playlistId: string; existing: string[]; onDone: () => void }) {
  const videos = useLibrary((s) => s.videos);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const all = useMemo(() => sortByAddedDesc(videos).map((v) => v.id), [videos]);
  const ids = useFilteredIds(all, videos, query, "added");

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((v) => v !== id) : [...s, id]));

  return (
    <>
      <DialogHeader className="border-b p-5">
        <DialogTitle>Escolher da biblioteca</DialogTitle>
        <DialogDescription>Selecione os vídeos que vão entrar na playlist.</DialogDescription>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrar por título ou canal…"
          className="mt-2 h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:border-primary/60"
        />
      </DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-2">
        {all.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Sua biblioteca ainda está vazia.</p>
        )}
        {ids.map((id) => {
          const inPlaylist = existing.includes(id);
          const checked = inPlaylist || selected.includes(id);
          const v = videos[id];
          return (
            <button
              key={id}
              type="button"
              disabled={inPlaylist}
              onClick={() => toggle(id)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent/60 disabled:cursor-default disabled:opacity-50",
                checked && !inPlaylist && "bg-primary/10"
              )}
            >
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                  checked && "border-primary bg-primary text-primary-foreground"
                )}
              >
                {checked && <Check className="size-3.5" />}
              </span>
              <VideoThumbnail id={id} className="aspect-video w-16 shrink-0 rounded-md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{v.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {inPlaylist ? "Já está na playlist" : (v.author ?? "Canal desconhecido")}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <DialogFooter className="border-t p-4">
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          variant="brand"
          disabled={!selected.length}
          onClick={() => {
            addToPlaylist(playlistId, selected);
            onDone();
          }}
        >
          Adicionar {selected.length > 0 && pluralize(selected.length, "vídeo", "vídeos")}
        </Button>
      </DialogFooter>
    </>
  );
}
