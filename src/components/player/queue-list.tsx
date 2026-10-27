"use client";

import { useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ListX, Play, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Equalizer } from "@/components/video/equalizer";
import { VideoThumbnail } from "@/components/video/video-thumbnail";
import { cn, formatTime, formatTotalDuration, pluralize } from "@/lib/utils";
import { useLibrary } from "@/stores/library-store";
import { usePlayer } from "@/stores/player-store";

const restrictToVertical: Modifier = ({ transform }) => ({ ...transform, x: 0 });

export function QueueList({ className, compact = false }: { className?: string; compact?: boolean }) {
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const source = usePlayer((s) => s.source);
  const status = usePlayer((s) => s.status);
  const videos = useLibrary((s) => s.videos);

  const currentId = queue[index];
  const upcoming = useMemo(
    () => queue.map((id, i) => ({ id, i, key: `${i}:${id}` })).slice(index + 1),
    [queue, index]
  );
  const upcomingDuration = upcoming.reduce((sum, { id }) => sum + (videos[id]?.duration ?? 0), 0);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = upcoming.find((u) => u.key === active.id)?.i;
    const to = upcoming.find((u) => u.key === over.id)?.i;
    if (from !== undefined && to !== undefined) usePlayer.getState().moveInQueue(from, to);
  };

  if (!queue.length) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-16 text-center", className)}>
        <div className="grid size-12 place-items-center rounded-full bg-muted">
          <ListX className="size-5 text-muted-foreground" />
        </div>
        <p className="font-medium">A fila está vazia</p>
        <p className="text-sm text-muted-foreground">Toque uma playlist ou adicione vídeos à fila pelo menu “⋯”.</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {currentId && (
        <section>
          <h3 className="mb-2 px-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Tocando agora
          </h3>
          <QueueItem
            id={currentId}
            current
            playing={status === "playing" || status === "buffering"}
            title={videos[currentId]?.title}
            author={videos[currentId]?.author}
            duration={videos[currentId]?.duration}
            compact={compact}
          />
        </section>
      )}

      <section className="min-h-0">
        <div className="mb-2 flex items-end justify-between gap-2 px-2">
          <div className="min-w-0">
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">A seguir</h3>
            {source && (
              <p className="truncate text-xs text-muted-foreground/80">
                De: <span className="text-foreground/80">{source.label}</span>
              </p>
            )}
          </div>
          {upcoming.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => usePlayer.getState().clearQueue()}
            >
              Limpar
            </Button>
          )}
        </div>

        {upcoming.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nada na sequência.</p>
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVertical]}
              onDragEnd={onDragEnd}
            >
              <SortableContext items={upcoming.map((u) => u.key)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-0.5">
                  {upcoming.map(({ id, i, key }) => (
                    <SortableQueueItem
                      key={key}
                      sortId={key}
                      id={id}
                      queueIndex={i}
                      title={videos[id]?.title}
                      author={videos[id]?.author}
                      duration={videos[id]?.duration}
                      compact={compact}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <p className="mt-3 px-2 text-xs text-muted-foreground">
              {pluralize(upcoming.length, "vídeo", "vídeos")}
              {upcomingDuration > 0 && ` · ${formatTotalDuration(upcomingDuration)}`}
            </p>
          </>
        )}
      </section>
    </div>
  );
}

interface QueueItemProps {
  id: string;
  title?: string;
  author?: string;
  duration?: number;
  current?: boolean;
  playing?: boolean;
  queueIndex?: number;
  compact?: boolean;
}

function SortableQueueItem(props: QueueItemProps & { sortId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.sortId });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(isDragging && "relative z-10 rounded-lg bg-accent shadow-xl")}
    >
      <QueueItem {...props} handleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function QueueItem({
  id,
  title,
  author,
  duration,
  current,
  playing,
  queueIndex,
  handleProps,
}: QueueItemProps & { handleProps?: Record<string, unknown> }) {
  return (
    <div
      className={cn(
        "group/q flex items-center gap-2 rounded-lg p-1.5 pr-2 transition-colors hover:bg-accent/60",
        current && "bg-primary/10"
      )}
      onDoubleClick={() => queueIndex !== undefined && usePlayer.getState().jumpTo(queueIndex)}
    >
      {handleProps ? (
        <button
          type="button"
          aria-label="Arrastar para reordenar"
          className="cursor-grab touch-none text-muted-foreground/50 hover:text-foreground active:cursor-grabbing"
          {...handleProps}
        >
          <GripVertical className="size-4" />
        </button>
      ) : (
        <span className="w-4" />
      )}
      <button
        type="button"
        className="relative shrink-0 cursor-pointer overflow-hidden rounded-md"
        onClick={() =>
          current ? usePlayer.getState().togglePlay() : queueIndex !== undefined && usePlayer.getState().jumpTo(queueIndex)
        }
        aria-label="Tocar"
      >
        <VideoThumbnail id={id} className="aspect-video w-16" />
        <span
          className={cn(
            "absolute inset-0 grid place-items-center bg-black/55 text-white opacity-0 transition-opacity group-hover/q:opacity-100",
            current && "opacity-100"
          )}
        >
          {current ? <Equalizer paused={!playing} className="[&>span]:bg-white" /> : <Play className="size-4 fill-current" />}
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", current && "text-primary")} title={title}>
          {title ?? id}
        </p>
        <p className="truncate text-xs text-muted-foreground">{author ?? "Canal desconhecido"}</p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums group-hover/q:hidden">
        {duration ? formatTime(duration) : ""}
      </span>
      {queueIndex !== undefined && !current && (
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="Remover da fila"
          className="hidden shrink-0 text-muted-foreground group-hover/q:inline-flex"
          onClick={() => usePlayer.getState().removeFromQueue(queueIndex)}
        >
          <X />
        </Button>
      )}
    </div>
  );
}
