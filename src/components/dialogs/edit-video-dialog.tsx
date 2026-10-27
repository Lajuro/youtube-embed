"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
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
import { VideoThumbnail } from "@/components/video/video-thumbnail";
import { fetchVideoMetadata } from "@/lib/youtube";
import { useLibrary } from "@/stores/library-store";
import { useUi } from "@/stores/ui-store";

export function EditVideoDialog() {
  const videoId = useUi((s) => s.editVideoId);
  const setEditVideoId = useUi((s) => s.setEditVideoId);

  return (
    <Dialog open={Boolean(videoId)} onOpenChange={(o) => !o && setEditVideoId(null)}>
      <DialogContent className="sm:max-w-md">
        {videoId && <EditVideoForm key={videoId} videoId={videoId} onDone={() => setEditVideoId(null)} />}
      </DialogContent>
    </Dialog>
  );
}

function EditVideoForm({ videoId, onDone }: { videoId: string; onDone: () => void }) {
  const video = useLibrary((s) => s.videos[videoId]);
  const [title, setTitle] = useState(video?.title ?? "");
  const [author, setAuthor] = useState(video?.author ?? "");
  const [restoring, setRestoring] = useState(false);

  if (!video) return null;

  const restore = async () => {
    setRestoring(true);
    const meta = await fetchVideoMetadata(videoId);
    setRestoring(false);
    if (meta) {
      setTitle(meta.title);
      setAuthor(meta.author ?? "");
    } else {
      toast.error("Não consegui buscar o título original agora", {
        description: "Ele também é atualizado automaticamente quando o vídeo toca.",
      });
    }
  };

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        useLibrary.getState().updateVideo(videoId, {
          title: title.trim() || video.title,
          author: author.trim() || undefined,
          titleSource: "manual",
        });
        toast.success("Vídeo atualizado");
        onDone();
      }}
    >
      <DialogHeader>
        <DialogTitle>Editar vídeo</DialogTitle>
        <DialogDescription>Personalize como ele aparece nas suas listas.</DialogDescription>
      </DialogHeader>
      <VideoThumbnail id={videoId} quality="hqdefault" className="aspect-video w-full rounded-xl" />
      <div className="grid gap-1.5">
        <Label htmlFor="video-title">Título</Label>
        <Input id="video-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="video-author">Canal / artista</Label>
        <Input id="video-author" value={author} onChange={(e) => setAuthor(e.target.value)} />
      </div>
      <DialogFooter className="sm:justify-between">
        <Button type="button" variant="ghost" onClick={restore} disabled={restoring}>
          <RotateCcw className={restoring ? "animate-spin" : undefined} /> Restaurar original
        </Button>
        <Button type="submit" variant="brand">
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}
