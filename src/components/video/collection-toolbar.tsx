"use client";

import { useMemo } from "react";
import { ArrowUpDown, Check, LayoutGrid, List, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Video } from "@/stores/library-store";

export type SortKey = "custom" | "added" | "title" | "plays" | "recent" | "duration";

const SORT_LABELS: Record<SortKey, string> = {
  custom: "Ordem personalizada",
  added: "Adicionados recentemente",
  title: "Título (A–Z)",
  plays: "Mais tocados",
  recent: "Tocados recentemente",
  duration: "Duração",
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Filtra por texto e ordena uma lista de IDs. */
export function useFilteredIds(ids: string[], videos: Record<string, Video>, query: string, sort: SortKey) {
  return useMemo(() => {
    const q = normalize(query.trim());
    let list = ids.map((id) => videos[id]).filter(Boolean);
    if (q) {
      list = list.filter((v) => normalize(`${v.title} ${v.author ?? ""} ${v.id}`).includes(q));
    }
    const sorted = [...list];
    switch (sort) {
      case "added":
        sorted.sort((a, b) => b.addedAt - a.addedAt);
        break;
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
        break;
      case "plays":
        sorted.sort((a, b) => b.playCount - a.playCount || b.addedAt - a.addedAt);
        break;
      case "recent":
        sorted.sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0));
        break;
      case "duration":
        sorted.sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));
        break;
    }
    return sorted.map((v) => v.id);
  }, [ids, videos, query, sort]);
}

export function CollectionToolbar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  sortOptions,
  view,
  onViewChange,
  className,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  sort: SortKey;
  onSortChange: (v: SortKey) => void;
  sortOptions: SortKey[];
  view?: "list" | "grid";
  onViewChange?: (v: "list" | "grid") => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative w-full max-w-56">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Filtrar…"
          aria-label="Filtrar vídeos"
          className="h-8 w-full rounded-md border bg-background/40 pr-8 pl-8 text-[13px] transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-[3px] focus:ring-ring/30"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Limpar filtro"
            className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <ArrowUpDown />
            <span className="hidden sm:inline">{SORT_LABELS[sort]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
          {sortOptions.map((key) => (
            <DropdownMenuItem key={key} onSelect={() => onSortChange(key)}>
              <span className="flex-1">{SORT_LABELS[key]}</span>
              {sort === key && <Check className="text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {view && onViewChange && (
        <div className="flex items-center gap-0.5 rounded-md border p-0.5">
          <Button
            size="icon-xs"
            variant="ghost"
            className={cn("size-6 rounded-[5px] text-muted-foreground", view === "list" && "bg-accent text-foreground")}
            onClick={() => onViewChange("list")}
            aria-label="Ver em lista"
            aria-pressed={view === "list"}
          >
            <List />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            className={cn("size-6 rounded-[5px] text-muted-foreground", view === "grid" && "bg-accent text-foreground")}
            onClick={() => onViewChange("grid")}
            aria-label="Ver em grade"
            aria-pressed={view === "grid"}
          >
            <LayoutGrid />
          </Button>
        </div>
      )}
    </div>
  );
}
