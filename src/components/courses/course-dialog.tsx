"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, GraduationCap, Link2, ListVideo, Loader2 } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { hydrateMetadata } from "@/lib/actions";
import { addLessonsToSection, saveLessonVideoInfo } from "@/lib/courses";
import { cn, pluralize } from "@/lib/utils";
import { parseManyVideoIds } from "@/lib/youtube";
import { importPlaylist, parsePlaylistId } from "@/lib/youtube-prober";
import { useLibrary } from "@/stores/library-store";
import { useUi } from "@/stores/ui-store";

type Origin = "playlist" | "links" | "blank";

const ORIGINS: { value: Origin; icon: typeof ListVideo; title: string; description: string }[] = [
  { value: "playlist", icon: ListVideo, title: "Playlist do YouTube", description: "Importa todos os vídeos de uma vez" },
  { value: "links", icon: Link2, title: "Links de vídeos", description: "Cole um link por linha" },
  { value: "blank", icon: FileText, title: "Em branco", description: "Monte as seções depois" },
];

export function CourseDialog() {
  const { open, courseId } = useUi((s) => s.courseDialog);
  const close = useUi((s) => s.closeCourseDialog);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        {open && <CourseForm key={courseId ?? "new"} courseId={courseId} onDone={close} />}
      </DialogContent>
    </Dialog>
  );
}

function CourseForm({ courseId, onDone }: { courseId?: string; onDone: () => void }) {
  const router = useRouter();
  const existing = useLibrary((s) => s.courses.find((c) => c.id === courseId));
  const [title, setTitle] = useState(existing?.title ?? "");
  const [author, setAuthor] = useState(existing?.author ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [origin, setOrigin] = useState<Origin>("playlist");
  const [source, setSource] = useState("");
  const [importing, setImporting] = useState<{ total: number; done: number } | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(existing);
  const linkIds = useMemo(() => (origin === "links" ? parseManyVideoIds(source) : []), [origin, source]);
  const playlistId = origin === "playlist" ? parsePlaylistId(source) : null;
  const canSubmit =
    title.trim().length > 0 &&
    (isEdit || origin === "blank" || (origin === "links" && linkIds.length > 0) || (origin === "playlist" && playlistId));

  const input = { title, author, description };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || reading) return;
    const library = useLibrary.getState();

    if (existing) {
      library.updateCourse(existing.id, input);
      toast.success("Curso atualizado");
      onDone();
      return;
    }

    if (origin === "blank") {
      const id = library.createCourse(input);
      toast.success("Curso criado", { description: "Agora adicione seções e aulas." });
      router.push(`/courses/${id}/edit`);
      onDone();
      return;
    }

    if (origin === "links") {
      const id = library.createCourse(input);
      const sectionId = useLibrary.getState().courses.find((c) => c.id === id)!.sections[0].id;
      addLessonsToSection(id, sectionId, linkIds);
      toast.success(`Curso criado com ${pluralize(linkIds.length, "aula", "aulas")}`);
      router.push(`/courses/${id}`);
      onDone();
      return;
    }

    // Playlist: lê a lista pelo player escondido; o curso só é criado se der certo.
    setError(null);
    setReading(true);
    let createdId: string | null = null;
    try {
      const ids = await importPlaylist(playlistId!, {
        onIds: (found) => {
          createdId = library.createCourse(input);
          const sectionId = useLibrary.getState().courses.find((c) => c.id === createdId)!.sections[0].id;
          useLibrary.getState().addLessons(createdId, sectionId, found);
          setImporting({ total: found.length, done: 0 });
          router.push(`/courses/${createdId}`);
        },
        onTitle: (info, done, total) => {
          saveLessonVideoInfo(info);
          setImporting({ total, done });
        },
      });
      // Os que o player não informou ainda tentam pelos outros caminhos.
      for (const id of ids) hydrateMetadata(id);
      toast.success(`Playlist importada: ${pluralize(ids.length, "aula", "aulas")}`, {
        description: "Dica: em “Editar conteúdo” você divide as aulas em seções.",
      });
      onDone();
    } catch (err) {
      if (!createdId) setError((err as Error).message);
    } finally {
      setReading(false);
    }
  };

  if (importing) {
    const pct = importing.total ? (importing.done / importing.total) * 100 : 0;
    return (
      <div className="grid gap-5">
        <DialogHeader>
          <DialogTitle>Importando a playlist…</DialogTitle>
          <DialogDescription>
            {pluralize(importing.total, "aula encontrada", "aulas encontradas")}. Agora estou buscando o título de cada
            vídeo — pode fechar esta janela, continua em segundo plano.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Progress value={pct} />
          <p className="text-sm text-muted-foreground tabular-nums">
            {importing.done} de {importing.total} títulos
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onDone}>
            Fechar
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <DialogHeader>
        <div className="mb-1 grid size-10 place-items-center rounded-xl bg-brand-gradient text-white shadow-lg">
          <GraduationCap className="size-5" />
        </div>
        <DialogTitle>{isEdit ? "Editar curso" : "Novo curso"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Mude o nome, o instrutor ou a descrição."
            : "Organize vídeos do YouTube em seções e aulas, com progresso e anotações — estilo Udemy."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="course-title">Nome do curso</Label>
          <Input
            id="course-title"
            autoFocus
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Devin — do zero ao avançado"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="course-author">Instrutor ou canal (opcional)</Label>
          <Input id="course-author" value={author} maxLength={80} onChange={(e) => setAuthor(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="course-description">Descrição (opcional)</Label>
          <Textarea
            id="course-description"
            value={description}
            maxLength={600}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="O que você vai aprender?"
            className="min-h-16 resize-none"
          />
        </div>
      </div>

      {!isEdit && (
        <div className="grid gap-3">
          <Label>Começar a partir de</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {ORIGINS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  setOrigin(o.value);
                  setError(null);
                }}
                aria-pressed={origin === o.value}
                className={cn(
                  "flex cursor-pointer flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all hover:bg-accent/50",
                  origin === o.value && "border-primary bg-primary/5 ring-1 ring-primary"
                )}
              >
                <o.icon className={cn("size-4", origin === o.value ? "text-primary" : "text-muted-foreground")} />
                <span className="text-sm font-medium">{o.title}</span>
                <span className="text-xs text-muted-foreground">{o.description}</span>
              </button>
            ))}
          </div>

          {origin === "playlist" && (
            <div className="grid gap-1.5">
              <Input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="https://www.youtube.com/playlist?list=PL…"
                aria-label="Link da playlist do YouTube"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {source && !playlistId
                  ? "Não achei o código da playlist (o trecho “list=…” do link)."
                  : "Funciona com o link da playlist ou de um vídeo dentro dela. A playlist precisa ser pública ou não listada."}
              </p>
            </div>
          )}

          {origin === "links" && (
            <div className="grid gap-1.5">
              <Textarea
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder={"https://www.youtube.com/watch?v=…\nhttps://youtu.be/…"}
                aria-label="Links dos vídeos"
                className="max-h-40 min-h-20 resize-none font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {linkIds.length
                  ? `${pluralize(linkIds.length, "vídeo encontrado", "vídeos encontrados")} — viram aulas na ordem em que aparecem.`
                  : "Um link por linha. Dá para colar links copiados do Google."}
              </p>
            </div>
          )}

          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" variant="brand" disabled={!canSubmit || reading}>
          {reading && <Loader2 className="animate-spin" />}
          {isEdit ? "Salvar" : reading ? "Lendo a playlist…" : "Criar curso"}
        </Button>
      </DialogFooter>
    </form>
  );
}
