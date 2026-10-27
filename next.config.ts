import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // O cache em disco do Turbopack às vezes não percebe mudanças no globals.css
    // (processado pelo loader do Tailwind) e reaproveita um CSS antigo. Como o app é
    // pequeno e costuma ser atualizado copiando arquivos (instalador), preferimos
    // compilar sempre do zero.
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
