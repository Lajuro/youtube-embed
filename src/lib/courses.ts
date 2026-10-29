"use client";

import { toast } from "sonner";

import { hydrateMetadata } from "@/lib/actions";
import {
  courseLessons,
  useLibrary,
  type Course,
  type CourseSection,
  type Lesson,
  type LessonProgress,
  type Video,
} from "@/stores/library-store";
import { usePlayer } from "@/stores/player-store";

/** Uma aula conta como concluída ao chegar nesta fração do vídeo (os créditos finais não importam). */
export const COMPLETE_AT = 0.95;
/** Abaixo disso não vale a pena "retomar": começa do zero. */
const MIN_RESUME_SECONDS = 10;

export function lessonTitle(lesson: Lesson, videos: Record<string, Video>) {
  return lesson.title ?? videos[lesson.videoId]?.title ?? "Aula";
}

export interface Stats {
  total: number;
  completed: number;
  percent: number;
  /** Soma das durações conhecidas (segundos). */
  duration: number;
  /** Quanto falta das aulas não concluídas (segundos, considerando onde você parou). */
  remaining: number;
}

export function lessonsStats(
  lessons: Lesson[],
  progress: Record<string, LessonProgress>,
  videos: Record<string, Video>
): Stats {
  let completed = 0;
  let duration = 0;
  let remaining = 0;
  for (const lesson of lessons) {
    const d = videos[lesson.videoId]?.duration ?? progress[lesson.id]?.duration ?? 0;
    duration += d;
    if (progress[lesson.id]?.completed) completed++;
    else remaining += Math.max(0, d - (progress[lesson.id]?.position ?? 0));
  }
  return {
    total: lessons.length,
    completed,
    percent: lessons.length ? Math.round((completed / lessons.length) * 100) : 0,
    duration,
    remaining,
  };
}

export function courseStats(course: Course, progress: Record<string, LessonProgress>, videos: Record<string, Video>) {
  return lessonsStats(courseLessons(course), progress, videos);
}

export function sectionStats(
  section: CourseSection,
  progress: Record<string, LessonProgress>,
  videos: Record<string, Video>
) {
  return lessonsStats(section.lessons, progress, videos);
}

/** Aula de onde continuar: a última aberta (se não terminou) ou a próxima não concluída. */
export function nextLessonToWatch(course: Course, progress: Record<string, LessonProgress>): Lesson | undefined {
  const lessons = courseLessons(course);
  if (!lessons.length) return undefined;
  const lastIndex = lessons.findIndex((l) => l.id === course.lastLessonId);
  if (lastIndex !== -1 && !progress[lessons[lastIndex].id]?.completed) return lessons[lastIndex];
  const after = lessons.slice(lastIndex + 1).find((l) => !progress[l.id]?.completed);
  return after ?? lessons.find((l) => !progress[l.id]?.completed) ?? lessons[0];
}

export function findLessonByVideo(course: Course, videoId: string) {
  for (const section of course.sections) {
    const lesson = section.lessons.find((l) => l.videoId === videoId);
    if (lesson) return { section, lesson };
  }
  return null;
}

/** Onde a aula deve começar: no ponto salvo, a não ser que já tenha terminado. */
export function resumePosition(lessonId: string) {
  const p = useLibrary.getState().progress[lessonId];
  if (!p || p.completed || p.position < MIN_RESUME_SECONDS) return 0;
  if (p.duration && p.position >= p.duration * COMPLETE_AT) return 0;
  return Math.max(0, Math.floor(p.position - 2));
}

/** Toca uma aula; a fila vira o curso inteiro, em ordem, para seguir para a próxima sozinho. */
export function playLesson(courseId: string, lessonId: string, startAt?: number) {
  const course = useLibrary.getState().courses.find((c) => c.id === courseId);
  if (!course) return;
  const lessons = courseLessons(course);
  const index = lessons.findIndex((l) => l.id === lessonId);
  if (index === -1) return;
  // Garante títulos para a fila/barra do player (busca em segundo plano os que faltam).
  for (const l of lessons) hydrateMetadata(l.videoId);
  usePlayer
    .getState()
    .playQueue(
      lessons.map((l) => l.videoId),
      index,
      { type: "course", id: course.id, label: course.title },
      { ordered: true, startAt: startAt ?? resumePosition(lessonId) }
    );
  useLibrary.getState().touchCourse(courseId, lessonId);
}

export function continueCourse(courseId: string) {
  const library = useLibrary.getState();
  const course = library.courses.find((c) => c.id === courseId);
  if (!course) return;
  const lesson = nextLessonToWatch(course, library.progress);
  if (!lesson) {
    toast.info("Esse curso ainda não tem aulas", { description: "Adicione vídeos em “Editar conteúdo”." });
    return;
  }
  playLesson(courseId, lesson.id);
}

export function toggleLessonCompleted(lessonId: string) {
  const library = useLibrary.getState();
  const done = !library.progress[lessonId]?.completed;
  library.setLessonCompleted(lessonId, done);
  return done;
}

/** Aula que está tocando agora, se o player estiver tocando este curso. */
export function currentLessonOf(course: Course | undefined) {
  const player = usePlayer.getState();
  if (!course || player.source?.type !== "course" || player.source.id !== course.id) return null;
  const videoId = player.queue[player.index];
  return videoId ? findLessonByVideo(course, videoId) : null;
}

/** Guarda título/canal/duração de um vídeo de aula sem colocá-lo na biblioteca de músicas. */
export function saveLessonVideoInfo(info: {
  id: string;
  title?: string;
  author?: string;
  duration?: number;
  thumbnail?: string;
}) {
  const library = useLibrary.getState();
  const existing = library.videos[info.id];
  const data = {
    ...(info.title ? { title: info.title, titleSource: "auto" as const } : {}),
    ...(info.author ? { author: info.author } : {}),
    ...(info.duration ? { duration: info.duration } : {}),
    ...(info.thumbnail ? { thumbnail: info.thumbnail } : {}),
  };
  if (existing) {
    // Não sobrescreve um título que você editou, nem tira o vídeo da biblioteca.
    if (existing.titleSource === "pending" || !info.title) library.updateVideo(info.id, data);
    else library.updateVideo(info.id, { ...data, title: existing.title, titleSource: existing.titleSource });
  } else {
    library.addVideo(info.id, { ...data, courseOnly: true });
  }
}

/** Adiciona aulas e já busca os títulos que faltarem. Retorna quantas entraram. */
export function addLessonsToSection(courseId: string, sectionId: string, videoIds: string[]) {
  const added = useLibrary.getState().addLessons(courseId, sectionId, videoIds);
  for (const id of videoIds) hydrateMetadata(id);
  return added;
}
