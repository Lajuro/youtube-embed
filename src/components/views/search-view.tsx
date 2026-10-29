"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Clock3,
  ExternalLink,
  ListEnd,
  ListPlus,
  ListStart,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Equalizer } from "@/components/video/equalizer";
import { VideoThumbnail } from "@/components/video/video-thumbnail";
import {
  addSearchResultToLibrary,
  addToPlaylist,
  addToQueue,
  addVideosToLibrary,
  playList,
  playNext,
  playSearchResult,
  saveVideoInfo,
  toggleFavorite,
} from "@/lib/actions";
import { FavoriteHeart } from "@/components/video/favorite-heart";
import { cn, pluralize } from "@/lib/utils";
import { googleSearch, googleSearchMore, googleWebSearchUrl } from "@/lib/google-cse";
import { parseManyVideoIds } from "@/lib/youtube";
import { GoogleSetupGuide } from "@/components/search/google-setup";
import type { SearchPage, SearchResult } from "@/lib/youtube-search";
import { isInLibrary, useLibrary } from "@/stores/library-store";
import { useCurrentVideoId, usePlayer } from "@/stores/player-store";
import { useHydration, useSearchHistory, useSettings, useUi } from "@/stores/ui-store";

const SUGGESTIONS = [
  "lofi hip hop",
  "jazz para trabalhar",
  "chillhop",
  "synthwave",
  "piano relaxante",
  "bossa nova instrumental",
  "música para foco",
  "som de chuva",
];

type Status = "idle" | "loading" | "done" | "error";

