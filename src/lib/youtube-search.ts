/**
 * Busca de vídeos no YouTube SEM chave de API.
 *
 * Roda no servidor (rota /api/search) porque o navegador não consegue ler
 * respostas de youtube.com a partir de outro site (bloqueio de CORS).
 *
 * Como funciona: o próprio site do YouTube busca vídeos chamando um endpoint
 * interno, o "InnerTube" (`/youtubei/v1/search`), que devolve JSON. Fazemos a
 * mesma chamada que o site faz. Se ela falhar, baixamos a página de resultados
 * (`/results?search_query=...`) e extraímos o JSON que vem embutido nela
 * (`var ytInitialData = {...}`).
 *
 * Como o formato desse JSON muda de tempos em tempos, em vez de seguir um
 * caminho fixo nós percorremos o objeto inteiro procurando os "blocos" que
 * representam vídeos (`videoRenderer` e, nos layouts novos, `lockupViewModel`).
 */

export interface SearchResult {
  id: string;
  title: string;
  author?: string;
  /** Duração em segundos (ausente em transmissões ao vivo). */
  duration?: number;
  durationText?: string;
  views?: string;
  published?: string;
  description?: string;
  isLive: boolean;
}

export interface SearchPage {
  results: SearchResult[];
  /** Token para buscar a próxima página ("Carregar mais"). */
  continuation?: string;
}

const ORIGIN = "https://www.youtube.com";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
/** Filtro "somente vídeos" (o mesmo `sp=` que o site usa na URL). */
const VIDEOS_ONLY = "EgIQAQ%3D%3D";
const FALLBACK_CLIENT_VERSION = "2.20261015.01.00";

let clientVersion = FALLBACK_CLIENT_VERSION;

type Json = Record<string, unknown>;

/* ---------------- utilidades para ler o JSON do YouTube ---------------- */

function get(obj: unknown, path: (string | number)[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string | number, unknown>)[key];
  }
  return current;
}

/** Textos do YouTube vêm como {simpleText} ou {runs:[{text}]} ou {content}. */
function text(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return typeof value === "string" ? value : undefined;
  const v = value as Json;
  if (typeof v.simpleText === "string") return v.simpleText;
  if (typeof v.content === "string") return v.content;
  if (Array.isArray(v.runs)) {
    const joined = v.runs.map((r) => (r && typeof r === "object" ? ((r as Json).text ?? "") : "")).join("");
    return joined || undefined;
  }
  return undefined;
}

/** "1:02:45" → 3765 */
export function parseDuration(value: string | undefined): number | undefined {
  if (!value || !/^\d+(:\d{1,2}){1,2}$/.test(value.trim())) return undefined;
  return value
    .trim()
    .split(":")
    .reduce((total, part) => total * 60 + Number(part), 0);
}

/** Percorre todo o objeto chamando `visit` para cada par chave/valor. */
function walk(node: unknown, visit: (key: string, value: unknown) => void) {
  const stack: unknown[] = [node];
  while (stack.length) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      for (let i = current.length - 1; i >= 0; i--) stack.push(current[i]);
    } else if (current && typeof current === "object") {
      const entries = Object.entries(current as Json);
      for (let i = entries.length - 1; i >= 0; i--) {
        const [key, value] = entries[i];
        visit(key, value);
        stack.push(value);
      }
    }
  }
}

/* ---------------- conversão dos blocos de vídeo ---------------- */

function fromVideoRenderer(r: Json): SearchResult | null {
  const id = r.videoId;
  if (typeof id !== "string" || !/^[\w-]{11}$/.test(id)) return null;
  const title = text(r.title);
  if (!title) return null;

  const badges = JSON.stringify([r.badges ?? [], r.thumbnailOverlays ?? []]);
  const durationText = text(r.lengthText);
  const isLive = /LIVE/.test(badges) && !durationText;

  return {
    id,
    title,
    author: text(r.ownerText) ?? text(r.longBylineText) ?? text(r.shortBylineText),
    durationText,
    duration: parseDuration(durationText),
    views: text(r.shortViewCountText) ?? text(r.viewCountText),
    published: text(r.publishedTimeText),
    description: text(get(r, ["detailedMetadataSnippets", 0, "snippetText"])) ?? text(r.descriptionSnippet),
    isLive,
  };
}

