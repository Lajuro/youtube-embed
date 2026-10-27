import { NextResponse, type NextRequest } from "next/server";

import { searchYouTube } from "@/lib/youtube-search";

/**
 * GET /api/search?q=lofi            → primeira página de resultados
 * GET /api/search?c=<continuation>  → próxima página
 *
 * A busca acontece aqui no servidor (e não no navegador) porque o YouTube não
 * permite que outros sites leiam as respostas dele direto do navegador (CORS).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = params.get("q")?.trim().slice(0, 200) ?? "";
  const continuation = params.get("c") ?? undefined;

  if (!query && !continuation) {
    return NextResponse.json({ error: "Informe o que buscar." }, { status: 400 });
  }

  try {
    const page = await searchYouTube(query, continuation);
    return NextResponse.json(page);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Não foi possível buscar no YouTube a partir do servidor do app.",
        detail: (err as Error).message,
      },
      { status: 502 }
    );
  }
}
