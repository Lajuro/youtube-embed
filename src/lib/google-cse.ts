/**
 * Busca de vídeos do YouTube PELO GOOGLE, rodando no navegador.
 *
 * Por que assim? Na rede da empresa o youtube.com é bloqueado, mas o Google
 * funciona. O Google oferece gratuitamente a "Programmable Search Element":
 * um script (cse.js) que coloca uma caixa de busca do Google dentro de qualquer
 * site. Ele roda no navegador — o mesmo caminho que você já usa para pesquisar.
 *
 * Em vez de mostrar o visual padrão do Google, usamos os "callbacks" do script:
 * quando os resultados chegam, o Google nos entrega a lista (título, link,
 * miniatura e os metadados do vídeo que ele indexou) e nós desenhamos do nosso jeito.
 *
 * Só é preciso criar (de graça) um "mecanismo de pesquisa" restrito ao
 * youtube.com e colar o ID dele (o "cx") nas Configurações. Não é chave de API.
 *
 * Documentação: https://developers.google.com/custom-search/docs/element
 */

import { parseVideoId } from "@/lib/youtube";
import type { SearchPage, SearchResult } from "@/lib/youtube-search";

const GNAME = "sintonia-search";
const LOAD_TIMEOUT_MS = 15_000;
const SEARCH_TIMEOUT_MS = 15_000;

/* ---------- Tipos mínimos do que o script do Google expõe ---------- */

interface CseResult {
  url?: string;
  unescapedUrl?: string;
  titleNoFormatting?: string;
  contentNoFormatting?: string;
  thumbnailImage?: { url?: string };
  richSnippet?: Record<string, Record<string, unknown> | undefined>;
}

interface CseElement {
  execute: (query: string) => void;
  clearAllResults?: () => void;
}

interface GcseConfig {
  parsetags?: "explicit" | "onload";
  initializationCallback?: () => void;
  searchCallbacks?: {
    web?: {
      starting?: (gname: string, query: string) => string | void;
      ready?: (gname: string, query: string, promos: unknown[], results: CseResult[], div: HTMLElement) => boolean;
    };
  };
}

declare global {
  interface Window {
    __gcse?: GcseConfig;
    google?: {
      search?: {
        cse?: {
          element?: {
            render: (component: { div: HTMLElement | string; tag: string; gname?: string; attributes?: Record<string, unknown> }) => void;
            getElement: (gname: string) => CseElement | undefined;
          };
        };
      };
    };
  }
}

/* ---------- Conversão dos resultados ---------- */

/** Procura uma chave ignorando maiúsculas e pontuação ("og:title" = "ogTitle"). */
function pick(obj: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
  if (!obj) return undefined;
  const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");
  const wanted = keys.map(normalize);
  for (const [key, value] of Object.entries(obj)) {
    if (wanted.includes(normalize(key)) && value != null && value !== "") return String(value);
  }
  return undefined;
}

function snippet(result: CseResult, name: string) {
  const rs = result.richSnippet ?? {};
  for (const [key, value] of Object.entries(rs)) {
    if (key.toLowerCase() === name) return Array.isArray(value) ? value[0] : value;
  }
  return undefined;
}

