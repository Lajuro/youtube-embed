/* eslint-disable @next/next/no-img-element -- fundo do pôster usa a miniatura direto do i.ytimg.com */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  ListChecks,
  NotebookPen,
  Pencil,
  Play,
  RotateCcw,
  Trophy,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { CourseCurriculum } from "@/components/courses/course-curriculum";
import { CourseNotes } from "@/components/courses/course-notes";
import { PlaybackRateMenu } from "@/components/player/playback-rate-menu";
import { PLAYER_BAR_HEIGHT } from "@/components/player/player-host";
import {
  courseStats,
  findLessonByVideo,
  lessonTitle,
  nextLessonToWatch,
  playLesson,
  resumePosition,
  toggleLessonCompleted,
} from "@/lib/courses";
import { cn, formatTime, formatTotalDuration, pluralize } from "@/lib/utils";
import { thumbnailUrl } from "@/lib/youtube";
import { courseLessons, useLibrary, type Course, type Lesson } from "@/stores/library-store";
import { usePlayer, usePlayerDock } from "@/stores/player-store";
import { useUi } from "@/stores/ui-store";

export function CourseClassroom({ courseId }: { courseId: string }) {
  const course = useLibrary((s) => s.courses.find((c) => c.id === courseId));

  if (!course) {
    return (
      <div className="px-4 py-10 md:px-8">
        <EmptyState icon={GraduationCap} title="Curso não encontrado" description="Ele pode ter sido excluído, ou foi criado em outro navegador.">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/courses">Ver todos os cursos</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }
  return <Classroom course={course} />;
}

function Classroom({ course }: { course: Course }) {
  const videos = useLibrary((s) => s.videos);
  const progress = useLibrary((s) => s.progress);
  const playingThis = usePlayer((s) => s.source?.type === "course" && s.source.id === course.id && s.queue.length > 0);
  const currentVideoId = usePlayer((s) => s.queue[s.index]);
  const isPlaying = usePlayer((s) => s.status === "playing" || s.status === "buffering");
  const openCourseDialog = useUi((s) => s.openCourseDialog);
  const setDockEl = usePlayerDock((s) => s.setEl);
  const stageRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState("overview");

  const lessons = useMemo(() => courseLessons(course), [course]);
  const playingLesson = playingThis && currentVideoId ? findLessonByVideo(course, currentVideoId)?.lesson ?? null : null;
  const lesson: Lesson | undefined = playingLesson ?? nextLessonToWatch(course, progress);
  const lessonIndex = lesson ? lessons.findIndex((l) => l.id === lesson.id) : -1;
  const sectionIndex = lesson ? course.sections.findIndex((s) => s.lessons.some((l) => l.id === lesson.id)) : -1;
  const stats = courseStats(course, progress, videos);
  const done = stats.total > 0 && stats.completed === stats.total;

  // Enquanto este curso estiver tocando, o vídeo "encaixa" no palco desta página.
  useEffect(() => {
    const el = stageRef.current;
    if (!playingThis || !el) return;
    setDockEl(el);
    return () => {
      if (usePlayerDock.getState().el === el) setDockEl(null);
    };
  }, [playingThis, setDockEl]);

  const goTo = (target: Lesson | undefined) => target && playLesson(course.id, target.id);
  const completed = lesson ? Boolean(progress[lesson.id]?.completed) : false;

  return (
    <div className="flex flex-col lg:flex-row" style={{ height: `calc(100dvh - 4rem - ${PLAYER_BAR_HEIGHT}px)` }}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Cabeçalho do curso */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b px-2 md:px-4">
          <Button asChild variant="ghost" size="icon-sm" aria-label="Voltar para os cursos">
            <Link href="/courses">
              <ChevronLeft />
            </Link>
          </Button>
          <GraduationCap className="hidden size-4 shrink-0 text-primary sm:block" />
          <h1 className="min-w-0 truncate text-sm font-semibold md:text-base">{course.title}</h1>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <ProgressRing percent={stats.percent} done={done} />
            <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">
              {stats.completed}/{stats.total} aulas
            </span>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link href={`/courses/${course.id}/edit`}>
                <Pencil />
                <span className="hidden md:inline">Editar conteúdo</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Palco do vídeo: o player (que vive no layout) é posicionado exatamente aqui. */}
        <div className="flex shrink-0 justify-center bg-black">
          <div
            ref={stageRef}
            className="relative aspect-video"
            style={{ width: "min(100%, calc(max(14rem, 50dvh) * 16 / 9))" }}
          >
            {!playingThis && <Poster course={course} lesson={lesson} lessonNumber={lessonIndex + 1} />}
          </div>
        </div>

        {/* Aula atual + abas */}
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {lesson ? (
            <div className="border-b px-4 py-4 md:px-6">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Seção {sectionIndex + 1}: {course.sections[sectionIndex]?.title} · Aula {lessonIndex + 1} de {lessons.length}
              </p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-balance md:text-xl">
                {lessonTitle(lesson, videos)}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={lessonIndex <= 0}
                  onClick={() => goTo(lessons[lessonIndex - 1])}
                >
                  <ChevronLeft /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={lessonIndex >= lessons.length - 1}
                  onClick={() => goTo(lessons[lessonIndex + 1])}
                >
                  Próxima <ChevronRight />
                </Button>
                <Button
                  variant={completed ? "secondary" : "brand"}
                  size="sm"
                  onClick={() => {
                    const nowDone = toggleLessonCompleted(lesson.id);
                    if (nowDone) toast.success("Aula concluída! ✅");
                  }}
                >
                  <Check />
                  {completed ? "Concluída" : "Marcar como concluída"}
                </Button>
                {playingThis && <PlaybackRateMenu showIcon className="border" />}
              </div>
            </div>
          ) : null}

          <Tabs value={tab} onValueChange={setTab} className="px-4 py-4 md:px-6">
            <TabsList>
              <TabsTrigger value="content" className="lg:hidden">
                <ListChecks /> Conteúdo
              </TabsTrigger>
              <TabsTrigger value="overview">
                <BookOpen /> Visão geral
              </TabsTrigger>
              <TabsTrigger value="notes">
                <NotebookPen /> Anotações
              </TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="-mx-4 mt-2 border-t lg:hidden">
              <CourseCurriculum
                course={course}
                activeLessonId={lesson?.id}
                playing={Boolean(playingLesson) && isPlaying}
                onPlay={(id) => playLesson(course.id, id)}
              />
            </TabsContent>
            <TabsContent value="overview" className="mt-2">
              <Overview course={course} onEdit={() => openCourseDialog({ courseId: course.id })} />
            </TabsContent>
            <TabsContent value="notes" className="mt-2">
              <CourseNotes course={course} currentLesson={playingLesson} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Conteúdo do curso (desktop) */}
      <aside className="hidden w-[360px] shrink-0 flex-col border-l bg-sidebar/40 lg:flex xl:w-[400px]">
        <div className="border-b p-4">
          <h2 className="font-semibold">Conteúdo do curso</h2>
          <Progress value={stats.percent} className="mt-3" />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {stats.percent}% concluído · {stats.completed} de {pluralize(stats.total, "aula", "aulas")}
            {stats.remaining > 0 && ` · faltam ${formatTotalDuration(stats.remaining)}`}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          <CourseCurriculum
            course={course}
            activeLessonId={lesson?.id}
            playing={Boolean(playingLesson) && isPlaying}
            onPlay={(id) => playLesson(course.id, id)}
          />
        </div>
      </aside>
    </div>
  );
}

