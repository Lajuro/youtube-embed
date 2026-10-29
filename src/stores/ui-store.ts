"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { EmbedHost } from "@/lib/youtube";

interface AddDialogState {
  open: boolean;
  initialValue?: string;
  /** Se definido, os vídeos adicionados entram direto nesta playlist. */
  playlistId?: string;
}

interface PlaylistDialogState {
  open: boolean;
  /** Editar uma playlist existente (sem id = criar nova). */
  playlistId?: string;
  /** Vídeos para incluir na playlist recém-criada. */
  videoIds?: string[];
}

interface CourseDialogState {
  open: boolean;
  /** Editar um curso existente (sem id = criar novo). */
  courseId?: string;
}

interface UiState {
  /**
   * Modo foco: a página ocupa a tela inteira, sem menu lateral, barra do topo e barra
   * do player (usado na sala de aula dos cursos).
   */
  focusMode: boolean;
  setFocusMode: (value: boolean) => void;
  courseDialog: CourseDialogState;
  openCourseDialog: (options?: Omit<CourseDialogState, "open">) => void;
  closeCourseDialog: () => void;
  addDialog: AddDialogState;
  playlistDialog: PlaylistDialogState;
  editVideoId: string | null;
  commandOpen: boolean;
  settingsOpen: boolean;
  shortcutsOpen: boolean;
  mobileNavOpen: boolean;

  openAddDialog: (options?: Omit<AddDialogState, "open">) => void;
  closeAddDialog: () => void;
  openPlaylistDialog: (options?: Omit<PlaylistDialogState, "open">) => void;
  closePlaylistDialog: () => void;
  setEditVideoId: (id: string | null) => void;
  setCommandOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
}

export const useUi = create<UiState>()((set) => ({
  focusMode: false,
  setFocusMode: (focusMode) => set({ focusMode }),
  courseDialog: { open: false },
  openCourseDialog: (options) => set({ courseDialog: { open: true, ...options } }),
  closeCourseDialog: () => set((s) => ({ courseDialog: { ...s.courseDialog, open: false } })),
  addDialog: { open: false },
  playlistDialog: { open: false },
  editVideoId: null,
  commandOpen: false,
  settingsOpen: false,
  shortcutsOpen: false,
  mobileNavOpen: false,

  openAddDialog: (options) => set({ addDialog: { open: true, ...options } }),
  closeAddDialog: () => set((s) => ({ addDialog: { ...s.addDialog, open: false } })),
  openPlaylistDialog: (options) => set({ playlistDialog: { open: true, ...options } }),
  closePlaylistDialog: () => set((s) => ({ playlistDialog: { ...s.playlistDialog, open: false } })),
  setEditVideoId: (editVideoId) => set({ editVideoId }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
}));

interface SettingsState {
  embedHost: EmbedHost;
  /** Fundo com as cores da capa do vídeo atual. */
  ambient: boolean;
  /** Pular automaticamente vídeos que não podem ser incorporados. */
  autoSkipErrors: boolean;
  /**
   * Onde a busca acontece:
   * - "google": no navegador, pelo Google (Programmable Search Element) — precisa do `googleCx`;
   * - "server": no servidor do app, direto no YouTube — só funciona se o servidor alcança o youtube.com.
   */
  searchProvider: "google" | "server";
  /** ID do mecanismo de pesquisa do Google (não é chave de API). */
  googleCx: string;
  /** Menu lateral recolhido (só ícones). */
  sidebarCollapsed: boolean;
  /** Modo cinema na sala de aula: esconde o conteúdo do curso e o vídeo ocupa a largura toda. */
  courseTheater: boolean;
  /** Ir sozinho para a próxima aula quando uma termina. */
  courseAutoplay: boolean;
  /** Mostrar a fila ao lado do vídeo na tela "Tocando agora" (desligado = modo cinema). */
  nowPlayingQueue: boolean;
  setEmbedHost: (host: EmbedHost) => void;
  setAmbient: (value: boolean) => void;
  setAutoSkipErrors: (value: boolean) => void;
  setSearchProvider: (value: "google" | "server") => void;
  setGoogleCx: (value: string) => void;
  toggleSidebar: () => void;
  setCourseTheater: (value: boolean) => void;
  setCourseAutoplay: (value: boolean) => void;
  setNowPlayingQueue: (value: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      embedHost: "www.youtube.com",
      ambient: true,
      autoSkipErrors: true,
      searchProvider: "google",
      googleCx: "",
      sidebarCollapsed: false,
      courseTheater: false,
      courseAutoplay: true,
      nowPlayingQueue: true,
      setEmbedHost: (embedHost) => set({ embedHost }),
      setAmbient: (ambient) => set({ ambient }),
      setAutoSkipErrors: (autoSkipErrors) => set({ autoSkipErrors }),
      setSearchProvider: (searchProvider) => set({ searchProvider }),
      setGoogleCx: (googleCx) => set({ googleCx: extractCx(googleCx) }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setCourseTheater: (courseTheater) => set({ courseTheater }),
      setCourseAutoplay: (courseAutoplay) => set({ courseAutoplay }),
      setNowPlayingQueue: (nowPlayingQueue) => set({ nowPlayingQueue }),
    }),
    {
      name: "sintonia:settings",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        embedHost: s.embedHost,
        ambient: s.ambient,
        autoSkipErrors: s.autoSkipErrors,
        searchProvider: s.searchProvider,
        googleCx: s.googleCx,
        sidebarCollapsed: s.sidebarCollapsed,
        courseTheater: s.courseTheater,
        courseAutoplay: s.courseAutoplay,
        nowPlayingQueue: s.nowPlayingQueue,
      }),
    }
  )
);

/**
 * Aceita o ID puro ou qualquer coisa que o contenha — o código de incorporação
 * (`<script src="https://cse.google.com/cse.js?cx=...">`) ou o link público
 * (`https://cse.google.com/cse?cx=...`).
 */
export function extractCx(value: string) {
  const trimmed = value.trim();
  return trimmed.match(/[?&]cx=([\w:-]+)/)?.[1] ?? trimmed.replace(/[^\w:-]/g, "");
}

/** Marca quando os dados do localStorage já foram carregados. */
export const useHydration = create<{ hydrated: boolean; setHydrated: () => void }>()((set) => ({
  hydrated: false,
  setHydrated: () => set({ hydrated: true }),
}));

/** Últimas buscas feitas no YouTube (para os atalhos na tela de busca). */
export const useSearchHistory = create<{
  items: string[];
  add: (query: string) => void;
  remove: (query: string) => void;
  clear: () => void;
}>()(
  persist(
    (set) => ({
      items: [],
      add: (query) =>
        set((s) => {
          const q = query.trim();
          if (!q) return s;
          return { items: [q, ...s.items.filter((i) => i.toLowerCase() !== q.toLowerCase())].slice(0, 12) };
        }),
      remove: (query) => set((s) => ({ items: s.items.filter((i) => i !== query) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "sintonia:search-history",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
