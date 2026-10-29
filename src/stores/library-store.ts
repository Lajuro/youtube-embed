"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { uid } from "@/lib/utils";

export interface Video {
  id: string;
  title: string;
  author?: string;
  /** Duração em segundos (descoberta quando o vídeo toca pela primeira vez). */
  duration?: number;
  isLive?: boolean;
  addedAt: number;
  lastPlayedAt?: number;
  playCount: number;
  /** "pending" = ainda sem título real; "manual" = editado por você (não sobrescrever). */
  titleSource: "pending" | "auto" | "manual";
  /** O dono do vídeo bloqueou a reprodução fora do YouTube. */
  unavailable?: boolean;
  /** Miniatura alternativa (ex.: vinda da busca do Google) caso o i.ytimg.com esteja bloqueado. */
  thumbnail?: string;
  /**
   * O vídeo só existe por causa de um curso (é uma aula). Fica fora da biblioteca de
   * músicas, mas o registro continua servindo de "cache" de título, canal e duração.
   */
  courseOnly?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  videoIds: string[];
  createdAt: number;
  updatedAt: number;
}

/* ---------- Cursos ---------- */

export interface Lesson {
  id: string;
  videoId: string;
  /** Título personalizado da aula (senão usa o título do vídeo). */
  title?: string;
}

export interface CourseSection {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  /** Instrutor, canal ou empresa. */
  author?: string;
  sections: CourseSection[];
  createdAt: number;
  updatedAt: number;
  /** Última aula aberta — usada no "Continuar de onde parei". */
  lastLessonId?: string;
  lastOpenedAt?: number;
}

export interface LessonProgress {
  /** Posição (segundos) onde você parou. */
  position: number;
  duration?: number;
  completed: boolean;
  completedAt?: number;
  updatedAt: number;
}

export interface LessonNote {
  id: string;
  courseId: string;
  lessonId: string;
  /** Momento do vídeo (segundos) em que a anotação foi feita. */
  time: number;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export interface CourseInput {
  title: string;
  description?: string;
  author?: string;
}

export interface LibraryBackup {
  app: "sintonia";
  version: 1 | 2;
  exportedAt: string;
  videos: Video[];
  favorites: string[];
  playlists: Playlist[];
  courses?: Course[];
  progress?: Record<string, LessonProgress>;
  notes?: LessonNote[];
}

interface LibraryState {
  videos: Record<string, Video>;
  favorites: string[];
  playlists: Playlist[];
  /** IDs tocados recentemente, do mais novo para o mais antigo. */
  recent: string[];
  courses: Course[];
  /** Progresso por aula (chave = id da aula). */
  progress: Record<string, LessonProgress>;
  notes: LessonNote[];

  addVideo: (id: string, data?: Partial<Omit<Video, "id">>) => { video: Video; created: boolean };
  updateVideo: (id: string, patch: Partial<Omit<Video, "id">>) => void;
  removeVideo: (id: string) => void;
  markPlayed: (id: string) => void;

  toggleFavorite: (id: string) => boolean;
  setFavorite: (id: string, value: boolean) => void;
  reorderFavorites: (from: number, to: number) => void;

  createPlaylist: (name: string, description?: string, videoIds?: string[]) => string;
  updatePlaylist: (id: string, patch: Partial<Pick<Playlist, "name" | "description">>) => void;
  deletePlaylist: (id: string) => void;
  duplicatePlaylist: (id: string) => string | null;
  addToPlaylist: (playlistId: string, videoIds: string[]) => number;
  removeFromPlaylist: (playlistId: string, videoId: string) => void;
  reorderPlaylist: (playlistId: string, from: number, to: number) => void;