/** Capa do palco quando o curso não está tocando (ex.: você está ouvindo música). */
function Poster({ course, lesson, lessonNumber }: { course: Course; lesson?: Lesson; lessonNumber: number }) {
  const videos = useLibrary((s) => s.videos);
  if (!lesson) {
    return (
      <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
        <div>
          <GraduationCap className="mx-auto size-10 text-white/70" />
          <p className="mt-3 font-semibold">Este curso ainda não tem aulas</p>
          <Button asChild variant="brand" className="mt-4 rounded-full">
            <Link href={`/courses/${course.id}/edit`}>
              <Pencil /> Adicionar aulas
            </Link>
          </Button>
        </div>
      </div>
    );
  }
  const resumeAt = resumePosition(lesson.id);
  return (
    <button
      type="button"
      onClick={() => playLesson(course.id, lesson.id)}
      className="group/poster absolute inset-0 cursor-pointer overflow-hidden text-white"
      aria-label={`Assistir aula ${lessonNumber}`}
    >
      <img
        src={thumbnailUrl(lesson.videoId, "hqdefault")}
        alt=""
        onError={(e) => {
          const fallback = videos[lesson.videoId]?.thumbnail;
          if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
          else e.currentTarget.style.display = "none";
        }}
        className="absolute inset-0 size-full scale-110 object-cover opacity-50 blur-sm transition-transform duration-700 group-hover/poster:scale-[1.15]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30" />
      <div className="relative flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-brand-gradient shadow-2xl transition-transform group-hover/poster:scale-110 md:size-20">
          <Play className="ml-1 size-7 fill-current md:size-8" />
        </span>
        <span className="text-xs font-medium tracking-widest text-white/70 uppercase">
          {resumeAt ? `Continuar de ${formatTime(resumeAt)}` : lessonNumber === 1 ? "Começar o curso" : "Assistir"}
        </span>
        <span className="line-clamp-2 max-w-xl text-base font-semibold md:text-lg">
          Aula {lessonNumber}: {lessonTitle(lesson, videos)}
        </span>
      </div>
    </button>
  );
}

