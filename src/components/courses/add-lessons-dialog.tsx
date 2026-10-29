"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Library, Link2, ListVideo, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFilteredIds } from "@/components/video/collection-toolbar";
import { VideoThumbnail } from "@/components/video/video-thumbnail";
import { hydrateMetadata } from "@/lib/actions";
import { addLessonsToSection, saveLessonVideoInfo } from "@/lib/courses";
import { googleSearch } from "@/lib/google-cse";
import { cn, pluralize } from "@/lib/utils";
import { parseManyVideoIds } from "@/lib/youtube";
import { importPlaylist, parsePlaylistId } from "@/lib/youtube-prober";
import type { SearchPage, SearchResult } from "@/lib/youtube-search";
import { courseLessons, sortByAddedDesc, useLibrary } from "@/stores/library-store";
import { useSettings } from "@/stores/ui-store";

/** Busca usando o mesmo provedor configurado na tela Buscar. */
async function searchVideos(query: string): Promise<SearchResult[]> {
  const { searchProvider, googleCx } = useSettings.getState();
  if (searchProvider === "google") {
    if (!googleCx) throw new Error("A busca pelo Google ainda não foi configurada.");
    return (await googleSearch(googleCx, query)).results;
  }
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const data = (await res.json().catch(() => ({}))) as SearchPage & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Erro HTTP ${res.status}`);
  return data.results;
}

export function AddLessonsDialog({
  courseId,
  sectionId,
  onOpenChange,
}: {
  courseId: string;
  /** Seção que recebe as aulas (null = diálogo fechado). */
  sectionId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const course = useLibrary((s) => s.courses.find((c) => c.id === courseId));
  const sectionIndex = course?.sections.findIndex((s) => s.id === sectionId) ?? -1;
  const section = sectionIndex >= 0 ? course?.sections[sectionIndex] : undefined;
  const inCourse = useMemo(() => new Set(course ? courseLessons(course).map((l) => l.videoId) : []), [course]);

  const add = (ids: string[]) => {
    if (!sectionId) return 0;
    const added = addLessonsToSection(courseId, sectionId, ids);
    if (added) toast.success(`${pluralize(added, "aula adicionada", "aulas adicionadas")} à seção ${sectionIndex + 1}`);
    else toast.info("Esses vídeos já estão no curso");
    return added;
  };

  return (
    <Dialog open={Boolean(sectionId && section)} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88dvh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b p-5">
          <DialogTitle>Adicionar aulas</DialogTitle>
          <DialogDescription>
            Na seção {sectionIndex + 1}: <span className="font-medium text-foreground">{section?.title}</span>
          </DialogDescription>
        </DialogHeader>
        {sectionId && (
          <Tabs defaultValue="links" className="min-h-0 flex-1 gap-0">
            <div className="border-b px-5 py-3">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="links">
                  <Link2 /> Links
                </TabsTrigger>
                <TabsTrigger value="playlist">
                  <ListVideo /> Playlist
                </TabsTrigger>
                <TabsTrigger value="search">
                  <Search /> Buscar
                </TabsTrigger>
                <TabsTrigger value="library">
                  <Library /> Biblioteca
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="links" className="min-h-0 overflow-y-auto scrollbar-thin p-5">
              <LinksTab inCourse={inCourse} onAdd={(ids) => add(ids) && onOpenChange(false)} />
            </TabsContent>
            <TabsContent value="playlist" className="min-h-0 overflow-y-auto scrollbar-thin p-5">
              <PlaylistTab courseId={courseId} sectionId={sectionId} onDone={() => onOpenChange(false)} />
            </TabsContent>
            <TabsContent value="search" className="min-h-0 overflow-y-auto scrollbar-thin p-5">
              <SearchTab inCourse={inCourse} onAdd={add} />
            </TabsContent>
            <TabsContent value="library" className="min-h-0 overflow-y-auto scrollbar-thin p-5">
              <LibraryTab inCourse={inCourse} onAdd={(ids) => add(ids) && onOpenChange(false)} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LinksTab({ inCourse, onAdd }: { inCourse: Set<string>; onAdd: (ids: string[]) => void }) {
  const [value, setValue] = useState("");
  const ids = useMemo(() => parseManyVideoIds(value), [value]);
  const fresh = ids.filter((id) => !inCourse.has(id));

  return (
    <div className="grid gap-3">
      <Textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={"Um link por linha — vira uma aula, na ordem em que aparece.\nhttps://www.youtube.com/watch?v=…"}
        className="max-h-56 min-h-28 resize-none font-mono text-sm"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {ids.length
            ? `${pluralize(fresh.length, "aula nova", "aulas novas")}${ids.length > fresh.length ? ` (${ids.length - fresh.length} já no curso)` : ""}`
            : "Aceita links do YouTube, do Google ou só o ID."}
        </p>
        <Button variant="brand" disabled={!fresh.length} onClick={() => onAdd(fresh)}>
          <Plus /> Adicionar {fresh.length > 0 && pluralize(fresh.length, "aula", "aulas")}
        </Button>
      </div>
    </div>
  );
}

function PlaylistTab({ courseId, sectionId, onDone }: { courseId: string; sectionId: string; onDone: () => void }) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<{ phase: "idle" | "reading" | "titles"; total: number; done: number }>({
    phase: "idle",
    total: 0,
    done: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const listId = parsePlaylistId(value);

  const run = async () => {
    if (!listId) return;
    setError(null);
    setState({ phase: "reading", total: 0, done: 0 });
    try {
      const ids = await importPlaylist(listId, {
        onIds: (found) => {
          const added = useLibrary.getState().addLessons(courseId, sectionId, found);
          toast.success(`${pluralize(added, "aula importada", "aulas importadas")}`);
          setState({ phase: "titles", total: found.length, done: 0 });
        },
        onTitle: (info, done, total) => {
          saveLessonVideoInfo(info);
          setState({ phase: "titles", total, done });
        },
      });
      for (const id of ids) hydrateMetadata(id);
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setState({ phase: "idle", total: 0, done: 0 });
    }
  };

  if (state.phase === "titles") {
    return (
      <div className="grid gap-3">
        <p className="text-sm">
          Aulas adicionadas! Buscando os títulos ({state.done} de {state.total})… pode fechar, continua em segundo plano.
        </p>
        <Progress value={state.total ? (state.done / state.total) * 100 : 0} />
        <div className="flex justify-end">
          <Button variant="outline" onClick={onDone}>
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="https://www.youtube.com/playlist?list=PL…"
        className="font-mono text-sm"
      />
      <p className="text-sm text-muted-foreground">
        O app abre a playlist num player escondido (que funciona mesmo com o youtube.com bloqueado) e lê a lista de
        vídeos. Todos entram nesta seção, na ordem da playlist.
      </p>
      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button variant="brand" disabled={!listId || state.phase === "reading"} onClick={run}>
          {state.phase === "reading" ? <Loader2 className="animate-spin" /> : <ListVideo />}
          {state.phase === "reading" ? "Lendo a playlist…" : "Importar playlist"}
        </Button>
      </div>
    </div>
  );
}

function SearchTab({ inCourse, onAdd }: { inCourse: Set<string>; onAdd: (ids: string[]) => number }) {
  const provider = useSettings((s) => s.searchProvider);
  const cx = useSettings((s) => s.googleCx);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (provider === "google" && !cx) {
    return (
      <div className="rounded-xl border bg-muted/30 p-4 text-sm">
        Para buscar daqui, configure primeiro a busca pelo Google na tela{" "}
        <Link href="/search" className="font-medium text-primary hover:underline">
          Buscar
        </Link>
        . Enquanto isso, use a aba “Links”.
      </div>
    );
  }

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResults(await searchVideos(query.trim()));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const addOne = (r: SearchResult) => {
    saveLessonVideoInfo(r);
    onAdd([r.id]);
  };
  const pending = results.filter((r) => !inCourse.has(r.id));

  return (
    <div className="grid gap-3">
      <form onSubmit={search} className="flex gap-2">
        <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ex.: Devin tutorial" />
        <Button type="submit" variant="brand" disabled={!query.trim() || loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Search />} Buscar
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {results.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{pluralize(results.length, "resultado", "resultados")}</span>
          <Button
            size="sm"
            variant="ghost"
            disabled={!pending.length}
            onClick={() => {
              pending.forEach((r) => saveLessonVideoInfo(r));
              onAdd(pending.map((r) => r.id));
            }}
          >
            <Plus /> Adicionar todos
          </Button>
        </div>
      )}
      <ul className="grid gap-1">
        {results.map((r) => {
          const added = inCourse.has(r.id);
          return (
            <li key={r.id} className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-accent/50">
              <VideoThumbnail id={r.id} fallbackSrc={r.thumbnail} className="aspect-video w-28 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium">{r.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[r.author, r.durationText].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Button size="sm" variant={added ? "secondary" : "outline"} disabled={added} onClick={() => addOne(r)}>
                {added ? <Check /> : <Plus />}
                {added ? "No curso" : "Adicionar"}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LibraryTab({ inCourse, onAdd }: { inCourse: Set<string>; onAdd: (ids: string[]) => void }) {
  const videos = useLibrary((s) => s.videos);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const all = useMemo(() => sortByAddedDesc(videos).map((v) => v.id), [videos]);
  const ids = useFilteredIds(all, videos, query, "added");

  if (!all.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sua biblioteca ainda está vazia.</p>;
  }

  return (
    <div className="grid gap-3">
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar por título ou canal…" />
      <ul className="grid gap-0.5">
        {ids.map((id) => {
          const added = inCourse.has(id);
          const checked = added || selected.includes(id);
          return (
            <li key={id}>
              <button
                type="button"
                disabled={added}
                onClick={() => setSelected((s) => (s.includes(id) ? s.filter((v) => v !== id) : [...s, id]))}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 rounded-lg p-1.5 text-left hover:bg-accent/50 disabled:cursor-default disabled:opacity-50",
                  checked && !added && "bg-primary/10"
                )}
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-md border",
                    checked && "border-primary bg-primary text-primary-foreground"
                  )}
                >
                  {checked && <Check className="size-3.5" />}
                </span>
                <VideoThumbnail id={id} className="aspect-video w-20 shrink-0 rounded-md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{videos[id].title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {added ? "Já está no curso" : (videos[id].author ?? "Canal desconhecido")}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="sticky bottom-0 flex justify-end bg-popover pt-2">
        <Button variant="brand" disabled={!selected.length} onClick={() => onAdd(selected)}>
          <Plus /> Adicionar {selected.length > 0 && pluralize(selected.length, "aula", "aulas")}
        </Button>
      </div>
    </div>
  );
}
