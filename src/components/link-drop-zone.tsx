"use client";

import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { toast } from "sonner";

import { parseManyVideoIds } from "@/lib/youtube";
import { parsePlaylistId } from "@/lib/youtube-prober";
import { useUi } from "@/stores/ui-store";

function isTextField(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
}

/** Texto arrastado de fora (link do navegador, da barra de endereço, de um resultado do Google…). */
function droppedText(data: DataTransfer | null) {
  if (!data) return "";
  const uris = data
    .getData("text/uri-list")
    .split("\n")
    .filter((line) => line && !line.startsWith("#"));
  return [...uris, data.getData("text/plain")].join("\n").trim();
}

const carriesText = (e: DragEvent) => {
  const types = Array.from(e.dataTransfer?.types ?? []);
  return types.includes("text/uri-list") || types.includes("text/plain");
};

/**
 * Arraste um link do YouTube para qualquer lugar da janela: aparece "Solte para
 * adicionar" e, ao soltar, abre o diálogo de adicionar já preenchido.
 */
export function LinkDropZone() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let depth = 0;
    // Arrastes que começam dentro do app (ex.: uma imagem) não contam.
    let internal = false;

    const reset = () => {
      depth = 0;
      setActive(false);
    };
    const onDragStart = () => (internal = true);
    const onDragEnd = () => {
      internal = false;
      reset();
    };
    const onDragEnter = (e: DragEvent) => {
      if (internal || !carriesText(e)) return;
      depth++;
      setActive(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (internal || !carriesText(e) || isTextField(e.target)) return;
      e.preventDefault(); // necessário para o navegador permitir soltar aqui
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const onDragLeave = (e: DragEvent) => {
      if (internal || !carriesText(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setActive(false);
    };
    const onDrop = (e: DragEvent) => {
      if (internal) return;
      reset();
      // Soltar dentro de um campo de texto continua funcionando normalmente.
      if (!carriesText(e) || isTextField(e.target)) return;
      e.preventDefault();
      const text = droppedText(e.dataTransfer);
      if (parseManyVideoIds(text).length || parsePlaylistId(text)) {
        useUi.getState().openAddDialog({ initialValue: text });
      } else {
        toast.error("Isso não parece um link do YouTube", {
          description: "Arraste o link de um vídeo ou de uma playlist do YouTube.",
        });
      }
    };

    window.addEventListener("dragstart", onDragStart);
    window.addEventListener("dragend", onDragEnd);
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("dragend", onDragEnd);
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  if (!active) return null;

  return (
    // pointer-events-none: o "soltar" chega no elemento de baixo (campos de texto seguem funcionando).
    <div className="pointer-events-none fixed inset-0 z-[70] bg-background/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="grid size-full place-items-center rounded-3xl border-2 border-dashed border-primary/60 bg-primary/5">
        <div className="flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
          <span className="grid size-16 animate-bounce place-items-center rounded-2xl bg-brand-gradient text-white shadow-xl">
            <Link2 className="size-7" />
          </span>
          <p className="mt-5 text-2xl font-bold tracking-tight">Solte para adicionar</p>
          <p className="mt-1 text-sm text-muted-foreground">Links de vídeos ou playlists do YouTube</p>
        </div>
      </div>
    </div>
  );
}
