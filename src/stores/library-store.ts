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
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  videoIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface LibraryBackup {
  app: "sintonia";
  version: 1;
  exportedAt: string;
  videos: Video[];
  favorites: string[];
  playlists: Playlist[];
}

interface LibraryState {
  videos: Record<string, Video>;
  favorites: string[];
  playlists: Playlist[];
  /** IDs tocados recentemente, do mais novo para o mais antigo. */
  recent: string[];

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

  exportBackup: () => LibraryBackup;
  importBackup: (backup: LibraryBackup, mode: "merge" | "replace") => { videos: number; playlists: number };
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

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      videos: {},
      favorites: [],
      playlists: [],
      recent: [],

      addVideo: (id, data) => {
        const existing = get().videos[id];
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
          delete videos[id];
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

      exportBackup: () => {
        const { videos, favorites, playlists } = get();
        return {
          app: "sintonia",
          version: 1,
          exportedAt: new Date().toISOString(),
          videos: Object.values(videos),
          favorites,
          playlists,
        };
      },

      importBackup: (backup, mode) => {
        if (backup?.app !== "sintonia" || !Array.isArray(backup.videos)) {
          throw new Error("Arquivo de backup inválido.");
        }
        const incomingVideos = Object.fromEntries(backup.videos.map((v) => [v.id, v]));
        const incomingPlaylists = Array.isArray(backup.playlists) ? backup.playlists : [];
        const incomingFavorites = Array.isArray(backup.favorites) ? backup.favorites : [];

        if (mode === "replace") {
          set({
            videos: incomingVideos,
            favorites: incomingFavorites,
            playlists: incomingPlaylists,
            recent: [],
          });
        } else {
          set((s) => {
            const existingIds = new Set(s.playlists.map((p) => p.id));
            return {
              videos: { ...incomingVideos, ...s.videos },
              favorites: [...new Set([...s.favorites, ...incomingFavorites])],
              playlists: [...s.playlists, ...incomingPlaylists.filter((p) => !existingIds.has(p.id))],
            };
          });
        }
        return { videos: backup.videos.length, playlists: incomingPlaylists.length };
      },

      clearAll: () => set({ videos: {}, favorites: [], playlists: [], recent: [] }),
    }),
    {
      name: "sintonia:library",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Hidratamos manualmente (ver StoreHydrator) para não divergir do HTML do servidor.
      skipHydration: true,
      partialize: ({ videos, favorites, playlists, recent }) => ({ videos, favorites, playlists, recent }),
    }
  )
);

/* ---------- Seletores ---------- */

export function sortByAddedDesc(videos: Record<string, Video>) {
  return Object.values(videos).sort((a, b) => b.addedAt - a.addedAt);
}
