import type { MetadataRoute } from "next";

/**
 * Manifesto do app (PWA): permite instalar o Sintonia pelo Chrome/Edge e abrir
 * numa janela própria, sem abas — com atalho na barra de tarefas e no menu Iniciar.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Sintonia",
    short_name: "Sintonia",
    description: "Seu player de vídeos do YouTube: playlists, favoritos, cursos e foco — tudo salvo no seu navegador.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#121016",
    theme_color: "#121016",
    categories: ["music", "education", "productivity"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Buscar", url: "/search", icons: [{ src: "/icons/192", sizes: "192x192" }] },
      { name: "Favoritos", url: "/favorites", icons: [{ src: "/icons/192", sizes: "192x192" }] },
      { name: "Cursos", url: "/courses", icons: [{ src: "/icons/192", sizes: "192x192" }] },
    ],
  };
}