async function fetchPage(params: URLSearchParams): Promise<SearchPage> {
  const res = await fetch(`/api/search?${params.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error ?? `Erro HTTP ${res.status}`);
    (error as Error & { detail?: string }).detail = data.detail;
    throw error;
  }
  return data as SearchPage;
}

export function SearchView() {
  const router = useRouter();
  const query = useSearchParams().get("q")?.trim() ?? "";
  const [input, setInput] = useState(query);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [continuation, setContinuation] = useState<string | undefined>();
  const [status, setStatus] = useState<Status>(query ? "loading" : "idle");
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const [lastQuery, setLastQuery] = useState(query);
  const [attempt, setAttempt] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const hydrated = useHydration((s) => s.hydrated);
  const history = useSearchHistory((s) => s.items);
  const provider = useSettings((s) => s.searchProvider);
  const cx = useSettings((s) => s.googleCx);
  const viaGoogle = provider === "google";
  // Busca pelo Google ainda não configurada: mostra o passo a passo no lugar dos resultados.
  const needsSetup = hydrated && viaGoogle && !cx;

  // Quando a URL muda (nova busca), reinicia o estado — ajuste durante o render.
  if (query !== lastQuery) {
    setLastQuery(query);
    setInput(query);
    setResults([]);
    setContinuation(undefined);
    setError(null);
    setStatus(query ? "loading" : "idle");
  }

  useEffect(() => {
    if (!query || !hydrated || needsSetup) return;
    let cancelled = false;
    const request = viaGoogle ? googleSearch(cx, query) : fetchPage(new URLSearchParams({ q: query }));
    request
      .then((page) => {
        if (cancelled) return;
        setResults(page.results);
        setContinuation(page.continuation);
        setStatus("done");
        useSearchHistory.getState().add(query);
      })
      .catch((err: Error & { detail?: string }) => {
        if (cancelled) return;
        setError({ message: err.message, detail: err.detail });
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [query, attempt, hydrated, needsSetup, viaGoogle, cx]);

  const pastedIds = useMemo(() => parseManyVideoIds(input), [input]);
  const looksLikeLink = pastedIds.length > 0 && (input.includes("/") || input.trim().length === 11);

  const submit = (value = input) => {
    const q = value.trim();
    if (!q) return;
    if (q === query) {
      // Mesma busca: busca de novo.
      setResults([]);
      setContinuation(undefined);
      setError(null);
      setStatus("loading");
      setAttempt((n) => n + 1);
      return;
    }
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const loadMore = async () => {
    if (!continuation || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = viaGoogle ? await googleSearchMore() : await fetchPage(new URLSearchParams({ c: continuation }));
      setResults((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...page.results.filter((r) => !seen.has(r.id))];
      });
      setContinuation(page.continuation);
    } catch {
      setContinuation(undefined);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="pb-16">
      <section className="relative -mt-14 overflow-hidden px-4 pt-18 pb-6 md:px-8 md:pt-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/4 size-[26rem] rounded-full bg-[var(--brand-from)] opacity-20 blur-[100px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>

        <div className="relative max-w-3xl">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Buscar no <span className="text-gradient">YouTube</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {viaGoogle ? "Pesquisa feita pelo Google, direto do seu navegador." : "Pesquisa feita pelo servidor do app."} O
            que você tocar daqui entra na sua biblioteca.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="group/search mt-6 flex items-center gap-2 rounded-full border bg-background/70 p-1.5 pl-5 shadow-xl shadow-black/5 backdrop-blur-xl transition-[border-color,box-shadow] focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/15"
          >
            <Search className="size-5 shrink-0 text-muted-foreground transition-colors group-focus-within/search:text-primary" />
            <input
              ref={inputRef}
              autoFocus={!query}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex.: lofi para estudar, jazz, chuva…"
              aria-label="Buscar vídeos no YouTube"
              className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            {input && (
              <button
                type="button"
                aria-label="Limpar"
                onClick={() => {
                  setInput("");
                  inputRef.current?.focus();
                }}
                className="cursor-pointer p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
            <Button type="submit" variant="brand" size="lg" className="rounded-full" disabled={!input.trim()}>
              <Search />
              <span className="hidden sm:inline">Buscar</span>
            </Button>
          </form>

          {looksLikeLink && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
              <span>Isso parece um link do YouTube.</span>
              <Button
                size="sm"
                variant="brand"
                className="rounded-full"
                onClick={() => {
                  addVideosToLibrary(pastedIds);
                  playList(pastedIds, 0, { type: "custom", label: "Adicionado agora" });
                  setInput("");
                }}
              >
                <Play className="fill-current" /> Adicionar e tocar
              </Button>
            </div>
          )}

          {hydrated && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {(history.length ? history : SUGGESTIONS).slice(0, 8).map((item) => (
                <span
                  key={item}
                  className={cn(
                    "group/chip inline-flex items-center rounded-full border bg-card/50 text-sm transition-colors hover:border-primary/50",
                    item === query && "border-primary/60 bg-primary/10"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => submit(item)}
                    className="flex cursor-pointer items-center gap-1.5 py-1 pr-1 pl-3"
                  >
                    {history.length ? (
                      <Clock3 className="size-3.5 text-muted-foreground" />
                    ) : (
                      <Sparkles className="size-3.5 text-primary" />
                    )}
                    {item}
                  </button>
                  {history.length > 0 ? (
                    <button
                      type="button"
                      aria-label={`Remover “${item}” do histórico`}
                      onClick={() => useSearchHistory.getState().remove(item)}
                      className="cursor-pointer rounded-full p-1 pr-2 text-muted-foreground opacity-50 hover:text-foreground group-hover/chip:opacity-100"
                    >
                      <X className="size-3" />
                    </button>
                  ) : (
                    <span className="pr-2" />
                  )}
                </span>
              ))}
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => useSearchHistory.getState().clear()}
                  className="cursor-pointer text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  Limpar histórico
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="px-4 md:px-8">
        {status === "idle" && (
          <EmptyState
            icon={Search}
            title="O que vamos ouvir?"
            description="Digite o nome de uma música, artista, gênero ou clima. Os resultados aparecem aqui."
          />
        )}

        {needsSetup && query && <GoogleSetupGuide query={query} />}

        {status === "loading" && !needsSetup && <ResultsSkeleton />}

        {status === "error" && error && (
          <SearchError error={error} viaGoogle={viaGoogle} query={query} onRetry={() => submit(query)} />
        )}

        {status === "done" && results.length === 0 && (
          <EmptyState icon={Search} title="Nenhum vídeo encontrado" description={`Nada para “${query}”. Tente outras palavras.`} />
        )}

        {results.length > 0 && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {pluralize(results.length, "resultado", "resultados")} para <span className="text-foreground">“{query}”</span>
              </p>
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                <a href={googleWebSearchUrl(query)} target="_blank" rel="noreferrer">
                  <ExternalLink /> Ver no Google
                </a>
              </Button>
            </div>
            <ul className="stagger grid gap-1">
              {results.map((r) => (
                <SearchResultItem key={r.id} result={r} />
              ))}
            </ul>
            {continuation && (
              <div className="mt-6 flex justify-center">
                <Button variant="outline" className="rounded-full" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? <Loader2 className="animate-spin" /> : <Plus />}
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SearchResultItem({ result }: { result: SearchResult }) {
  const inLibrary = useLibrary((s) => isInLibrary(s.videos[result.id]));
  const isFavorite = useLibrary((s) => s.favorites.includes(result.id));
  const playlists = useLibrary((s) => s.playlists);
  const isCurrent = useCurrentVideoId() === result.id;
  const isPlaying = usePlayer((s) => isCurrent && (s.status === "playing" || s.status === "buffering"));
  const openPlaylistDialog = useUi((s) => s.openPlaylistDialog);

  const play = () => (isCurrent ? usePlayer.getState().togglePlay() : playSearchResult(result));
  const meta = [result.author, result.views, result.published].filter(Boolean);

  return (
    <li
      className={cn(
        "group/res flex gap-3 rounded-xl p-2 transition-colors hover:bg-accent/50 sm:gap-4",
        isCurrent && "bg-primary/[0.07]"
      )}
      onDoubleClick={play}
    >
      <button
        type="button"
        onClick={play}
        aria-label={`Tocar ${result.title}`}
        className="relative w-36 shrink-0 cursor-pointer overflow-hidden rounded-lg sm:w-56 md:w-64"
      >
        <VideoThumbnail
          id={result.id}
          alt={result.title}
          fallbackSrc={result.thumbnail}
          className="aspect-video w-full"
          imgClassName="transition-transform duration-500 group-hover/res:scale-105"
        >
          {result.isLive ? (
            <Badge variant="live" className="absolute right-1.5 bottom-1.5">
              Ao vivo
            </Badge>
          ) : result.durationText ? (
            <span className="absolute right-1.5 bottom-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
              {result.durationText}
            </span>
          ) : null}
          <span
            className={cn(
              "absolute inset-0 grid place-items-center bg-black/40 text-white opacity-0 transition-opacity group-hover/res:opacity-100",
              isCurrent && "opacity-100"
            )}
          >
            <span className="grid size-11 place-items-center rounded-full bg-brand-gradient shadow-xl">
              {isCurrent && isPlaying ? (
                <Pause className="size-5 fill-current" />
              ) : (
                <Play className="ml-0.5 size-5 fill-current" />
              )}
            </span>
          </span>
        </VideoThumbnail>
      </button>

      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-start gap-2">
          <h3
            className={cn("line-clamp-2 flex-1 text-sm leading-snug font-semibold sm:text-base", isCurrent && "text-primary")}
            title={result.title}
          >
            {isCurrent && <Equalizer paused={!isPlaying} className="mr-2 align-middle" />}
            {result.title}
          </h3>
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground sm:text-sm">{meta.join(" • ")}</p>
        {result.description && (
          <p className="mt-2 hidden text-xs text-muted-foreground/80 md:line-clamp-2">{result.description}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1 sm:mt-3">
          <Button size="sm" variant="ghost" className="h-8 rounded-full px-3" onClick={play}>
            {isCurrent && isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}
            <span className="hidden sm:inline">{isCurrent && isPlaying ? "Pausar" : "Tocar"}</span>
          </Button>
          <Button
            size="sm"
            variant={inLibrary ? "secondary" : "outline"}
            className="h-8 rounded-full px-3"
            onClick={() => addSearchResultToLibrary(result)}
            disabled={inLibrary}
          >
            {inLibrary ? <Check /> : <Plus />}
            <span className="hidden sm:inline">{inLibrary ? "Na biblioteca" : "Biblioteca"}</span>
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            className="rounded-full"
            aria-label={isFavorite ? "Remover dos favoritos" : "Favoritar"}
            onClick={() => {
              saveVideoInfo(result);
              toggleFavorite(result.id);
            }}
          >
            <FavoriteHeart active={isFavorite} />
          </Button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost" className="rounded-full" aria-label="Mais opções">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              <DropdownMenuItem
                onSelect={() => {
                  saveVideoInfo(result);
                  playNext([result.id]);
                }}
              >
                <ListStart /> Tocar em seguida
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  saveVideoInfo(result);
                  addToQueue([result.id]);
                }}
              >
                <ListEnd /> Adicionar à fila
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ListPlus /> Adicionar à playlist
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuItem
                    onSelect={() => {
                      saveVideoInfo(result);
                      openPlaylistDialog({ videoIds: [result.id] });
                    }}
                  >
                    <Plus /> Nova playlist…
                  </DropdownMenuItem>
                  {playlists.length > 0 && <DropdownMenuSeparator />}
                  {playlists.length > 0 && <DropdownMenuLabel>Suas playlists</DropdownMenuLabel>}
                  {playlists.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      disabled={p.videoIds.includes(result.id)}
                      onSelect={() => {
                        saveVideoInfo(result);
                        addToPlaylist(p.id, [result.id]);
                      }}
                    >
                      <span className="truncate">{p.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-1">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex gap-4 p-2">
          <Skeleton className="aspect-video w-36 shrink-0 rounded-lg sm:w-56 md:w-64" />
          <div className="flex flex-1 flex-col gap-2 py-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="mt-2 hidden h-3 w-2/3 md:block" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchError({
  error,
  viaGoogle,
  query,
  onRetry,
}: {
  error: { message: string; detail?: string };
  viaGoogle: boolean;
  query: string;
  onRetry: () => void;
}) {
  const openAddDialog = useUi((s) => s.openAddDialog);
  const setSettingsOpen = useUi((s) => s.setSettingsOpen);
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
        <div className="min-w-0">
          <h3 className="font-semibold">A busca não funcionou</h3>
          <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {viaGoogle ? (
              <>
                <li>Confira se o ID do mecanismo de pesquisa está certo (Configurações → Busca).</li>
                <li>
                  Se o endereço <code className="rounded bg-muted px-1">cse.google.com</code> estiver bloqueado na sua rede,
                  use “Abrir no Google” e cole o link do vídeo aqui com Ctrl+V.
                </li>
              </>
            ) : (
              <>
                <li>
                  A busca pelo servidor precisa que o computador que roda o app alcance o youtube.com. Em redes que bloqueiam
                  o YouTube, use a <strong className="text-foreground">busca pelo Google</strong> (Configurações → Busca).
                </li>
              </>
            )}
          </ul>
          {error.detail && (
            <p className="mt-3 font-mono text-xs break-words text-muted-foreground/70">Detalhe técnico: {error.detail}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="rounded-full" onClick={onRetry}>
              Tentar de novo
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <a href={googleWebSearchUrl(query)} target="_blank" rel="noreferrer">
                <ExternalLink /> Abrir no Google
              </a>
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setSettingsOpen(true)}>
              Configurações
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full" onClick={() => openAddDialog()}>
              <Plus /> Colar um link
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