  createCourse: (input: CourseInput, videoIds?: string[]) => string;
  updateCourse: (id: string, patch: Partial<CourseInput>) => void;
  deleteCourse: (id: string) => void;
  addSection: (courseId: string, title: string, afterSectionId?: string) => string;
  renameSection: (courseId: string, sectionId: string, title: string) => void;
  removeSection: (courseId: string, sectionId: string) => void;
  moveSection: (courseId: string, from: number, to: number) => void;
  /** Divide a seção: a aula `lessonIndex` e as seguintes vão para uma nova seção logo abaixo. */
  splitSection: (courseId: string, sectionId: string, lessonIndex: number, title: string) => string | null;
  /** Adiciona aulas ao fim da seção (ignora vídeos que já estão no curso). Retorna quantas entraram. */
  addLessons: (courseId: string, sectionId: string, videoIds: string[]) => number;
  renameLesson: (courseId: string, lessonId: string, title: string) => void;
  removeLesson: (courseId: string, lessonId: string) => void;
  /** Move uma aula para outra posição (na mesma seção ou em outra). */
  moveLesson: (courseId: string, lessonId: string, toSectionId: string, toIndex: number) => void;
  touchCourse: (courseId: string, lessonId: string) => void;
  saveProgress: (lessonId: string, patch: Partial<LessonProgress>) => void;
  setLessonCompleted: (lessonId: string, completed: boolean) => void;
  resetCourseProgress: (courseId: string) => void;
  addNote: (note: Omit<LessonNote, "id" | "createdAt" | "updatedAt">) => string;
  updateNote: (id: string, text: string) => void;
  deleteNote: (id: string) => void;

