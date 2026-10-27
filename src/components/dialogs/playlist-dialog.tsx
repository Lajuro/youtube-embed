"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlaylistCover } from "@/components/playlist/playlist-cover";
import { pluralize } from "@/lib/utils";
import { useLibrary } from "@/stores/library-store";
import { useUi } from "@/stores/ui-store";

export function PlaylistDialog() {
  const { open, playlistId, videoIds } = useUi((s) => s.playlistDialog);
  const close = useUi((s) => s.closePlaylistDialog);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        {open && <PlaylistForm key={playlistId ?? "new"} playlistId={playlistId} videoIds={videoIds} onDone={close} />}
      </DialogContent>
    </Dialog>
  );
}

function PlaylistForm({
  playlistId,
  videoIds = [],
  onDone,
}: {
  playlistId?: string;
  videoIds?: string[];
  onDone: () => void;
}) {
  const router = useRouter();
  const existing = useLibrary((s) => s.playlists.find((p) => p.id === playlistId));
  const count = useLibrary((s) => s.playlists.length);
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");

  const isEdit = Boolean(existing);
  const coverIds = existing?.videoIds ?? videoIds;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const library = useLibrary.getState();
    if (existing) {
      library.updatePlaylist(existing.id, { name, description });
      toast.success("Playlist atualizada");
    } else {
      const finalName = name.trim() || `Minha playlist nº ${count + 1}`;
      const id = library.createPlaylist(finalName, description, videoIds);
      toast.success(`Playlist “${finalName}” criada`, {
        description: videoIds.length ? pluralize(videoIds.length, "vídeo adicionado", "vídeos adicionados") : undefined,
        action: { label: "Abrir", onClick: () => router.push(`/playlists/${id}`) },
      });
      if (!videoIds.length) router.push(`/playlists/${id}`);
    }
    onDone();
  };

  return (
    <form onSubmit={submit} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Editar playlist" : "Nova playlist"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Mude o nome ou a descrição."
            : videoIds.length
              ? `A playlist já vai nascer com ${pluralize(videoIds.length, "vídeo", "vídeos")}.`
              : "Dê um nome para organizar seus vídeos."}
        </DialogDescription>
      </DialogHeader>

      <div className="flex gap-4">
        <PlaylistCover
          seed={existing?.id ?? name ?? "nova"}
          videoIds={coverIds}
          className="size-28 shrink-0 rounded-xl shadow-lg"
        />
        <div className="grid flex-1 content-start gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="playlist-name">Nome</Label>
            <Input
              id="playlist-name"
              autoFocus
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Foco profundo"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="playlist-description">Descrição (opcional)</Label>
        <Textarea
          id="playlist-description"
          value={description}
          maxLength={300}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Para que serve essa playlist?"
          className="min-h-20 resize-none"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" variant="brand">
          {isEdit ? "Salvar" : "Criar playlist"}
        </Button>
      </DialogFooter>
    </form>
  );
}