function Overview({ course, onEdit }: { course: Course; onEdit: () => void }) {
  const videos = useLibrary((s) => s.videos);
  const progress = useLibrary((s) => s.progress);
  const stats = courseStats(course, progress, videos);
  const items = [
    { icon: ListChecks, label: "Aulas", value: `${stats.total}` },
    { icon: Clock3, label: "Duração", value: stats.duration ? formatTotalDuration(stats.duration) : "—" },
    { icon: Check, label: "Concluídas", value: `${stats.completed} (${stats.percent}%)` },
    {
      icon: Trophy,
      label: "Falta",
      value: stats.remaining
        ? formatTotalDuration(stats.remaining)
        : stats.total && stats.completed === stats.total
          ? "Nada! 🎉"
          : "—",
    },
  ];

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border bg-card/50 p-3">
            <item.icon className="size-4 text-primary" />
            <p className="mt-2 text-lg font-semibold tabular-nums">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">Sobre o curso</h3>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onEdit}>
            <Pencil /> Editar detalhes
          </Button>
        </div>
        {course.author && <p className="mt-1 text-sm text-muted-foreground">Por {course.author}</p>}
        <p className={cn("mt-2 text-sm whitespace-pre-wrap", !course.description && "text-muted-foreground italic")}>
          {course.description || "Sem descrição."}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          {pluralize(course.sections.length, "seção", "seções")} · {pluralize(stats.total, "aula", "aulas")} · As aulas
          continuam de onde você parou e são marcadas como concluídas ao chegar perto do fim.
        </p>
      </div>

      {stats.completed > 0 && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="w-fit text-muted-foreground">
              <RotateCcw /> Recomeçar o curso (zerar progresso)
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Zerar o progresso?</AlertDialogTitle>
              <AlertDialogDescription>
                Todas as aulas voltam a ficar como não assistidas. As anotações continuam.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  useLibrary.getState().resetCourseProgress(course.id);
                  toast.success("Progresso zerado");
                }}
              >
                Zerar progresso
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function ProgressRing({ percent, done }: { percent: number; done: boolean }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid size-9 place-items-center" title={`${percent}% concluído`}>
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground/10" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="url(#course-ring)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * percent) / 100}
          className="transition-[stroke-dashoffset] duration-700"
        />
        <defs>
          <linearGradient id="course-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--brand-from)" />
            <stop offset="1" stopColor="var(--brand-to)" />
          </linearGradient>
        </defs>
      </svg>
      {done ? <Trophy className="size-3.5 text-amber-400" /> : <span className="text-[9px] font-bold tabular-nums">{percent}%</span>}
    </span>
  );
}
