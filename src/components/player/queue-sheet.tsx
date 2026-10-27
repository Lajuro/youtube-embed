"use client";

import { ListMusic } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { QueueList } from "@/components/player/queue-list";
import { usePlayer } from "@/stores/player-store";

export function QueueSheet() {
  const open = usePlayer((s) => s.queueOpen);
  const setOpen = usePlayer((s) => s.setQueueOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2">
            <ListMusic className="size-4 text-primary" /> Fila de reprodução
          </SheetTitle>
          <SheetDescription>Arraste para reordenar. Duplo clique para tocar.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
          <QueueList />
        </div>
      </SheetContent>
    </Sheet>
  );
}
