/* eslint-disable @next/next/no-img-element -- fundo do pôster usa a miniatura direto do i.ytimg.com */
"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  Keyboard,
  ListChecks,
  MoreHorizontal,
  NotebookPen,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  SkipForward,
  Trophy,
  X,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/empty-state";
import { CourseCurriculum } from "@/components/courses/course-curriculum";
import { CourseNotes } from "@/components/courses/course-notes";
import { Logo } from "@/components/layout/sidebar";
import { PlaybackRateMenu } from "@/components/player/playback-rate-menu";
import { Equalizer } from "@/components/video/equalizer";
import { VideoThumbnail } from "@/components/video/video-thumbnail";
import {
  courseStats,
  findLessonByVideo,
  lessonTitle,
  nextLessonToWatch,
  playLesson,
  resumePosition,
  toggleLessonCompleted,
} from "@/lib/courses";
import { TimerButton } from "@/components/timers/timer-popover";
import { cn, formatTime, formatTotalDuration, pluralize } from "@/lib/utils";
import { thumbnailUrl } from "@/lib/youtube";
import { courseLessons, useLibrary, type Course, type Lesson } from "@/stores/library-store";
import { setAdvanceGuard, useCurrentVideoId, usePlayer, usePlayerDock } from "@/stores/player-store";
import { useSettings, useUi } from "@/stores/ui-store";

/** Altura do cabeçalho da sala de aula. */
const HEADER = "3.5rem";
/** Segundos da contagem para a próxima aula. */
const COUNTDOWN = 5;

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

/** Liga o modo foco (sem menu, topo e barra do player) enquanto a sala de aula estiver aberta. */
function useFocusMode() {
  useLayoutEffect(() => {
    useUi.getState().setFocusMode(true);
    return () => useUi.getState().setFocusMode(false);
  }, []);
}

