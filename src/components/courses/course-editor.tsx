"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  FolderPlus,
  GraduationCap,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Scissors,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/empty-state";
import { AddLessonsDialog } from "@/components/courses/add-lessons-dialog";
import { CourseCover } from "@/components/courses/course-cover";
import { VideoThumbnail } from "@/components/video/video-thumbnail";
import { lessonTitle, playLesson, sectionStats } from "@/lib/courses";
import { cn, formatTime, formatTotalDuration, pluralize } from "@/lib/utils";
import { courseLessons, useLibrary, type Course, type CourseSection, type Lesson } from "@/stores/library-store";
import { usePlayer } from "@/stores/player-store";
import { useUi } from "@/stores/ui-store";

const restrictToVertical: Modifier = ({ transform }) => ({ ...transform, x: 0 });

export function CourseEditor({ courseId }: { courseId: string }) {
  const course = useLibrary((s) => s.courses.find((c) => c.id === courseId));
  if (!course) {
    return (
      <div className="px-4 py-10 md:px-8">
        <EmptyState icon={GraduationCap} title="Curso não encontrado">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/courses">Ver todos os cursos</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }
  return <Editor course={course} />;
}

function Editor({ course }: { course: Course }) {
  const router = useRouter();
  const videos = useLibrary((s) => s.videos);
  const progress = useLibrary((s) => s.progress);
  const openCourseDialog = useUi((s) => s.openCourseDialog);
  const [addTo, setAddTo] = useState<string | null>(null);
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<CourseSection | null>(null);
  const total = courseLessons(course).length;
  // Numeração contínua das aulas (1, 2, 3… atravessando as seções).
  const offsets = course.sections.reduce<number[]>((acc, s, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + course.sections[i - 1].lessons.length);
    return acc;
  }, []);

  const addSection = () => {
    const id = useLibrary.getState().addSection(course.id, `Seção ${course.sections.length + 1}`);
    setEditSectionId(id);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 pb-20 md:px-8">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <CourseCover course={course} className="w-full shrink-0 rounded-2xl shadow-xl sm:w-56" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Editar curso</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-balance md:text-3xl">{course.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pluralize(course.sections.length, "seção", "seções")} · {pluralize(total, "aula", "aulas")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="brand" className="rounded-full">
              <Link href={`/courses/${course.id}`}>
                <Play className="fill-current" /> Ir para a sala de aula
              </Link>
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => openCourseDialog({ courseId: course.id })}>
              <Pencil /> Detalhes
            </Button>
            <Button variant="ghost" className="rounded-full text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Excluir curso
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Dicas:</strong> arraste as aulas pela alça ⋮⋮ para reordenar. Importou uma
        playlist inteira numa seção só? Use <Scissors className="inline size-3.5" />{" "}
        <em>“Começar nova seção aqui”</em> no menu de uma aula para dividir.
      </div>

      {/* Seções */}
      <div className="mt-6 grid gap-4">
        {course.sections.map((section, index) => (
          <SectionCard
            key={section.id}
            course={course}
            section={section}
            index={index}
            offset={offsets[index]}
            editing={editSectionId === section.id}
            onEditingChange={(v) => setEditSectionId(v ? section.id : null)}
            onAdd={() => setAddTo(section.id)}
            onDelete={() =>
              section.lessons.length ? setSectionToDelete(section) : useLibrary.getState().removeSection(course.id, section.id)
            }
            stats={sectionStats(section, progress, videos)}
          />
        ))}
      </div>

      <Button variant="outline" className="mt-4 w-full rounded-xl border-dashed py-6" onClick={addSection}>
        <FolderPlus /> Nova seção
      </Button>

      <AddLessonsDialog courseId={course.id} sectionId={addTo} onOpenChange={(o) => !o && setAddTo(null)} />

      <AlertDialog open={Boolean(sectionToDelete)} onOpenChange={(o) => !o && setSectionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{sectionToDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {sectionToDelete && pluralize(sectionToDelete.lessons.length, "aula sai", "aulas saem")} do curso, junto com o
              progresso e as anotações delas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (sectionToDelete) useLibrary.getState().removeSection(course.id, sectionToDelete.id);
                toast("Seção excluída");
              }}
            >
              Excluir seção
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o curso “{course.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Seções, aulas, progresso e anotações deste curso serão apagados. Vídeos que também estão na sua biblioteca
              continuam lá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                router.push("/courses");
                const player = usePlayer.getState();
                if (player.source?.type === "course" && player.source.id === course.id) player.stop();
                useLibrary.getState().deleteCourse(course.id);
                toast("Curso excluído");
              }}
            >
              Excluir curso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SectionCard({
  course,
  section,
  index,
  offset,
  editing,
  onEditingChange,
  onAdd,
  onDelete,
  stats,
}: {
  course: Course;
  section: CourseSection;
  index: number;
  offset: number;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onAdd: () => void;
  onDelete: () => void;
  stats: ReturnType<typeof sectionStats>;
}) {
  const library = useLibrary.getState();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const to = section.lessons.findIndex((l) => l.id === over.id);
    if (to !== -1) useLibrary.getState().moveLesson(course.id, String(active.id), section.id, to);
  };

  return (
    <section className="overflow-hidden rounded-2xl border bg-card/60">
      <header className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
        <span className="shrink-0 text-sm font-semibold text-muted-foreground">Seção {index + 1}:</span>
        <EditableText
          value={section.title}
          editing={editing}
          onEditingChange={onEditingChange}
          onSave={(title) => library.renameSection(course.id, section.id, title)}
          className="min-w-0 flex-1 font-semibold"
          ariaLabel="Nome da seção"
        />
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
          {pluralize(stats.total, "aula", "aulas")}
          {stats.duration > 0 && ` · ${formatTotalDuration(stats.duration)}`}
        </span>
        <div className="flex shrink-0 items-center">
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Mover seção para cima"
            disabled={index === 0}
            onClick={() => library.moveSection(course.id, index, index - 1)}
          >
            <ArrowUp />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Mover seção para baixo"
            disabled={index === course.sections.length - 1}
            onClick={() => library.moveSection(course.id, index, index + 1)}
          >
            <ArrowDown />
          </Button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button size="icon-xs" variant="ghost" aria-label="Opções da seção">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={onAdd}>
                <Plus /> Adicionar aulas
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEditingChange(true)}>
                <Pencil /> Renomear
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 /> Excluir seção
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {section.lessons.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhuma aula nesta seção ainda.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVertical]} onDragEnd={onDragEnd}>
          <SortableContext items={section.lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <ul className="divide-y">
              {section.lessons.map((lesson, i) => (
                <LessonRow
                  key={lesson.id}
                  course={course}
                  section={section}
                  lesson={lesson}
                  indexInSection={i}
                  number={offset + i + 1}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="border-t px-2 py-2">
        <Button variant="ghost" size="sm" className="text-primary" onClick={onAdd}>
          <Plus /> Adicionar aulas
        </Button>
      </div>
    </section>
  );
}

function LessonRow({
  course,
  section,
  lesson,
  indexInSection,
  number,
}: {
  course: Course;
  section: CourseSection;
  lesson: Lesson;
  indexInSection: number;
  number: number;
}) {
  const video = useLibrary((s) => s.videos[lesson.videoId]);
  const videos = useLibrary((s) => s.videos);
  const [editing, setEditing] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id });
  const library = useLibrary.getState();

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "group/lesson flex items-center gap-3 bg-card/0 px-2 py-2 sm:px-3",
        isDragging && "relative z-10 bg-accent shadow-xl"
      )}
    >
      <button
        type="button"
        aria-label="Arrastar para reordenar"
        className="cursor-grab touch-none text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{number}.</span>
      <VideoThumbnail id={lesson.videoId} className="hidden aspect-video w-20 shrink-0 rounded-md sm:block" />
      <div className="min-w-0 flex-1">
        <EditableText
          value={lessonTitle(lesson, videos)}
          editing={editing}
          onEditingChange={setEditing}
          onSave={(title) => library.renameLesson(course.id, lesson.id, title === video?.title ? "" : title)}
          className={cn("text-sm font-medium", video?.titleSource === "pending" && !lesson.title && "text-muted-foreground italic")}
          ariaLabel="Título da aula"
        />
        <p className="truncate text-xs text-muted-foreground">
          {lesson.title && video?.title ? `Original: ${video.title}` : (video?.author ?? "—")}
          {video?.duration ? ` · ${formatTime(video.duration)}` : ""}
        </p>
      </div>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label="Opções da aula" className="shrink-0 text-muted-foreground">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onSelect={() => playLesson(course.id, lesson.id)}>
            <Play /> Assistir
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil /> Renomear aula
          </DropdownMenuItem>
          {lesson.title && (
            <DropdownMenuItem onSelect={() => library.renameLesson(course.id, lesson.id, "")}>
              <RotateCcw /> Usar título do vídeo
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={indexInSection === 0}
            onSelect={() => {
              const id = library.splitSection(course.id, section.id, indexInSection, "Nova seção");
              if (id) toast.success("Nova seção criada a partir desta aula", { description: "Dê um nome a ela no topo da seção." });
            }}
          >
            <Scissors /> Começar nova seção aqui
          </DropdownMenuItem>
          {course.sections.length > 1 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowRightLeft /> Mover para a seção
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                <DropdownMenuLabel>Vai para o fim da seção</DropdownMenuLabel>
                {course.sections.map((s, i) => (
                  <DropdownMenuItem
                    key={s.id}
                    disabled={s.id === section.id}
                    onSelect={() => library.moveLesson(course.id, lesson.id, s.id, s.lessons.length)}
                  >
                    <span className="truncate">
                      {i + 1}. {s.title}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              library.removeLesson(course.id, lesson.id);
              toast("Aula removida do curso");
            }}
          >
            <Trash2 /> Remover aula
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

/** Texto que vira campo de edição ao clicar (Enter salva, Esc cancela). */
function EditableText({
  value,
  editing,
  onEditingChange,
  onSave,
  className,
  ariaLabel,
}: {
  value: string;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onSave: (value: string) => void;
  className?: string;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  // Ao entrar em edição (por clique ou pelo menu), começa do valor atual.
  const [wasEditing, setWasEditing] = useState(editing);
  if (editing !== wasEditing) {
    setWasEditing(editing);
    if (editing) setDraft(value);
  }

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => onEditingChange(true)}
        title="Clique para renomear"
        className={cn("block max-w-full cursor-text truncate rounded px-1 -mx-1 text-left hover:bg-accent/60", className)}
      >
        {value}
      </button>
    );
  }

  const commit = () => {
    const next = draft.trim();
    if (next && next !== value) onSave(next);
    onEditingChange(false);
  };

  return (
    <input
      ref={inputRef}
      value={draft}
      aria-label={ariaLabel}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onEditingChange(false);
      }}
      className={cn("w-full rounded-md border border-primary/60 bg-background px-1.5 py-0.5 outline-none", className)}
    />
  );
}

