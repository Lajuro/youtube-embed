"use client";

import { toast } from "sonner";

import { isInLibrary, useLibrary, type Video } from "@/stores/library-store";
import { usePlayer, type QueueSource } from "@/stores/player-store";
import { fetchVideoMetadata, watchUrl } from "@/lib/youtube";
import { probeTitles } from "@/lib/youtube-prober";
import { pluralize } from "@/lib/utils";

/**
 * Ações de alto nível usadas pela interface. Ficam fora dos componentes para
 * serem reaproveitadas em menus, atalhos de teclado e na paleta de comandos.
 */

/** Busca título/canal em segundo plano e atualiza o vídeo quando chegar. */
export function hydrateMetadata(id: string) {
  const video = useLibrary.getState().videos[id];
  if (!video || video.titleSource !== "pending") return;
  fetchVideoMetadata(id).then((meta) => {
    // oEmbed bloqueado (comum em rede corporativa): pergunta ao próprio player, escondido.
    if (!meta) {
      probeTitles([id]);
      return;
    }
    useLibrary.getState().updateVideo(id, {
      title: meta.title,
      author: meta.author,
      titleSource: "auto",
    });
  });
}

/** Adiciona vários vídeos à biblioteca. Retorna quantos eram novos. */
export function addVideosToLibrary(ids: string[], extra?: Partial<Omit<Video, "id">>) {
  const { addVideo } = useLibrary.getState();
  let created = 0;
  for (const id of ids) {
    const result = addVideo(id, { ...extra, courseOnly: false });
    if (result.created) created++;
    hydrateMetadata(id);
  }
  return created;
}

export function toggleFavorite(id: string) {
  const library = useLibrary.getState();
  // Favoritar uma aula também a coloca na biblioteca (senão ela sumiria da lista de favoritos).
  if (!isInLibrary(library.videos[id])) addVideosToLibrary([id]);
  const isFav = library.toggleFavorite(id);
  const title = useLibrary.getState().videos[id]?.title;
  toast(isFav ? "Adicionado aos favoritos" : "Removido dos favoritos", {
    description: title,
    action: {
      label: "Desfazer",
      onClick: () => useLibrary.getState().setFavorite(id, !isFav),
    },
  });
}

export function addToPlaylist(playlistId: string, ids: string[]) {
  const library = useLibrary.getState();
  const playlist = library.playlists.find((p) => p.id === playlistId);
  if (!playlist) return;
  addVideosToLibrary(ids);
  const added = library.addToPlaylist(playlistId, ids);
  if (added === 0) {
    toast.info(`Já está em “${playlist.name}”`);
  } else {
    toast.success(`${pluralize(added, "vídeo adicionado", "vídeos adicionados")} a “${playlist.name}”`);
  }
}

export function removeFromPlaylist(playlistId: string, videoId: string) {
  const library = useLibrary.getState();
  const playlist = library.playlists.find((p) => p.id === playlistId);
  if (!playlist) return;
  const position = playlist.videoIds.indexOf(videoId);
  library.removeFromPlaylist(playlistId, videoId);
  toast(`Removido de “${playlist.name}”`, {
    action: {
      label: "Desfazer",
      onClick: () => {
        const lib = useLibrary.getState();
        lib.addToPlaylist(playlistId, [videoId]);
        const current = lib.playlists.find((p) => p.id === playlistId);
        if (current) lib.reorderPlaylist(playlistId, current.videoIds.length - 1, position);
      },
    },
  });
}

export function removeFromLibrary(id: string) {
  const library = useLibrary.getState();
  const snapshot = {
    video: library.videos[id],
    favoriteIndex: library.favorites.indexOf(id),
    playlists: library.playlists
      .filter((p) => p.videoIds.includes(id))
      .map((p) => ({ id: p.id, index: p.videoIds.indexOf(id) })),
  };
  if (!snapshot.video) return;
  library.removeVideo(id);

  // Se estiver na fila, tira de lá também.
  const player = usePlayer.getState();
  for (let i = player.queue.length - 1; i >= 0; i--) {
    if (usePlayer.getState().queue[i] === id) usePlayer.getState().removeFromQueue(i);
  }

  toast("Vídeo removido da biblioteca", {
    description: snapshot.video.title,
    action: {
      label: "Desfazer",
      onClick: () => {
        const lib = useLibrary.getState();
        lib.addVideo(id, snapshot.video);
        if (snapshot.favoriteIndex !== -1) {
          lib.setFavorite(id, true);
          lib.reorderFavorites(0, Math.min(snapshot.favoriteIndex, lib.favorites.length - 1));
        }
        for (const p of snapshot.playlists) {
          lib.addToPlaylist(p.id, [id]);
          const current = useLibrary.getState().playlists.find((pl) => pl.id === p.id);
          if (current) lib.reorderPlaylist(p.id, current.videoIds.length - 1, p.index);
        }
      },
    },
  });
}

export function playList(ids: string[], startIndex = 0, source?: QueueSource, shuffle = false) {
  if (!ids.length) {
    toast.info("Nada para tocar por aqui ainda.");
    return;
  }
  const player = usePlayer.getState();
  if (shuffle) {
    // Liga o aleatório antes de montar a fila e escolhe um ponto de partida qualquer.
    usePlayer.setState({ shuffle: true });
    player.playQueue(ids, Math.floor(Math.random() * ids.length), source ?? null);
    return;
  }
  player.playQueue(ids, startIndex, source ?? null);
}

export function playNext(ids: string[]) {
  usePlayer.getState().playNext(ids);
  toast.success(ids.length === 1 ? "Vai tocar em seguida" : `${ids.length} vídeos vão tocar em seguida`);
}

export function addToQueue(ids: string[]) {
  usePlayer.getState().addToQueue(ids);
  toast.success(ids.length === 1 ? "Adicionado à fila" : `${ids.length} vídeos adicionados à fila`);
}

export async function copyVideoLink(id: string) {
  try {
    await navigator.clipboard.writeText(watchUrl(id));
    toast.success("Link copiado");
  } catch {
    toast.error("Não foi possível copiar o link");
  }
}

export function downloadBackup() {
  const data = useLibrary.getState().exportBackup();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sintonia-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Backup exportado", {
    description: `${pluralize(data.videos.length, "vídeo", "vídeos")}, ${pluralize(data.playlists.length, "playlist", "playlists")} e ${pluralize(data.courses?.length ?? 0, "curso", "cursos")}`,
  });
}

/** Dados que a busca já traz — evita esperar o oEmbed/player para ter título e duração. */
export interface KnownVideoInfo {
  id: string;
  title: string;
  author?: string;
  duration?: number;
  isLive?: boolean;
  thumbnail?: string;
}

/** Garante que o vídeo está na biblioteca, já com título, canal e duração. */
export function saveVideoInfo(info: KnownVideoInfo) {
  const { addVideo } = useLibrary.getState();
  const { created } = addVideo(info.id, {
    title: info.title,
    author: info.author,
    duration: info.duration,
    isLive: info.isLive || undefined,
    thumbnail: info.thumbnail,
    titleSource: "auto",
    courseOnly: false,
  });
  return created;
}

export function addSearchResultToLibrary(info: KnownVideoInfo) {
  const created = saveVideoInfo(info);
  toast.success(created ? "Adicionado à biblioteca" : "Já estava na biblioteca", { description: info.title });
}

export function playSearchResult(info: KnownVideoInfo) {
  saveVideoInfo(info);
  usePlayer.getState().playVideo(info.id);
}