function Classroom({ course }: { course: Course }) {
  useFocusMode();
  const videos = useLibrary((s) => s.videos);
  const progress = useLibrary((s) => s.progress);
  const playingThis = usePlayer((s) => s.source?.type === "course" && s.source.id === course.id && s.queue.length > 0);
  const currentVideoId = useCurrentVideoId();
  const status = usePlayer((s) => s.status);
  const theater = useSettings((s) => s.courseTheater);
  const setTheater = useSettings((s) => s.setCourseTheater);
  const openCourseDialog = useUi((s) => s.openCourseDialog);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState("overview");

  const lessons = useMemo(() => courseLessons(course), [course]);
  const playingLesson = playingThis && currentVideoId ? (findLessonByVideo(course, currentVideoId)?.lesson ?? null) : null;
  const lesson: Lesson | undefined = playingLesson ?? nextLessonToWatch(course, progress);
  const lessonIndex = lesson ? lessons.findIndex((l) => l.id === lesson.id) : -1;
  const sectionIndex = lesson ? course.sections.findIndex((s) => s.lessons.some((l) => l.id === lesson.id)) : -1;
  const stats = courseStats(course, progress, videos);
  const isPlaying = status === "playing" || status === "buffering";

  // Enquanto este curso toca, o vídeo encaixa no palco desta página (e rola junto com ela).
  useEffect(() => {
    const el = stageRef.current;
    if (!playingThis || !el) return;
    usePlayerDock.getState().setDock(el, scrollRef.current);
    return () => usePlayerDock.getState().clearDock(el);
  }, [playingThis]);

  // Ao fim de uma aula, quem decide avançar é a tela de "próxima aula" (com contagem).
  useEffect(() => {
    setAdvanceGuard((source) => !(source?.type === "course" && source.id === course.id));
    return () => setAdvanceGuard(null);
  }, [course.id]);

  // Ao trocar de aula, volta para o topo (vídeo à vista).
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [playingLesson?.id]);

  // Em modo cinema o conteúdo do curso vira uma aba.
  const contentTab = theater ? "lg:inline-flex" : "lg:hidden";
  const activeTab = !theater && tab === "content" ? "overview" : tab;

  return (
    <div className="flex h-dvh flex-col bg-background" data-enter="fade">
      <ClassroomHeader
        course={course}
        percent={stats.percent}
        done={stats.total > 0 && stats.completed === stats.total}
        playingThis={playingThis}
        theater={theater}
        onToggleTheater={() => setTheater(!theater)}
        onEditDetails={() => openCourseDialog({ courseId: course.id })}
      />

      <div className="flex min-h-0 flex-1">
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto scrollbar-thin">
          {/* Palco: o player (que vive no layout) é posicionado exatamente aqui. */}
          <div className="bg-black">
            <div
              ref={stageRef}
              className="relative mx-auto aspect-video w-full"
              style={{ maxWidth: `calc((100dvh - ${HEADER}) * 16 / 9)` }}
            >
              {!playingThis && <Poster course={course} lesson={lesson} lessonNumber={lessonIndex + 1} />}
              {playingThis && status === "ended" && playingLesson && (
                <EndScreen key={playingLesson.id} course={course} lesson={playingLesson} />
              )}
            </div>
          </div>

          {lesson && (
            <LessonBar
              course={course}
              lesson={lesson}
              lessonIndex={lessonIndex}
              sectionIndex={sectionIndex}
              lessons={lessons}
              playingThis={playingThis}
            />
          )}

          <div className="mx-auto w-full max-w-5xl px-4 pb-16 md:px-8">
            <Tabs value={activeTab} onValueChange={setTab}>
              <TabsList className="h-10 w-full justify-start gap-1 rounded-none border-b bg-transparent p-0 sm:w-auto">
                {[
                  { value: "content", icon: ListChecks, label: "Conteúdo", className: contentTab },
                  { value: "overview", icon: BookOpen, label: "Visão geral" },
                  { value: "notes", icon: NotebookPen, label: "Anotações" },
                ].map((t) => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className={cn(
                      "h-10 flex-none rounded-none border-0 border-b-2 border-transparent px-3 text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent",
                      t.className
                    )}
                  >
                    <t.icon /> {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="content" className={cn("-mx-4 mt-0 md:-mx-8", !theater && "lg:hidden")}>
                <CourseCurriculum
                  course={course}
                  activeLessonId={lesson?.id}
                  playing={Boolean(playingLesson) && isPlaying}
                  onPlay={(id) => playLesson(course.id, id)}
                />
              </TabsContent>
              <TabsContent value="overview" className="mt-5">
                <Overview course={course} onEdit={() => openCourseDialog({ courseId: course.id })} />
              </TabsContent>
              <TabsContent value="notes" className="mt-5">
                <CourseNotes course={course} currentLesson={playingLesson} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Conteúdo do curso (desktop) — some no modo cinema */}
        {!theater && (
          <aside className="hidden w-[340px] shrink-0 flex-col border-l bg-sidebar/50 animate-in fade-in slide-in-from-right-4 duration-300 lg:flex xl:w-[380px]">
            <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold">Conteúdo do curso</h2>
                <Progress value={stats.percent} className="mt-2.5" />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {stats.completed} de {pluralize(stats.total, "aula", "aulas")}
                  {stats.remaining > 0 && ` · faltam ${formatTotalDuration(stats.remaining)}`}
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="ghost" className="-mr-1 text-muted-foreground" onClick={() => setTheater(true)} aria-label="Fechar painel (modo cinema)">
                    <X />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="flex items-center gap-2">
                  Modo cinema <Kbd>T</Kbd>
                </TooltipContent>
              </Tooltip>
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
        )}
      </div>
    </div>
  );
}

/* ---------------- Cabeçalho ---------------- */

function ClassroomHeader({
  course,
  percent,
  done,
  playingThis,
  theater,
  onToggleTheater,
  onEditDetails,
}: {
  course: Course;
  percent: number;
  done: boolean;
  playingThis: boolean;
  theater: boolean;
  onToggleTheater: () => void;
  onEditDetails: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const setShortcutsOpen = useUi((s) => s.setShortcutsOpen);

  return (
    <header className="flex shrink-0 items-center gap-2 border-b px-2 md:gap-3 md:px-4" style={{ height: HEADER }}>
      <Logo compact className="hidden md:flex" />
      <div className="hidden h-6 w-px bg-border md:block" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild variant="ghost" size="icon-sm" aria-label="Voltar para os cursos">
            <Link href="/courses">
              <ChevronLeft />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Voltar para os cursos</TooltipContent>
      </Tooltip>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold md:text-[15px]">{course.title}</h1>
        {course.author && <p className="hidden truncate text-xs text-muted-foreground sm:block">{course.author}</p>}
      </div>

      {!playingThis && <BackgroundAudioChip />}

      <div className="flex shrink-0 items-center gap-1">
        <TimerButton />
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-2 rounded-full px-1.5 py-1">
              <ProgressRing percent={percent} done={done} />
              <span className="hidden text-xs font-medium text-muted-foreground tabular-nums lg:inline">
                {done ? "Concluído" : `${percent}%`}
              </span>
            </span>
          </TooltipTrigger>
          <TooltipContent>Seu progresso no curso</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden text-muted-foreground lg:inline-flex"
              aria-pressed={theater}
              aria-label={theater ? "Mostrar conteúdo do curso" : "Modo cinema"}
              onClick={onToggleTheater}
            >
              {theater ? <PanelRightOpen /> : <PanelRightClose />}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="flex items-center gap-2">
            {theater ? "Mostrar conteúdo do curso" : "Modo cinema"} <Kbd>T</Kbd>
          </TooltipContent>
        </Tooltip>
        <Button asChild variant="ghost" size="sm" className="hidden text-muted-foreground sm:inline-flex">
          <Link href={`/courses/${course.id}/edit`}>
            <Pencil /> <span className="hidden md:inline">Editar</span>
          </Link>
        </Button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label="Mais opções">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild className="sm:hidden">
              <Link href={`/courses/${course.id}/edit`}>
                <Pencil /> Editar conteúdo
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onEditDetails}>
              <BookOpen /> Detalhes do curso
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setShortcutsOpen(true)}>
              <Keyboard /> Atalhos de teclado
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setConfirmReset(true)}>
              <RotateCcw /> Zerar progresso
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zerar o progresso?</AlertDialogTitle>
            <AlertDialogDescription>Todas as aulas voltam a ficar como não assistidas. As anotações continuam.</AlertDialogDescription>
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
    </header>
  );
}

