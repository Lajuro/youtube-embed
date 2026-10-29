"use client";

import type { ComponentType, ReactNode } from "react";
import {
  Copy,
  Heart,
  HeartOff,
  ListEnd,
  ListPlus,
  ListStart,
  ListX,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  addToPlaylist,
  addToQueue,
  copyVideoLink,
  playNext,
  removeFromLibrary,
  removeFromPlaylist,
  toggleFavorite,
} from "@/lib/actions";
import { isInLibrary, useLibrary } from "@/stores/library-store";
import { usePlayer } from "@/stores/player-store";
import { useUi } from "@/stores/ui-store";

/* eslint-disable @typescript-eslint/no-explicit-any -- os dois kits (dropdown/context) têm props compatíveis */
interface MenuKit {
  Item: ComponentType<any>;
  Separator: ComponentType<any>;
  Sub: ComponentType<any>;
  SubTrigger: ComponentType<any>;
  SubContent: ComponentType<any>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const dropdownKit: MenuKit = {
  Item: DropdownMenuItem,
  Separator: DropdownMenuSeparator,
  Sub: DropdownMenuSub,
  SubTrigger: DropdownMenuSubTrigger,
  SubContent: DropdownMenuSubContent,
};

const contextKit: MenuKit = {
  Item: ContextMenuItem,
  Separator: ContextMenuSeparator,
  Sub: ContextMenuSub,
  SubTrigger: ContextMenuSubTrigger,
  SubContent: ContextMenuSubContent,
};

interface VideoMenuOptions {
  videoId: string;
  /** Quando o menu é aberto dentro de uma playlist. */
  playlistId?: string;
  /** Ação de "tocar" específica do contexto (ex.: tocar a playlist a partir daqui). */
  onPlay?: () => void;
}

function VideoMenuItems({ kit, videoId, playlistId, onPlay }: VideoMenuOptions & { kit: MenuKit }) {
  const { Item, Separator, Sub, SubTrigger, SubContent } = kit;
  const isFavorite = useLibrary((s) => s.favorites.includes(videoId));
  const playlists = useLibrary((s) => s.playlists);
  const openPlaylistDialog = useUi((s) => s.openPlaylistDialog);
  const setEditVideoId = useUi((s) => s.setEditVideoId);
  const exists = useLibrary((s) => Boolean(s.videos[videoId]));
  const inLibrary = useLibrary((s) => isInLibrary(s.videos[videoId]));

  return (
    <>
      <Item onSelect={() => (onPlay ? onPlay() : usePlayer.getState().playVideo(videoId))}>
        <Play /> Tocar agora
      </Item>
      <Item onSelect={() => playNext([videoId])}>
        <ListStart /> Tocar em seguida
      </Item>
      <Item onSelect={() => addToQueue([videoId])}>
        <ListEnd /> Adicionar à fila
      </Item>
      <Separator />
      <Item onSelect={() => toggleFavorite(videoId)}>
        {isFavorite ? <HeartOff /> : <Heart />}
        {isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      </Item>
      <Sub>
        <SubTrigger>
          <ListPlus /> Adicionar à playlist
        </SubTrigger>
        <SubContent className="w-56">
          <Item onSelect={() => openPlaylistDialog({ videoIds: [videoId] })}>
            <Plus /> Nova playlist…
          </Item>
          {playlists.length > 0 && <Separator />}
          {playlists.map((p) => (
            <Item
              key={p.id}
              disabled={p.videoIds.includes(videoId)}
              onSelect={() => addToPlaylist(p.id, [videoId])}
            >
              <span className="truncate">{p.name}</span>
              {p.videoIds.includes(videoId) && (
                <span className="ml-auto text-xs text-muted-foreground">adicionado</span>
              )}
            </Item>
          ))}
        </SubContent>
      </Sub>
      <Separator />
      {exists && (
        <Item onSelect={() => setEditVideoId(videoId)}>
          <Pencil /> Editar título
        </Item>
      )}
      <Item onSelect={() => copyVideoLink(videoId)}>
        <Copy /> Copiar link do YouTube
      </Item>
      {(playlistId || inLibrary) && <Separator />}
      {playlistId && (
        <Item onSelect={() => removeFromPlaylist(playlistId, videoId)}>
          <ListX /> Remover desta playlist
        </Item>
      )}
      {inLibrary && (
        <Item variant="destructive" onSelect={() => removeFromLibrary(videoId)}>
          <Trash2 /> Remover da biblioteca
        </Item>
      )}
    </>
  );
}

export function VideoDropdownMenu({
  children,
  align = "end",
  onOpenChange,
  ...options
}: VideoMenuOptions & { children: ReactNode; align?: "start" | "end"; onOpenChange?: (open: boolean) => void }) {
  return (
    <DropdownMenu modal={false} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-60">
        <VideoMenuItems kit={dropdownKit} {...options} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function VideoContextMenu({ children, ...options }: VideoMenuOptions & { children: ReactNode }) {
  return (
    <ContextMenu modal={false}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-60">
        <VideoMenuItems kit={contextKit} {...options} />
      </ContextMenuContent>
    </ContextMenu>
  );
}
