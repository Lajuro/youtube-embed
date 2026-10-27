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

interface UiState {
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
  setEmbedHost: (host: EmbedHost) => void;
  setAmbient: (value: boolean) => void;
  setAutoSkipErrors: (value: boolean) => void;
  setSearchProvider: (value: "google" | "server") => void;
  setGoogleCx: (value: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      embedHost: "www.youtube.com",
      ambient: true,
      autoSkipErrors: true,
      searchProvider: "google",
      googleCx: "",
      setEmbedHost: (embedHost) => set({ embedHost }),
      setAmbient: (ambient) => set({ ambient }),
      setAutoSkipErrors: (autoSkipErrors) => set({ autoSkipErrors }),
      setSearchProvider: (searchProvider) => set({ searchProvider }),
      setGoogleCx: (googleCx) => set({ googleCx: extractCx(googleCx) }),
    }),
    {
      name: "sintonia:settings",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ embedHost, ambient, autoSkipErrors, searchProvider, googleCx }) => ({
        embedHost,
        ambient,
        autoSkipErrors,
        searchProvider,
        googleCx,
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