/** "PT1H2M3S" → 3723 */
export function parseIsoDuration(value: string | undefined): number | undefined {
  const m = value?.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (!m) return undefined;
  const [, d = "0", h = "0", min = "0", s = "0"] = m;
  const total = Number(d) * 86400 + Number(h) * 3600 + Number(min) * 60 + Math.round(Number(s));
  return total || undefined;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

function formatPublished(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function toSearchResult(result: CseResult): SearchResult | null {
  const id = parseVideoId(result.unescapedUrl ?? result.url ?? "");
  if (!id) return null; // canais, playlists e outras páginas do youtube.com

  const video = snippet(result, "videoobject");
  const meta = snippet(result, "metatags");
  const person = snippet(result, "person");
  const thumb = snippet(result, "csethumbnail");

  const rawTitle = pick(video, "name") ?? pick(meta, "og:title", "twitter:title") ?? result.titleNoFormatting ?? id;
  const duration = parseIsoDuration(pick(video, "duration"));
  const views = Number(pick(video, "interactioncount", "userinteractioncount"));

  return {
    id,
    title: rawTitle.replace(/\s*-\s*YouTube$/i, ""),
    author: pick(person, "name") ?? pick(video, "author", "channelname"),
    duration,
    durationText: duration ? formatDuration(duration) : undefined,
    views: Number.isFinite(views) && views > 0 ? `${compact.format(views)} visualizações` : undefined,
    published: formatPublished(pick(video, "uploaddate", "datepublished")),
    description: pick(video, "description") ?? pick(meta, "og:description") ?? result.contentNoFormatting,
    isLive: false,
    thumbnail: pick(thumb, "src") ?? result.thumbnailImage?.url ?? pick(video, "thumbnailurl"),
  };
}

/* ---------- Carregamento do script e execução das buscas ---------- */

let loading: Promise<void> | null = null;
let loadedCx: string | null = null;
let container: HTMLDivElement | null = null;
let pending: { resolve: (page: SearchPage) => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> } | null =
  null;

function handleResults(results: CseResult[]) {
  const request = pending;
  if (!request) return;
  pending = null;
  clearTimeout(request.timer);

  const seen = new Set<string>();
  const items: SearchResult[] = [];
  for (const r of results ?? []) {
    const item = toSearchResult(r);
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      items.push(item);
    }
  }
  // O Google desenha (escondido) a paginação; usamos ela para "Carregar mais".
  // Espera um tique para o DOM da paginação existir.
  setTimeout(() => request.resolve({ results: items, continuation: nextPageButton() ? "next" : undefined }), 50);
}

function nextPageButton(): HTMLElement | null {
  const current = container?.querySelector(".gsc-cursor-current-page");
  const next = current?.nextElementSibling;
  return next instanceof HTMLElement && next.classList.contains("gsc-cursor-page") ? next : null;
}

/** Carrega o cse.js uma única vez. Trocar o cx exige recarregar a página. */
export function loadGoogleSearch(cx: string): Promise<void> {
  if (loadedCx && loadedCx !== cx) {
    return Promise.reject(new Error("O ID do mecanismo mudou. Recarregue a página para aplicar."));
  }
  if (loading) return loading;
  loadedCx = cx;

  loading = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      loading = null;
      loadedCx = null;
      reject(new Error("O Google não respondeu (cse.google.com pode estar bloqueado)."));
    }, LOAD_TIMEOUT_MS);

    container = document.createElement("div");
    container.id = "gcse-hidden-results";
    container.setAttribute("aria-hidden", "true");
    // Fica fora da tela: o Google desenha aqui, nós só lemos os resultados.
    Object.assign(container.style, { position: "fixed", left: "-10000px", top: "0", width: "800px", height: "1px", overflow: "hidden" });
    document.body.appendChild(container);

    window.__gcse = {
      parsetags: "explicit",
      initializationCallback: () => {
        try {
          window.google?.search?.cse?.element?.render({
            div: container!,
            tag: "searchresults-only",
            gname: GNAME,
            attributes: { enableHistory: false, linkTarget: "_blank" },
          });
          clearTimeout(timer);
          resolve();
        } catch (err) {
          clearTimeout(timer);
          reject(err as Error);
        }
      },
      searchCallbacks: {
        web: {
          // Retornar false deixa o Google desenhar no container escondido (precisamos da paginação dele).
          ready: (_gname, _query, _promos, results) => {
            handleResults(results);
            return false;
          },
        },
      },
    };

    const script = document.createElement("script");
    script.src = `https://cse.google.com/cse.js?cx=${encodeURIComponent(cx)}`;
    script.async = true;
    script.onerror = () => {
      clearTimeout(timer);
      loading = null;
      loadedCx = null;
      script.remove();
      reject(new Error("Não consegui carregar o script do Google (cse.google.com bloqueado?)."));
    };
    document.head.appendChild(script);
  });
  return loading;
}

function waitForResults(): Promise<SearchPage> {
  if (pending) {
    clearTimeout(pending.timer);
    pending.reject(new Error("Busca substituída por outra."));
  }
  return new Promise<SearchPage>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending = null;
      // Sem resultados, o Google só desenha o aviso de "nenhum resultado".
      if (container?.querySelector(".gs-no-results-result")) resolve({ results: [] });
      else reject(new Error("O Google demorou demais para responder."));
    }, SEARCH_TIMEOUT_MS);
    pending = { resolve, reject, timer };
  });
}

export async function googleSearch(cx: string, query: string): Promise<SearchPage> {
  await loadGoogleSearch(cx);
  const element = window.google?.search?.cse?.element?.getElement(GNAME);
  if (!element) throw new Error("A busca do Google não inicializou. Confira o ID do mecanismo.");
  const result = waitForResults();
  element.execute(query);
  return result;
}

/** Próxima página de resultados (clica na paginação escondida do Google). */
export async function googleSearchMore(): Promise<SearchPage> {
  const button = nextPageButton();
  if (!button) return { results: [] };
  const result = waitForResults();
  button.click();
  return result;
}

/** Link para a busca normal do Google, já filtrando vídeos do YouTube. */
export function googleWebSearchUrl(query: string) {
  return `https://www.google.com/search?tbm=vid&q=${encodeURIComponent(`${query} site:youtube.com`)}`;
}
