"use client";

import { memo, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, Clock3, GripVertical, Heart, MoreHorizontal, Pause, Play, Radio } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Equalizer } from "@/components/video/equalizer";
import { VideoContextMenu, VideoDropdownMenu } from "@/components/video/video-menu";
import { VideoThumbnail } from "@/components/video/video-thumbnail";
import { playList, toggleFavorite } from "@/lib/actions";
import { cn, formatRelative, formatTime } from "@/lib/utils";
import { useLibrary, type Video } from "@/stores/library-store";
import { useCurrentVideoId, usePlayer, type QueueSource } from "@/stores/player-store";

const GRID =
  "grid grid-cols-[2rem_minmax(0,1fr)_auto] md:grid-cols-[2.5rem_minmax(0,5fr)_minmax(0,2fr)_4.5rem_5.5rem] items-center gap-3 md:gap-4";

const restrictToVertical: Modifier = ({ transform }) => ({ ...transform, x: 0 });

interface VideoListProps {
  ids: string[];
  source: QueueSource;
  playlistId?: string;
  /** Habilita arrastar para reordenar. */
  onReorder?: (from: number, to: number) => void;
  dateLabel?: string;
  /** Data exibida na coluna (padrão: quando foi adicionado). */
  getDate?: (video: Video) => number | undefined;
}

export function VideoList({ ids, source, playlistId, onReorder, dateLabel = "Adicionado", getDate }: VideoListProps) {
  const videos = useLibrary((s) => s.videos);
  const items = useMemo(() => ids.filter((id) => videos[id]), [ids, videos]);
  const currentId = useCurrentVideoId();
  const status = usePlayer((s) => s.status);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;
    // Os índices precisam ser os da lista original (ids), não da filtrada.
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from !== -1 && to !== -1) onReorder(from, to);
  };

  const play = (index: number) => playList(items, index, source);

  const rows = items.map((id, index) => (
    <VideoRow
      key={id}
      video={videos[id]}
      index={index}
      isCurrent={currentId === id}
      isPlaying={currentId === id && (status === "playing" || status === "buffering")}
      onPlay={() => play(index)}
      playlistId={playlistId}
      sortable={Boolean(onReorder)}
      dragging={activeId === id}
      date={getDate ? getDate(videos[id]) : videos[id].addedAt}
    />
  ));

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          GRID,
          "sticky top-0 z-10 mb-1 border-b bg-background/80 px-3 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase backdrop-blur-md"
        )}
      >
        <span className="text-center">#</span>
        <span>Título</span>
        <span className="hidden md:block">{dateLabel}</span>
        <span className="hidden justify-end md:flex">
          <Clock3 className="size-4" />
        </span>
        <span />
      </div>

      {onReorder ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVertical]}
          onDragStart={(e) => setActiveId(String(e.active.id))}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {rows}
          </SortableContext>
        </DndContext>
      ) : (
        rows
      )}
    </div>
  );
}

interface VideoRowProps {
  video: Video;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  playlistId?: string;
  sortable: boolean;
  dragging: boolean;
  date?: number;
}

const VideoRow = memo(function VideoRow(props: VideoRowProps) {
  return props.sortable ? <SortableRow {...props} /> : <RowContent {...props} />;
});

function SortableRow(props: VideoRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.video.id,
  });
  return (
    <RowContent
      {...props}
      rowRef={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      handleProps={{ ...attributes, ...listeners }}
      dragging={isDragging}
    />
  );
}

function RowContent({
  video,
  index,
  isCurrent,
  isPlaying,
  onPlay,
  playlistId,
  dragging,
  date,
  rowRef,
  style,
  handleProps,
}: VideoRowProps & {
  rowRef?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
  handleProps?: Record<string, unknown>;
}) {
  const isFavorite = useLibrary((s) => s.favorites.includes(video.id));
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <VideoContextMenu videoId={video.id} playlistId={playlistId} onPlay={onPlay}>
      <div
        ref={rowRef}
        style={style}
        onDoubleClick={onPlay}
        className={cn(
          GRID,
          "group/row relative rounded-lg px-3 py-2 transition-colors hover:bg-accent/60 data-[state=open]:bg-accent/60",
          isCurrent && "bg-primary/[0.07]",
          menuOpen && "bg-accent/60",
          dragging && "z-20 bg-accent shadow-2xl ring-1 ring-border"
        )}
      >
        {/* Número / play / equalizer */}
        <div className="relative flex h-10 items-center justify-center">
          {handleProps && (
            <button
              type="button"
              aria-label="Arrastar para reordenar"
              className="absolute -left-3 hidden cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100 active:cursor-grabbing md:block"
              {...handleProps}
            >
              <GripVertical className="size-4" />
            </button>
          )}
          <span
            className={cn(
              "text-sm tabular-nums text-muted-foreground group-hover/row:hidden",
              isCurrent && "hidden"
            )}
          >
            {index + 1}
          </span>
          {isCurrent && (
            <span className="group-hover/row:hidden">
              <Equalizer paused={!isPlaying} />
            </span>
          )}
          <button
            type="button"
            onClick={isCurrent ? () => usePlayer.getState().togglePlay() : onPlay}
            aria-label={isCurrent && isPlaying ? "Pausar" : "Tocar"}
            className="hidden cursor-pointer text-foreground group-hover/row:block"
          >
            {isCurrent && isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
          </button>
        </div>

        {/* Miniatura + título */}
        <div className="flex min-w-0 items-center gap-3">
          <VideoThumbnail id={video.id} className="aspect-video w-[72px] shrink-0 rounded-md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  "truncate text-sm font-medium",
                  isCurrent && "text-primary",
                  video.titleSource === "pending" && "text-muted-foreground italic"
                )}
                title={video.title}
              >
                {video.title}
              </p>
              {video.isLive && (
                <Badge variant="live" className="px-1.5 py-0">
                  Ao vivo
                </Badge>
              )}
              {video.unavailable && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>O dono deste vídeo bloqueou a reprodução fora do YouTube</TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">{video.author ?? "Canal desconhecido"}</p>
          </div>
        </div>

        <span className="hidden truncate text-sm text-muted-foreground md:block" suppressHydrationWarning>
          {date ? formatRelative(date) : "—"}
        </span>

        <span className="hidden justify-end text-sm tabular-nums text-muted-foreground md:flex">
          {video.isLive ? <Radio className="size-4 text-red-500" /> : formatTime(video.duration)}
        </span>

        {/* Ações */}
        <div className="flex items-center justify-end gap-0.5">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={isFavorite ? "Remover dos favoritos" : "Favoritar"}
            onClick={() => toggleFavorite(video.id)}
            className={cn(
              "hidden text-muted-foreground hover:text-foreground sm:inline-flex",
              !isFavorite && "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
            )}
          >
            <Heart className={cn(isFavorite && "fill-primary text-primary")} />
          </Button>
          <VideoDropdownMenu
            videoId={video.id}
            playlistId={playlistId}
            onPlay={onPlay}
            onOpenChange={setMenuOpen}
          >
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Mais opções"
              className={cn(
                "text-muted-foreground hover:text-foreground md:opacity-0 md:group-hover/row:opacity-100 md:focus-visible:opacity-100",
                menuOpen && "md:opacity-100"
              )}
            >
              <MoreHorizontal />
            </Button>
          </VideoDropdownMenu>
        </div>
      </div>
    </VideoContextMenu>
  );
}