/** Se outra coisa estiver tocando (ex.: música), mostra um controle discreto em vez do vídeo. */
function BackgroundAudioChip() {
  const currentId = useCurrentVideoId();
  const title = useLibrary((s) => (currentId ? s.videos[currentId]?.title : undefined));
  const status = usePlayer((s) => s.status);
  if (!currentId) return null;
  const playing = status === "playing" || status === "buffering";

  return (
    <div className="hidden max-w-64 items-center gap-2 rounded-full border bg-muted/40 py-1 pr-1 pl-2.5 text-xs md:flex">
      {playing ? <Equalizer className="shrink-0" /> : <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground" />}
      <span className="min-w-0 truncate text-muted-foreground" title={title}>
        {title ?? "Tocando"}
      </span>
      <Button
        size="icon-xs"
        variant="ghost"
        className="shrink-0 rounded-full"
        aria-label={playing ? "Pausar" : "Tocar"}
        onClick={() => usePlayer.getState().togglePlay()}
      >
        {playing ? <Pause className="fill-current" /> : <Play className="fill-current" />}
      </Button>
      <Button size="icon-xs" variant="ghost" className="shrink-0 rounded-full" aria-label="Parar" onClick={() => usePlayer.getState().stop()}>
        <X />
      </Button>
    </div>
  );
}

/* ---------------- Barra da aula ---------------- */

function LessonBar({
  course,
  lesson,
  lessonIndex,
  sectionIndex,
  lessons,
  playingThis,
}: {
  course: Course;
  lesson: Lesson;
  lessonIndex: number;
  sectionIndex: number;
  lessons: Lesson[];
  playingThis: boolean;
}) {
  const videos = useLibrary((s) => s.videos);
  const completed = useLibrary((s) => Boolean(s.progress[lesson.id]?.completed));
  const autoplay = useSettings((s) => s.courseAutoplay);
  const setAutoplay = useSettings((s) => s.setCourseAutoplay);
  const prev = lessons[lessonIndex - 1];
  const next = lessons[lessonIndex + 1];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-5 pb-4 md:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            Seção {sectionIndex + 1}: {course.sections[sectionIndex]?.title} · Aula {lessonIndex + 1} de {lessons.length}
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-balance md:text-2xl">{lessonTitle(lesson, videos)}</h2>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  disabled={!prev}
                  aria-label="Aula anterior"
                  onClick={() => prev && playLesson(course.id, prev.id)}
                >
                  <ChevronLeft />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Aula anterior</TooltipContent>
            </Tooltip>
            <div className="h-4 w-px bg-border" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  disabled={!next}
                  aria-label="Próxima aula"
                  onClick={() => next && playLesson(course.id, next.id)}
                >
                  <ChevronRight />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Próxima aula</TooltipContent>
            </Tooltip>
          </div>
          <Button
            variant={completed ? "secondary" : "outline"}
            size="sm"
            className={cn("rounded-full", completed && "text-emerald-500")}
            onClick={() => {
              const nowDone = toggleLessonCompleted(lesson.id);
              if (nowDone) toast.success("Aula concluída! ✅");
            }}
          >
            <Check />
            {completed ? "Concluída" : "Marcar como concluída"}
          </Button>
          {playingThis && <PlaybackRateMenu showIcon className="rounded-full border" />}
          <Label className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-normal text-muted-foreground">
            <Switch checked={autoplay} onCheckedChange={setAutoplay} className="scale-90" />
            Reprodução automática
          </Label>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Palco: pôster e tela de fim ---------------- */

/** Capa do palco quando o curso não está tocando. */
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
        className="absolute inset-0 size-full scale-110 object-cover opacity-45 blur-sm transition-transform duration-700 group-hover/poster:scale-[1.15]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30" />
      <div className="relative flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-brand-gradient shadow-2xl transition-transform group-hover/poster:scale-110 md:size-20">
          <Play className="ml-1 size-7 fill-current md:size-8" />
        </span>
        <span className="text-xs font-medium tracking-widest text-white/70 uppercase">
          {resumeAt ? `Continuar de ${formatTime(resumeAt)}` : lessonNumber === 1 ? "Começar o curso" : "Assistir"}
        </span>
        <span className="line-clamp-2 max-w-xl text-base font-semibold md:text-xl">
          Aula {lessonNumber}: {lessonTitle(lesson, videos)}
        </span>
      </div>
    </button>
  );
}