function fromLockup(r: Json): SearchResult | null {
  const type = r.contentType;
  if (typeof type === "string" && type !== "LOCKUP_CONTENT_TYPE_VIDEO") return null;
  const id = r.contentId;
  if (typeof id !== "string" || !/^[\w-]{11}$/.test(id)) return null;
  const meta = get(r, ["metadata", "lockupMetadataViewModel"]) as Json | undefined;
  const title = text(meta?.title);
  if (!title) return null;

  // Linhas de metadados: [canal] e [visualizações • publicado].
  const rows = (get(meta, ["metadata", "contentMetadataViewModel", "metadataRows"]) as Json[] | undefined) ?? [];
  const parts = rows.map((row) =>
    ((row.metadataParts as Json[] | undefined) ?? []).map((p) => text(p.text)).filter(Boolean) as string[]
  );

  // Selos sobre a miniatura: duração ("3:45") ou "AO VIVO".
  let durationText: string | undefined;
  let isLive = false;
  walk(r.contentImage, (key, value) => {
    if (key === "thumbnailBadgeViewModel" && value && typeof value === "object") {
      const label = text((value as Json).text);
      if (parseDuration(label)) durationText = label;
      else if (/live|vivo/i.test(JSON.stringify(value))) isLive = true;
    }
  });

  return {
    id,
    title,
    author: parts[0]?.[0],
    durationText,
    duration: parseDuration(durationText),
    views: parts[1]?.[0],
    published: parts[1]?.[1],
    isLive: isLive && !durationText,
  };
}

/** Extrai vídeos + token de continuação de qualquer resposta de busca. */
export function extractSearchPage(data: unknown): SearchPage {
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  let continuation: string | undefined;

  walk(data, (key, value) => {
    if (!value || typeof value !== "object") return;
    let item: SearchResult | null = null;
    if (key === "videoRenderer") item = fromVideoRenderer(value as Json);
    else if (key === "lockupViewModel") item = fromLockup(value as Json);
    else if (key === "continuationCommand" && !continuation) {
      const token = (value as Json).token;
      if (typeof token === "string") continuation = token;
    }
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      results.push(item);
    }
  });

  return { results, continuation };
}

/* ---------------- requisições ---------------- */

const baseHeaders = {
  "User-Agent": USER_AGENT,
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  // Evita a tela de consentimento de cookies (comum em servidores na Europa).
  Cookie: "CONSENT=YES+cb; SOCS=CAI",
};

async function innertube(body: Json): Promise<unknown> {
  const res = await fetch(`${ORIGIN}/youtubei/v1/search?prettyPrint=false`, {
    method: "POST",
    headers: {
      ...baseHeaders,
      "Content-Type": "application/json",
      Origin: ORIGIN,
      Referer: `${ORIGIN}/`,
      "X-YouTube-Client-Name": "1",
      "X-YouTube-Client-Version": clientVersion,
    },
    body: JSON.stringify({
      context: { client: { clientName: "WEB", clientVersion, hl: "pt", gl: "BR" } },
      ...body,
    }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`InnerTube respondeu HTTP ${res.status}`);
  return res.json();
}

/** Plano B: baixa a página de resultados e lê o JSON embutido nela. */
async function scrapeResultsPage(query: string): Promise<unknown> {
  const url = `${ORIGIN}/results?search_query=${encodeURIComponent(query)}&sp=${encodeURIComponent(VIDEOS_ONLY)}&hl=pt&gl=BR`;
  const res = await fetch(url, {
    headers: { ...baseHeaders, Accept: "text/html" },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Página de resultados respondeu HTTP ${res.status}`);
  const html = await res.text();

  // Aproveita para descobrir a versão atual do cliente web (usada na paginação).
  const version = html.match(/"INNERTUBE_CLIENT_VERSION":"([\d.]+)"/)?.[1];
  if (version) clientVersion = version;

  const start = html.indexOf("ytInitialData");
  if (start === -1) throw new Error("Não encontrei os resultados na página (layout mudou?)");
  const braceStart = html.indexOf("{", start);
  const scriptEnd = html.indexOf(";</script>", braceStart);
  if (braceStart === -1 || scriptEnd === -1) throw new Error("Resultados em formato inesperado");
  return JSON.parse(html.slice(braceStart, scriptEnd));
}

/** "fetch failed" sozinho não ajuda: o motivo real (DNS, proxy, timeout…) fica em `cause`. */
function describe(err: unknown) {
  const error = err as Error & { cause?: { code?: string; message?: string } };
  if (error.name === "TimeoutError") return "tempo esgotado ao falar com o YouTube";
  const cause = error.cause?.code ?? error.cause?.message;
  return cause ? `${error.message} (${cause})` : error.message;
}

export async function searchYouTube(query: string, continuation?: string): Promise<SearchPage> {
  if (continuation) {
    return extractSearchPage(await innertube({ continuation }));
  }

  const errors: string[] = [];
  try {
    const page = extractSearchPage(await innertube({ query, params: VIDEOS_ONLY }));
    if (page.results.length) return page;
  } catch (err) {
    errors.push(describe(err));
  }
  try {
    const page = extractSearchPage(await scrapeResultsPage(query));
    if (page.results.length || !errors.length) return page;
  } catch (err) {
    errors.push(describe(err));
  }
  if (errors.length) throw new Error(errors.join(" · "));
  return { results: [] };
}
