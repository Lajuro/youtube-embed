"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { COMPLETE_AT, findLessonByVideo, resumePosition } from "@/lib/courses";
import { onProbedTitle } from "@/lib/youtube-prober";
import { courseLessons, useLibrary } from "@/stores/library-store";
import { setStartResolver, usePlayer } from "@/stores/player-store";
import { useStats } from "@/stores/stats-store";

/** Comemora quando a aula recém-concluída era a última que faltava. */
function celebrateIfDone(courseId: string, lessonId: string) {
  const { courses, progress } = useLibrary.getState();
  const course = courses.find((c) => c.id === courseId);
  if (!course) return;
  const lessons = courseLessons(course);
  if (lessons.length && lessons.every((l) => l.id === lessonId || progress[l.id]?.completed)) {
    toast.success(`Você concluiu “${course.title}”! 🎉`, { description: "Parabéns pela dedicação.", duration: 8000 });
  }
}

/** Intervalo mínimo entre gravações da posição da aula no localStorage. */
const SAVE_EVERY_MS = 5_000;
/** De quanto em quanto tempo o tempo ouvido/estudado do dia é somado. */
const STATS_EVERY_MS = 10_000;

/**
 * Tarefas que rodam em segundo plano, sem interface:
 *  - progresso dos cursos (posição da aula, conclusão automática, "última aula aberta");
 *  - retomar a aula de onde você parou quando ela começa a tocar;
 *  - títulos descobertos pela sonda do player (quando o oEmbed está bloqueado);
 *  - estatísticas do dia (minutos de música e de estudo, para a tela inicial).
 */
export function BackgroundSync() {
  useEffect(() => {
    // Quando o player for tocar um vídeo de curso, começa do ponto salvo.
    setStartResolver((videoId, source) => {
      if (source?.type !== "course") return 0;
      const course = useLibrary.getState().courses.find((c) => c.id === source.id);
      const found = course && findLessonByVideo(course, videoId);
      return found ? resumePosition(found.lesson.id) : 0;
    });

    let lastSave = 0;
    let lastLessonId: string | null = null;

    const unsubscribe = usePlayer.subscribe((state, prev) => {
      if (state.source?.type !== "course") return;
      const library = useLibrary.getState();
      const course = library.courses.find((c) => c.id === state.source?.id);
      const videoId = state.queue[state.index];
      const found = course && videoId ? findLessonByVideo(course, videoId) : null;
      if (!course || !found) return;
      const lessonId = found.lesson.id;

      if (lessonId !== lastLessonId) {
        lastLessonId = lessonId;
        lastSave = 0;
        if (course.lastLessonId !== lessonId) library.touchCourse(course.id, lessonId);
      }

      const progress = library.progress[lessonId];
      const duration = state.duration > 0 && !state.isLive ? state.duration : undefined;

      // Terminou o vídeo: aula concluída (e a próxima volta do começo se você rever esta).
      if (state.status === "ended" && prev.status !== "ended") {
        library.saveProgress(lessonId, { completed: true, completedAt: progress?.completedAt ?? Date.now(), position: 0, duration });
        if (!progress?.completed) celebrateIfDone(course.id, lessonId);
        return;
      }

      const paused = state.status === "paused" && prev.status === "playing";
      const now = Date.now();
      if ((state.status === "playing" && now - lastSave >= SAVE_EVERY_MS) || paused) {
        if (state.currentTime > 0) {
          lastSave = now;
          library.saveProgress(lessonId, { position: Math.floor(state.currentTime), duration });
        }
      }

      if (duration && !progress?.completed && state.currentTime >= duration * COMPLETE_AT) {
        library.setLessonCompleted(lessonId, true);
        celebrateIfDone(course.id, lessonId);
      }
    });

    const stopProbe = onProbedTitle(({ id, title, author, duration }) => {
      const video = useLibrary.getState().videos[id];
      if (!video) return;
      if (video.titleSource === "pending") {
        useLibrary.getState().updateVideo(id, { title, author: author ?? video.author, titleSource: "auto" });
      }
      if (duration && !video.duration) useLibrary.getState().updateVideo(id, { duration });
    });

    // Tempo tocando hoje. Conta pela diferença entre os relógios (abas em segundo plano
    // podem atrasar os timers); o teto evita somar horas se o computador dormiu.
    let lastTick = Date.now();
    const statsTimer = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.min(now - lastTick, 2 * STATS_EVERY_MS) / 1000;
      lastTick = now;
      const { status, source } = usePlayer.getState();
      if (status === "playing") useStats.getState().addTime(source?.type === "course" ? "study" : "listen", Math.round(elapsed));
    }, STATS_EVERY_MS);

    return () => {
      setStartResolver(null);
      unsubscribe();
      stopProbe();
      clearInterval(statsTimer);
    };
  }, []);

  return null;
}
