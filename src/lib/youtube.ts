/**
 * Utilitários para lidar com links e metadados do YouTube.
 *
 * Tudo aqui roda no navegador. Nada depende de chave de API: usamos o
 * endpoint público de oEmbed (com fallback) e, em último caso, os
 * próprios dados que o player embutido devolve quando o vídeo carrega.
 */

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function isValidVideoId(value: string) {
  return VIDEO_ID_RE.test(value);
}

/**
 * Extrai o ID de 11 caracteres a partir de praticamente qualquer formato:
 * - dQw4w9WgXcQ
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s
 * - https://youtu.be/dQw4w9WgXcQ?si=...
 * - https://www.youtube.com/shorts/dQw4w9WgXcQ
 * - https://www.youtube.com/live/dQw4w9WgXcQ
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 * - https://music.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://m.youtube.com/watch?v=dQw4w9WgXcQ
 * - <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"...>
 */
export function parseVideoId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (isValidVideoId(raw)) return raw;

  // Código de <iframe> colado: pega o src.
  const iframeSrc = raw.match(/src=["']([^"']+)["']/i)?.[1];
  const candidate = iframeSrc ?? raw;

  let url: URL | null = null;
  try {
    url = new URL(candidate.startsWith("http") ? candidate : `https://${candidate}`);
  } catch {
    url = null;
  }

  if (url) {
    const host = url.hostname.replace(/^www\.|^m\.|^music\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/")[1];
      if (id && isValidVideoId(id)) return id;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = url.searchParams.get("v");
      if (v && isValidVideoId(v)) return v;
      const [, kind, id] = url.pathname.split("/");
      if (["embed", "shorts", "live", "v", "e"].includes(kind) && id && isValidVideoId(id)) {
        return id;
      }
    }
  }

  // Última tentativa: procurar algo com cara de ID após padrões conhecidos.
  const loose = raw.match(/(?:v=|\/(?:embed|shorts|live|v)\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return loose?.[1] ?? null;
}

/** Extrai o tempo inicial (?t=90 / ?t=1m30s / &start=90) de um link, em segundos. */
export function parseStartTime(input: string): number | undefined {
  const match = input.match(/[?&#](?:t|start)=([0-9hms]+)/);
  if (!match) return undefined;
  const value = match[1];
  if (/^\d+$/.test(value)) return Number(value);
  const parts = value.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  if (!parts) return undefined;
  const [, h = "0", m = "0", s = "0"] = parts;
  const total = Number(h) * 3600 + Number(m) * 60 + Number(s);
  return total || undefined;
}

/** Quebra um texto colado (várias linhas, vírgulas, espaços) em IDs únicos. */
export function parseManyVideoIds(input: string): string[] {
  const tokens = input
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const ids = new Set<string>();
  for (const token of tokens) {
    const id = parseVideoId(token);
    if (id) ids.add(id);
  }
  // Se nada foi achado token a token, tenta a string inteira (ex.: iframe com espaços).
  if (ids.size === 0) {
    const single = parseVideoId(input);
    if (single) ids.add(single);
  }
  return [...ids];
}

export type ThumbnailQuality = "default" | "mqdefault" | "hqdefault" | "sddefault" | "maxresdefault";

export function thumbnailUrl(id: string, quality: ThumbnailQuality = "hqdefault") {
  return `https://i.ytimg.com/vi/${id}/${quality}.jpg`;
}

export function watchUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

export type EmbedHost = "www.youtube.com" | "www.youtube-nocookie.com";

export interface VideoMetadata {
  title: string;
  author?: string;
  authorUrl?: string;
}

async function fetchJson(url: string, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

const metadataCache = new Map<string, Promise<VideoMetadata | null>>();

/**
 * Busca título e canal do vídeo. Tenta, em ordem:
 * 1. oEmbed oficial do YouTube
 * 2. noembed.com (proxy público de oEmbed, útil quando o domínio principal está bloqueado)
 * Se ambos falharem, retorna null e o título será preenchido pelo player ao tocar.
 */
export function fetchVideoMetadata(id: string): Promise<VideoMetadata | null> {
  const cached = metadataCache.get(id);
  if (cached) return cached;

  const target = encodeURIComponent(watchUrl(id));
  const sources = [
    `https://www.youtube.com/oembed?format=json&url=${target}`,
    `https://noembed.com/embed?url=${target}`,
  ];

  const promise = (async () => {
    for (const source of sources) {
      try {
        const data = await fetchJson(source);
        if (typeof data.title === "string" && data.title && !data.error) {
          return {
            title: data.title,
            author: typeof data.author_name === "string" ? data.author_name : undefined,
            authorUrl: typeof data.author_url === "string" ? data.author_url : undefined,
          } satisfies VideoMetadata;
        }
      } catch {
        // tenta a próxima fonte
      }
    }
    return null;
  })();

  metadataCache.set(id, promise);
  // Se falhou, permite tentar de novo mais tarde.
  promise.then((result) => {
    if (!result) metadataCache.delete(id);
  });
  return promise;
}

/** Códigos de erro do player embutido → mensagem amigável. */
export function playerErrorMessage(code: number) {
  switch (code) {
    case 2:
      return "ID de vídeo inválido.";
    case 5:
      return "O player não conseguiu reproduzir este vídeo.";
    case 100:
      return "Vídeo não encontrado (removido ou privado).";
    case 101:
    case 150:
      return "O dono do vídeo não permite reprodução fora do YouTube.";
    case 153:
      return "O YouTube recusou o player (cabeçalho Referer ausente).";
    default:
      return `Erro desconhecido do player (${code}).`;
  }
}