/** Tela ao terminar uma aula: próxima aula com contagem (ou fim do curso). */
function EndScreen({ course, lesson }: { course: Course; lesson: Lesson }) {
  const videos = useLibrary((s) => s.videos);
  const progress = useLibrary((s) => s.progress);
  const autoplay = useSettings((s) => s.courseAutoplay);
  const lessons = courseLessons(course);
  const index = lessons.findIndex((l) => l.id === lesson.id);
  const next = lessons[index + 1];
  const [remaining, setRemaining] = useState(COUNTDOWN);
  const [cancelled, setCancelled] = useState(false);
  // O desligamento automático ("ao fim deste vídeo") também segura a próxima aula.
  const stoppedByTimer = usePlayer((s) => s.stoppedByTimer);
  const counting = Boolean(next) && autoplay && !cancelled && !stoppedByTimer;

  useEffect(() => {
    if (!counting) return;
    if (remaining <= 0) {
      playLesson(course.id, next!.id);
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [counting, remaining, course.id, next]);

  const replay = () => {
    usePlayer.getState().seek(0);
    usePlayer.getState().togglePlay();
  };

  const allDone = lessons.every((l) => progress[l.id]?.completed);

  return (
    <div className="absolute inset-0 z-[31] grid place-items-center bg-black/85 p-4 text-white backdrop-blur-md animate-in fade-in duration-500">
      {next ? (
        <div className="w-full max-w-lg text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
            <Check className="size-3.5" /> Aula concluída
          </p>
          <p className="mt-4 text-xs font-medium tracking-widest text-white/60 uppercase">A seguir</p>
          <div className="mt-3 flex items-center gap-4 rounded-2xl bg-white/5 p-3 text-left ring-1 ring-white/10">
            <div className="relative shrink-0">
              <VideoThumbnail id={next.videoId} className="aspect-video w-28 rounded-lg sm:w-40" />
              {counting && <CountdownRing remaining={remaining} />}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white/60">Aula {index + 2}</p>
              <p className="line-clamp-2 font-semibold">{lessonTitle(next, videos)}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="brand" className="rounded-full" onClick={() => playLesson(course.id, next.id)}>
              <SkipForward className="fill-current" /> {counting ? `Assistir agora (${remaining})` : "Assistir próxima aula"}
            </Button>
            {counting ? (
              <Button variant="ghost" className="rounded-full text-white hover:bg-white/10 hover:text-white" onClick={() => setCancelled(true)}>
                Cancelar
              </Button>
            ) : (
              <Button variant="ghost" className="rounded-full text-white hover:bg-white/10 hover:text-white" onClick={replay}>
                <RotateCcw /> Rever esta aula
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-md text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-amber-400/15 text-amber-400">
            <Trophy className="size-8" />
          </div>
          <p className="mt-4 text-xl font-bold">{allDone ? "Você concluiu o curso! 🎉" : "Você chegou à última aula"}</p>
          <p className="mt-1 text-sm text-white/70">
            {allDone ? "Parabéns pela dedicação." : "Ainda há aulas não concluídas — confira o conteúdo do curso."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="ghost" className="rounded-full text-white hover:bg-white/10 hover:text-white" onClick={replay}>
              <RotateCcw /> Rever esta aula
            </Button>
            <Button asChild variant="brand" className="rounded-full">
              <Link href="/courses">Ver meus cursos</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CountdownRing({ remaining }: { remaining: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <span className="absolute inset-0 grid place-items-center rounded-lg bg-black/55">
      <svg viewBox="0 0 44 44" className="size-12 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="3" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={(c * remaining) / COUNTDOWN}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums">{remaining}</span>
    </span>
  );
}

/* ---------------- Visão geral ---------------- */

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
      </div>

      <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">Atalhos na sala de aula</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {[
            ["Espaço", "Tocar / pausar"],
            ["← →", "Voltar / avançar 10 s"],
            ["N / P", "Próxima / anterior"],
            ["T", "Modo cinema"],
          ].map(([key, label]) => (
            <span key={key} className="flex items-center gap-2">
              <Kbd>{key}</Kbd> {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProgressRing({ percent, done }: { percent: number; done: boolean }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid size-8 shrink-0 place-items-center">
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
      {done ? (
        <Trophy className="size-3.5 text-amber-400" />
      ) : (
        <span className="text-[9px] font-bold tabular-nums lg:hidden">{percent}</span>
      )}
    </span>
  );
}