  exportBackup: () => LibraryBackup;
  importBackup: (
    backup: LibraryBackup,
    mode: "merge" | "replace"
  ) => { videos: number; playlists: number; courses: number };
  clearAll: () => void;
}

function placeholderTitle(id: string) {
  return `Vídeo ${id}`;
}

function move<T>(list: T[], from: number, to: number) {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/** Todos os IDs de vídeo usados em algum curso. */
function courseVideoIds(courses: Course[]) {
  const ids = new Set<string>();
  for (const c of courses) for (const sec of c.sections) for (const l of sec.lessons) ids.add(l.videoId);
  return ids;
}

/** Apaga registros de vídeos que só existiam por causa de cursos e não são mais usados. */
function collectGarbage(videos: Record<string, Video>, courses: Course[], candidates: Iterable<string>) {
  const used = courseVideoIds(courses);
  let next = videos;
  for (const id of candidates) {
    if (next[id]?.courseOnly && !used.has(id)) {
      if (next === videos) next = { ...videos };
      delete next[id];
    }
  }
  return next;
}

function lessonIdsOf(course: Course | undefined) {
  return course ? course.sections.flatMap((s) => s.lessons.map((l) => l.id)) : [];
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      videos: {},
      favorites: [],
      playlists: [],
      recent: [],
      courses: [],
      progress: {},
      notes: [],

      addVideo: (id, data) => {
        const existing = get().videos[id];
        // Um vídeo que era só de curso entrando na biblioteca conta como "novo" para você.
        if (existing?.courseOnly && data?.courseOnly === false) {
          get().updateVideo(id, { ...data, addedAt: Date.now() });
          return { video: get().videos[id], created: true };
        }
        if (existing) {
          // Completa informações que ainda não tínhamos, sem sobrescrever edições manuais.
          if (data && Object.keys(data).length) get().updateVideo(id, data);
          return { video: get().videos[id], created: false };
        }
        const video: Video = {
          id,
          title: placeholderTitle(id),
          playCount: 0,
          addedAt: Date.now(),
          titleSource: "pending",
          ...data,
        };
        set((s) => ({ videos: { ...s.videos, [id]: video } }));
        return { video, created: true };
      },

      updateVideo: (id, patch) =>
        set((s) => {
          const current = s.videos[id];
          if (!current) return s;
          const next = { ...current, ...patch };
          // Título editado à mão tem prioridade sobre o que vier automaticamente.
          if (current.titleSource === "manual" && patch.titleSource === "auto") {
            next.title = current.title;
            next.titleSource = "manual";
          }
          return { videos: { ...s.videos, [id]: next } };
        }),

      removeVideo: (id) =>
        set((s) => {
          const videos = { ...s.videos };
          // Se for aula de algum curso, só sai da biblioteca (o registro continua para o curso).
          if (courseVideoIds(s.courses).has(id) && videos[id]) videos[id] = { ...videos[id], courseOnly: true };
          else delete videos[id];
          return {
            videos,
            favorites: s.favorites.filter((v) => v !== id),
            recent: s.recent.filter((v) => v !== id),
            playlists: s.playlists.map((p) =>
              p.videoIds.includes(id)
                ? { ...p, videoIds: p.videoIds.filter((v) => v !== id), updatedAt: Date.now() }
                : p
            ),
          };
        }),

      markPlayed: (id) =>
        set((s) => {
          const current = s.videos[id];
          if (!current) return s;
          return {
            videos: {
              ...s.videos,
              [id]: { ...current, playCount: current.playCount + 1, lastPlayedAt: Date.now() },
            },
            recent: [id, ...s.recent.filter((v) => v !== id)].slice(0, 40),
          };
        }),

      toggleFavorite: (id) => {
        const isFav = get().favorites.includes(id);
        get().setFavorite(id, !isFav);
        return !isFav;
      },

      setFavorite: (id, value) =>
        set((s) => {
          const has = s.favorites.includes(id);
          if (value === has) return s;
          return { favorites: value ? [id, ...s.favorites] : s.favorites.filter((v) => v !== id) };
        }),

      reorderFavorites: (from, to) => set((s) => ({ favorites: move(s.favorites, from, to) })),

      createPlaylist: (name, description, videoIds = []) => {
        const id = uid();
        const now = Date.now();
        set((s) => ({
          playlists: [
            ...s.playlists,
            {
              id,
              name: name.trim() || "Nova playlist",
              description: description?.trim() || undefined,
              videoIds: [...new Set(videoIds)],
              createdAt: now,
              updatedAt: now,
            },
          ],
        }));
        return id;
      },

      updatePlaylist: (id, patch) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...patch,
                  name: patch.name !== undefined ? patch.name.trim() || p.name : p.name,
                  description:
                    patch.description !== undefined ? patch.description.trim() || undefined : p.description,
                  updatedAt: Date.now(),
                }
              : p
          ),
        })),

      deletePlaylist: (id) => set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) })),

      duplicatePlaylist: (id) => {
        const source = get().playlists.find((p) => p.id === id);
        if (!source) return null;
        return get().createPlaylist(`${source.name} (cópia)`, source.description, source.videoIds);
      },

      addToPlaylist: (playlistId, videoIds) => {
        let added = 0;
        set((s) => ({
          playlists: s.playlists.map((p) => {
            if (p.id !== playlistId) return p;
            const fresh = videoIds.filter((v) => !p.videoIds.includes(v));
            added = fresh.length;
            if (!fresh.length) return p;
            return { ...p, videoIds: [...p.videoIds, ...fresh], updatedAt: Date.now() };
          }),
        }));
        return added;
      },

      removeFromPlaylist: (playlistId, videoId) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === playlistId
              ? { ...p, videoIds: p.videoIds.filter((v) => v !== videoId), updatedAt: Date.now() }
              : p
          ),
        })),

      reorderPlaylist: (playlistId, from, to) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === playlistId ? { ...p, videoIds: move(p.videoIds, from, to), updatedAt: Date.now() } : p
          ),
        })),

      /* ---------- Cursos ---------- */

      createCourse: (input, videoIds = []) => {
        const id = uid();
        const now = Date.now();
        const course: Course = {
          id,
          title: input.title.trim() || "Novo curso",
          description: input.description?.trim() || undefined,
          author: input.author?.trim() || undefined,
          sections: [{ id: uid(), title: "Introdução", lessons: [] }],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ courses: [...s.courses, course] }));
        if (videoIds.length) get().addLessons(id, course.sections[0].id, videoIds);
        return id;
      },

      updateCourse: (id, patch) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === id
              ? {
                  ...c,
                  title: patch.title !== undefined ? patch.title.trim() || c.title : c.title,
                  description: patch.description !== undefined ? patch.description.trim() || undefined : c.description,
                  author: patch.author !== undefined ? patch.author.trim() || undefined : c.author,
                  updatedAt: Date.now(),
                }
              : c
          ),
        })),

      deleteCourse: (id) =>
        set((s) => {
          const course = s.courses.find((c) => c.id === id);
          if (!course) return s;
          const courses = s.courses.filter((c) => c.id !== id);
          const lessonIds = new Set(lessonIdsOf(course));
          const progress = Object.fromEntries(Object.entries(s.progress).filter(([k]) => !lessonIds.has(k)));
          const videoIds = course.sections.flatMap((sec) => sec.lessons.map((l) => l.videoId));
          return {
            courses,
            progress,
            notes: s.notes.filter((n) => n.courseId !== id),
            videos: collectGarbage(s.videos, courses, videoIds),
          };
        }),

      addSection: (courseId, title, afterSectionId) => {
        const section: CourseSection = { id: uid(), title: title.trim() || "Nova seção", lessons: [] };
        set((s) => ({
          courses: s.courses.map((c) => {
            if (c.id !== courseId) return c;
            const sections = [...c.sections];
            const at = afterSectionId ? sections.findIndex((x) => x.id === afterSectionId) + 1 : sections.length;
            sections.splice(at > 0 ? at : sections.length, 0, section);
            return { ...c, sections, updatedAt: Date.now() };
          }),
        }));
        return section.id;
      },

      renameSection: (courseId, sectionId, title) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === courseId
              ? {
                  ...c,
                  sections: c.sections.map((sec) =>
                    sec.id === sectionId ? { ...sec, title: title.trim() || sec.title } : sec
                  ),
                  updatedAt: Date.now(),
                }
              : c
          ),
        })),

      removeSection: (courseId, sectionId) =>
        set((s) => {
          const course = s.courses.find((c) => c.id === courseId);
          const section = course?.sections.find((x) => x.id === sectionId);
          if (!course || !section) return s;
          const courses = s.courses.map((c) =>
            c.id === courseId
              ? { ...c, sections: c.sections.filter((x) => x.id !== sectionId), updatedAt: Date.now() }
              : c
          );
          const removed = new Set(section.lessons.map((l) => l.id));
          return {
            courses,
            notes: s.notes.filter((n) => !removed.has(n.lessonId)),
            progress: Object.fromEntries(Object.entries(s.progress).filter(([k]) => !removed.has(k))),
            videos: collectGarbage(s.videos, courses, section.lessons.map((l) => l.videoId)),
          };
        }),

      moveSection: (courseId, from, to) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === courseId ? { ...c, sections: move(c.sections, from, to), updatedAt: Date.now() } : c
          ),
        })),

      splitSection: (courseId, sectionId, lessonIndex, title) => {
        const course = get().courses.find((c) => c.id === courseId);
        const index = course?.sections.findIndex((x) => x.id === sectionId) ?? -1;
        if (!course || index === -1 || lessonIndex <= 0) return null;
        const section = course.sections[index];
        if (lessonIndex >= section.lessons.length) return null;
        const created: CourseSection = {
          id: uid(),
          title: title.trim() || "Nova seção",
          lessons: section.lessons.slice(lessonIndex),
        };
        const sections = [...course.sections];
        sections.splice(index, 1, { ...section, lessons: section.lessons.slice(0, lessonIndex) }, created);
        set((s) => ({
          courses: s.courses.map((c) => (c.id === courseId ? { ...c, sections, updatedAt: Date.now() } : c)),
        }));
        return created.id;
      },

      addLessons: (courseId, sectionId, videoIds) => {
        const course = get().courses.find((c) => c.id === courseId);
        if (!course || !course.sections.some((x) => x.id === sectionId)) return 0;
        const existing = courseVideoIds([course]);
        const fresh = [...new Set(videoIds)].filter((id) => !existing.has(id));
        if (!fresh.length) return 0;
        // Garante um registro para cada vídeo (marcado como "só de curso" se for novo).
        for (const id of fresh) {
          if (!get().videos[id]) get().addVideo(id, { courseOnly: true });
        }
        const lessons = fresh.map((videoId) => ({ id: uid(), videoId }));
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === courseId
              ? {
                  ...c,
                  sections: c.sections.map((sec) =>
                    sec.id === sectionId ? { ...sec, lessons: [...sec.lessons, ...lessons] } : sec
                  ),
                  updatedAt: Date.now(),
                }
              : c
          ),
        }));
        return fresh.length;
      },

      renameLesson: (courseId, lessonId, title) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === courseId
              ? {
                  ...c,
                  sections: c.sections.map((sec) => ({
                    ...sec,
                    lessons: sec.lessons.map((l) =>
                      l.id === lessonId ? { ...l, title: title.trim() || undefined } : l
                    ),
                  })),
                  updatedAt: Date.now(),
                }
              : c
          ),
        })),

      removeLesson: (courseId, lessonId) =>
        set((s) => {
          let videoId: string | undefined;
          const courses = s.courses.map((c) => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              sections: c.sections.map((sec) => {
                const lesson = sec.lessons.find((l) => l.id === lessonId);
                if (!lesson) return sec;
                videoId = lesson.videoId;
                return { ...sec, lessons: sec.lessons.filter((l) => l.id !== lessonId) };
              }),
              lastLessonId: c.lastLessonId === lessonId ? undefined : c.lastLessonId,
              updatedAt: Date.now(),
            };
          });
          const progress = { ...s.progress };
          delete progress[lessonId];
          return {
            courses,
            progress,
            notes: s.notes.filter((n) => n.lessonId !== lessonId),
            videos: videoId ? collectGarbage(s.videos, courses, [videoId]) : s.videos,
          };
        }),

      moveLesson: (courseId, lessonId, toSectionId, toIndex) =>
        set((s) => ({
          courses: s.courses.map((c) => {
            if (c.id !== courseId) return c;
            let lesson: Lesson | undefined;
            const without = c.sections.map((sec) => {
              const found = sec.lessons.find((l) => l.id === lessonId);
              if (!found) return sec;
              lesson = found;
              return { ...sec, lessons: sec.lessons.filter((l) => l.id !== lessonId) };
            });
            if (!lesson) return c;
            const moved = lesson;
            return {
              ...c,
              sections: without.map((sec) => {
                if (sec.id !== toSectionId) return sec;
                const lessons = [...sec.lessons];
                lessons.splice(Math.max(0, Math.min(toIndex, lessons.length)), 0, moved);
                return { ...sec, lessons };
              }),
              updatedAt: Date.now(),
            };
          }),
        })),

      touchCourse: (courseId, lessonId) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === courseId ? { ...c, lastLessonId: lessonId, lastOpenedAt: Date.now() } : c
          ),
        })),

      saveProgress: (lessonId, patch) =>
        set((s) => {
          const current = s.progress[lessonId] ?? { position: 0, completed: false, updatedAt: 0 };
          return { progress: { ...s.progress, [lessonId]: { ...current, ...patch, updatedAt: Date.now() } } };
        }),

      setLessonCompleted: (lessonId, completed) =>
        get().saveProgress(lessonId, { completed, completedAt: completed ? Date.now() : undefined }),

      resetCourseProgress: (courseId) =>
        set((s) => {
          const ids = new Set(lessonIdsOf(s.courses.find((c) => c.id === courseId)));
          return {
            progress: Object.fromEntries(Object.entries(s.progress).filter(([k]) => !ids.has(k))),
            courses: s.courses.map((c) => (c.id === courseId ? { ...c, lastLessonId: undefined } : c)),
          };
        }),

      addNote: (note) => {
        const id = uid();
        const now = Date.now();
        set((s) => ({ notes: [...s.notes, { ...note, id, createdAt: now, updatedAt: now }] }));
        return id;
      },

      updateNote: (id, text) =>
        set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, text, updatedAt: Date.now() } : n)) })),

      deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

      exportBackup: () => {
        const { videos, favorites, playlists, courses, progress, notes } = get();
        return {
          app: "sintonia",
          version: 2,
          exportedAt: new Date().toISOString(),
          videos: Object.values(videos),
          favorites,
          playlists,
          courses,
          progress,
          notes,
        };
      },

      importBackup: (backup, mode) => {
        if (backup?.app !== "sintonia" || !Array.isArray(backup.videos)) {
          throw new Error("Arquivo de backup inválido.");
        }
        const incomingVideos = Object.fromEntries(backup.videos.map((v) => [v.id, v]));
        const incomingPlaylists = Array.isArray(backup.playlists) ? backup.playlists : [];
        const incomingFavorites = Array.isArray(backup.favorites) ? backup.favorites : [];
        const incomingCourses = Array.isArray(backup.courses) ? backup.courses : [];
        const incomingProgress = backup.progress && typeof backup.progress === "object" ? backup.progress : {};
        const incomingNotes = Array.isArray(backup.notes) ? backup.notes : [];

        if (mode === "replace") {
          set({
            videos: incomingVideos,
            favorites: incomingFavorites,
            playlists: incomingPlaylists,
            recent: [],
            courses: incomingCourses,
            progress: incomingProgress,
            notes: incomingNotes,
          });
        } else {
          set((s) => {
            const existingIds = new Set(s.playlists.map((p) => p.id));
            const existingCourses = new Set(s.courses.map((c) => c.id));
            const existingNotes = new Set(s.notes.map((n) => n.id));
            // Um vídeo que está na biblioteca de um lado não pode virar "só de curso" na junção.
            const videos = { ...incomingVideos, ...s.videos };
            for (const [id, v] of Object.entries(incomingVideos)) {
              if (s.videos[id]?.courseOnly && !v.courseOnly) videos[id] = { ...s.videos[id], courseOnly: false };
            }
            return {
              videos,
              favorites: [...new Set([...s.favorites, ...incomingFavorites])],
              playlists: [...s.playlists, ...incomingPlaylists.filter((p) => !existingIds.has(p.id))],
              courses: [...s.courses, ...incomingCourses.filter((c) => !existingCourses.has(c.id))],
              progress: { ...incomingProgress, ...s.progress },
              notes: [...s.notes, ...incomingNotes.filter((n) => !existingNotes.has(n.id))],
            };
          });
        }
        return { videos: backup.videos.length, playlists: incomingPlaylists.length, courses: incomingCourses.length };
      },

      clearAll: () =>
        set({ videos: {}, favorites: [], playlists: [], recent: [], courses: [], progress: {}, notes: [] }),
    }),
    {
      name: "sintonia:library",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Hidratamos manualmente (ver StoreHydrator) para não divergir do HTML do servidor.
      skipHydration: true,
      partialize: ({ videos, favorites, playlists, recent, courses, progress, notes }) => ({
        videos,
        favorites,
        playlists,
        recent,
        courses,
        progress,
        notes,
      }),
    }
  )
);

/* ---------- Seletores ---------- */

/** Vídeos da biblioteca (sem as aulas que só existem dentro de cursos), mais novos primeiro. */
export function sortByAddedDesc(videos: Record<string, Video>) {
  return Object.values(videos)
    .filter((v) => !v.courseOnly)
    .sort((a, b) => b.addedAt - a.addedAt);
}

export function isInLibrary(video: Video | undefined) {
  return Boolean(video && !video.courseOnly);
}

export function countLibraryVideos(videos: Record<string, Video>) {
  let n = 0;
  for (const v of Object.values(videos)) if (!v.courseOnly) n++;
  return n;
}

export function courseLessons(course: Course) {
  return course.sections.flatMap((s) => s.lessons);
}

export function findLesson(course: Course, lessonId: string) {
  for (const section of course.sections) {
    const index = section.lessons.findIndex((l) => l.id === lessonId);
    if (index !== -1) return { section, lesson: section.lessons[index], index };
  }
  return null;
}
