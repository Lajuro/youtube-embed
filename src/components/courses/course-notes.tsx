"use client";

import { useMemo, useState } from "react";
import { NotebookPen, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { lessonTitle, playLesson } from "@/lib/courses";
import { cn, formatTime } from "@/lib/utils";
import { useLibrary, type Course, type Lesson, type LessonNote } from "@/stores/library-store";
import { usePlayer } from "@/stores/player-store";

interface CourseNotesProps {
  course: Course;
  /** Aula tocando agora neste curso (null se o player estiver em outra coisa). */
  currentLesson: Lesson | null;
}

export function CourseNotes({ course, currentLesson }: CourseNotesProps) {
  const notes = useLibrary((s) => s.notes);
  const videos = useLibrary((s) => s.videos);
  const currentTime = usePlayer((s) => s.currentTime);
  const [scope, setScope] = useState<"lesson" | "all">("all");
  const [draft, setDraft] = useState<{ time: number; text: string; resume: boolean } | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);

  // Ordem e rótulo de cada aula ("Seção 2 · Aula 5").
  const lessonInfo = useMemo(() => {
    const map = new Map<string, { order: number; label: string; lesson: Lesson }>();
    let n = 0;
    course.sections.forEach((section, si) =>
      section.lessons.forEach((lesson) => {
        n++;
        map.set(lesson.id, { order: n, label: `Seção ${si + 1} · Aula ${n}`, lesson });
      })
    );
    return map;
  }, [course]);

  const list = notes
    .filter((n) => n.courseId === course.id && lessonInfo.has(n.lessonId))
    .filter((n) => scope === "all" || n.lessonId === currentLesson?.id)
    .sort((a, b) => lessonInfo.get(a.lessonId)!.order - lessonInfo.get(b.lessonId)!.order || a.time - b.time);

  const startDraft = () => {
    const player = usePlayer.getState();
    const wasPlaying = player.status === "playing" || player.status === "buffering";
    if (wasPlaying) player.togglePlay();
    setDraft({ time: Math.floor(player.currentTime), text: "", resume: wasPlaying });
  };

  const finishDraft = (save: boolean) => {
    if (!draft) return;
    if (save && draft.text.trim() && currentLesson) {
      useLibrary.getState().addNote({
        courseId: course.id,
        lessonId: currentLesson.id,
        time: draft.time,
        text: draft.text.trim(),
      });
      toast.success("Anotação salva");
    }
    if (draft.resume && usePlayer.getState().status !== "playing") usePlayer.getState().togglePlay();
    setDraft(null);
  };

  const jumpTo = (note: LessonNote) => {
    if (currentLesson?.id === note.lessonId) usePlayer.getState().seek(note.time);
    else playLesson(course.id, note.lessonId, note.time);
  };

  return (
    <div className="grid gap-4">
      {draft ? (
        <div className="grid gap-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span className="rounded-md bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground tabular-nums">
              {formatTime(draft.time)}
            </span>
            Nova anotação
          </p>
          <Textarea
            autoFocus
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) finishDraft(true);
              if (e.key === "Escape") finishDraft(false);
            }}
            placeholder="O que vale lembrar deste momento? (Ctrl+Enter salva)"
            className="min-h-24 resize-none bg-background"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => finishDraft(false)}>
              Cancelar
            </Button>
            <Button size="sm" variant="brand" disabled={!draft.text.trim()} onClick={() => finishDraft(true)}>
              Salvar anotação
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={!currentLesson}
          onClick={startDraft}
          className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex items-center gap-2">
            <Plus className="size-4" />
            {currentLesson ? (
              <>
                Criar uma anotação em <strong className="text-foreground tabular-nums">{formatTime(currentTime)}</strong>
              </>
            ) : (
              "Comece uma aula para criar anotações"
            )}
          </span>
          <NotebookPen className="size-4" />
        </button>
      )}

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Suas anotações</h3>
        <div className="flex rounded-full border p-0.5 text-xs">
          {(
            [
              ["all", "Todas as aulas"],
              ["lesson", "Aula atual"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setScope(value)}
              className={cn(
                "cursor-pointer rounded-full px-2.5 py-1 transition-colors",
                scope === value ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {scope === "lesson" ? "Nenhuma anotação nesta aula." : "Nenhuma anotação ainda."}
        </p>
      ) : (
        <ul className="grid gap-3">
          {list.map((note) => {
            const info = lessonInfo.get(note.lessonId)!;
            const isEditing = editing?.id === note.id;
            return (
              <li key={note.id} className="group/note rounded-xl border bg-card/50 p-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => jumpTo(note)}
                    title="Ir para este momento"
                    className="shrink-0 cursor-pointer rounded-md bg-foreground px-1.5 py-0.5 text-xs font-semibold text-background tabular-nums transition-transform hover:scale-105"
                  >
                    {formatTime(note.time)}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-muted-foreground">
                      {info.label}: {lessonTitle(info.lesson, videos)}
                    </p>
                    {isEditing ? (
                      <div className="mt-2 grid gap-2">
                        <Textarea
                          autoFocus
                          value={editing.text}
                          onChange={(e) => setEditing({ id: note.id, text: e.target.value })}
                          className="min-h-20 resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            disabled={!editing.text.trim()}
                            onClick={() => {
                              useLibrary.getState().updateNote(note.id, editing.text.trim());
                              setEditing(null);
                            }}
                          >
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm whitespace-pre-wrap">{note.text}</p>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover/note:opacity-100 focus-within:opacity-100">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label="Editar anotação"
                        onClick={() => setEditing({ id: note.id, text: note.text })}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label="Excluir anotação"
                        onClick={() => {
                          useLibrary.getState().deleteNote(note.id);
                          toast("Anotação excluída", {
                            action: {
                              label: "Desfazer",
                              onClick: () => useLibrary.setState((s) => ({ notes: [...s.notes, note] })),
                            },
                          });
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
