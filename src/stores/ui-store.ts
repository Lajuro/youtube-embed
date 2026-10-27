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
  setEmbedHost: (host: EmbedHost) => void;
  setAmbient: (value: boolean) => void;
  setAutoSkipErrors: (value: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      embedHost: "www.youtube.com",
      ambient: true,
      autoSkipErrors: true,
      setEmbedHost: (embedHost) => set({ embedHost }),
      setAmbient: (ambient) => set({ ambient }),
      setAutoSkipErrors: (autoSkipErrors) => set({ autoSkipErrors }),
    }),
    {
      name: "sintonia:settings",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ embedHost, ambient, autoSkipErrors }) => ({ embedHost, ambient, autoSkipErrors }),
    }
  )
);

/** Marca quando os dados do localStorage já foram carregados. */
export const useHydration = create<{ hydrated: boolean; setHydrated: () => void }>()((set) => ({
  hydrated: false,
  setHydrated: () => set({ hydrated: true }),
}));
