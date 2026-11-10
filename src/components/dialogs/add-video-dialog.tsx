"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ListMusic, Loader2, Play, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { VideoThumbnail } from "@/components/video/video-thumbnail";
import { addVideosToLibrary, playList } from "@/lib/actions";
import { pluralize } from "@/lib/utils";
import { fetchVideoMetadata, parseManyVideoIds, type VideoMetadata } from "@/lib/youtube";
import { isInLibrary, useLibrary } from "@/stores/library-store";
import { useUi } from "@/stores/ui-store";

/** Algumas rádios 24/7 para começar (transmissões ao vivo do canal Lofi Girl). */
export const STARTER_VIDEOS = [
  { id: "jfKfPfyJRdk", label: "Lofi hip hop" },
  { id: "4xDzrJKXOOY", label: "Synthwave" },
];

export function AddVideoDialog() {
  const { open, initialValue, playlistId } = useUi((s) => s.addDialog);
  const closeAddDialog = useUi((s) => s.closeAddDialog);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeAddDialog()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        {open && (
          <AddVideoForm
            key={initialValue ?? "empty"}
            initialValue={initialValue ?? ""}
            initialPlaylistId={playlistId}
            onDone={closeAddDialog}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddVideoForm({
  initialValue,
  initialPlaylistId,
  onDone,
}: {
  initialValue: string;
  initialPlaylistId?: string;
  onDone: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [favorite, setFavorite] = useState(false);
  const [playlistId, setPlaylistId] = useState<string | undefined>(initialPlaylistId);
  const playlists = useLibrary((s) => s.playlists);
  const videos = useLibrary((s) => s.videos);
  const openPlaylistDialog = useUi((s) => s.openPlaylistDialog);
  const router = useRouter();

  const ids = useMemo(() => parseManyVideoIds(value), [value]);
  const playlist = playlists.find((p) => p.id === playlistId);
  const hasText = value.trim().length > 0;

  const submit = (play: boolean) => {
    if (!ids.length) return;
    const created = addVideosToLibrary(ids);
    const library = useLibrary.getState();
    if (favorite) ids.forEach((id) => library.setFavorite(id, true));
    let addedToPlaylist = 0;
    if (playlist) addedToPlaylist = library.addToPlaylist(playlist.id, ids);

    const parts = [
      created > 0
        ? `${pluralize(created, "vídeo novo", "vídeos novos")} na biblioteca`
        : ids.length === 1
          ? "Esse vídeo já estava na biblioteca"
          : "Esses vídeos já estavam na biblioteca",
    ];
    if (playlist && addedToPlaylist) parts.push(`+${addedToPlaylist} em “${playlist.name}”`);
    toast.success(parts.join(" · "));

    if (play) playList(ids, 0, { type: "custom", label: ids.length > 1 ? "Vídeos adicionados" : "Adicionado agora" });
    onDone();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(true);
      }}
    >
      <DialogHeader className="px-6 pt-6 pb-4">
        <DialogTitle>Adicionar vídeos</DialogTitle>
        <DialogDescription>Cole um link do YouTube, um ID ou vários links de uma vez (um por linha).</DialogDescription>
      </DialogHeader>

      <div className="flex max-h-[min(60vh,560px)] flex-col gap-3 overflow-y-auto scrollbar-thin px-6 pt-1 pb-5">
        <Textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(!e.altKey);
            }
          }}
          placeholder={"https://www.youtube.com/watch?v=jfKfPfyJRdk\nhttps://youtu.be/…"}
          className="max-h-40 min-h-20 resize-none font-mono text-sm"
        />

        {hasText && ids.length === 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 py-2 pr-2 pl-3 text-[13px]">
            <span className="text-muted-foreground">Isso não é um link. Buscar no YouTube?</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                router.push(`/search?q=${encodeURIComponent(value.trim())}`);
                onDone();
              }}
            >
              <Search /> Buscar “{value.trim().slice(0, 30)}”
            </Button>
          </div>
        )}

        {!hasText && (
          <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
            <span className="mr-0.5">Sugestões:</span>
            {STARTER_VIDEOS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setValue(`https://www.youtube.com/watch?v=${s.id}`)}
                className="cursor-pointer rounded-md border px-2 py-0.5 text-xs transition-colors hover:bg-accent hover:text-foreground"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {ids.length > 0 && (
          <ul className="flex flex-col gap-2">
            {ids.map((id) => (
              <PreviewItem key={id} id={id} inLibrary={isInLibrary(videos[id])} />
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Label className="cursor-pointer gap-2.5 font-normal">
            <Switch checked={favorite} onCheckedChange={setFavorite} />
            Adicionar aos favoritos
          </Label>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="justify-between gap-2 sm:max-w-60">
                <ListMusic className="text-muted-foreground" />
                <span className="truncate">{playlist ? playlist.name : "Sem playlist"}</span>
                <ChevronDown className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem onSelect={() => setPlaylistId(undefined)}>
                <span className="flex-1">Sem playlist</span>
                {!playlist && <Check />}
              </DropdownMenuItem>
              {playlists.length > 0 && <DropdownMenuSeparator />}
              {playlists.map((p) => (
                <DropdownMenuItem key={p.id} onSelect={() => setPlaylistId(p.id)}>
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.id === playlistId && <Check />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  // Cria a playlist já com os vídeos colados.
                  if (ids.length) {
                    addVideosToLibrary(ids);
                    openPlaylistDialog({ videoIds: ids });
                    onDone();
                  } else {
                    openPlaylistDialog();
                  }
                }}
              >
                <Plus /> Nova playlist…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col-reverse items-stretch gap-2 border-t px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <Kbd>Enter</Kbd> tocar · <Kbd>Alt</Kbd>+<Kbd>Enter</Kbd> só adicionar
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={!ids.length} onClick={() => submit(false)} className="flex-1 sm:flex-none">
            <Plus /> Adicionar
          </Button>
          <Button type="submit" disabled={!ids.length} className="flex-1 sm:flex-none">
            <Play className="fill-current" /> Adicionar e tocar
          </Button>
        </div>
      </div>
    </form>
  );
}

function PreviewItem({ id, inLibrary }: { id: string; inLibrary: boolean }) {
  const known = useLibrary((s) => s.videos[id]);
  const [meta, setMeta] = useState<VideoMetadata | null | undefined>(undefined);

  useEffect(() => {
    if (known && known.titleSource !== "pending") return;
    let cancelled = false;
    fetchVideoMetadata(id).then((m) => !cancelled && setMeta(m));
    return () => {
      cancelled = true;
    };
  }, [id, known]);

  const title = known && known.titleSource !== "pending" ? known.title : meta?.title;
  const author = known?.author ?? meta?.author;
  const loading = !title && meta === undefined;

  return (
    <li className="flex items-center gap-3 rounded-lg border p-2 animate-in fade-in slide-in-from-bottom-1">
      <VideoThumbnail id={id} className="aspect-video w-20 shrink-0 rounded-[5px]" />
      <div className="min-w-0 flex-1">
        {loading ? (
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ) : (
          <>
            <p className="line-clamp-2 text-[13px] leading-snug font-medium">{title ?? "Título será carregado ao tocar"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {author ?? <span className="font-mono">{id}</span>}
            </p>
          </>
        )}
      </div>
      {inLibrary ? (
        <Badge variant="secondary" className="shrink-0">
          <Check /> Na biblioteca
        </Badge>
      ) : loading ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
      ) : null}
    </li>
  );
}
