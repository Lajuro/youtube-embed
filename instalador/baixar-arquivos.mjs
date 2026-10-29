#!/usr/bin/env node
/*
 * Baixa o projeto Sintonia do GitHub arquivo por arquivo (via raw.githubusercontent.com).
 * Gerado automaticamente por scripts/bundle.mjs — rode `npm run bundle` para regenerar.
 *
 * Uso:
 *   node baixar-arquivos.mjs [pasta] [--branch=nome] [--force]
 *
 * Padrões: pasta "sintonia", branch "ccr-51a0610f-9pvjs9".
 * Precisa do Node 18 ou mais novo (usa fetch nativo).
 * Se a sua rede usa proxy, o Node pode não enxergá-lo — nesse caso prefira o
 * sintonia-instalador.cjs, que não precisa de internet para recriar os arquivos.
 */

import fs from "node:fs";
import path from "node:path";

const REPO = "Lajuro/youtube-embed";
const FILES = [
  ".gitignore",
  "AGENTS.md",
  "README.md",
  "components.json",
  "eslint.config.mjs",
  "next.config.ts",
  "package-lock.json",
  "package.json",
  "scripts/bundle.mjs",
  "scripts/dev-proxy.mjs",
  "src/app/api/search/route.ts",
  "src/app/courses/[id]/edit/page.tsx",
  "src/app/courses/[id]/page.tsx",
  "src/app/courses/page.tsx",
  "src/app/favorites/page.tsx",
  "src/app/globals.css",
  "src/app/icon.svg",
  "src/app/icons/[variant]/route.tsx",
  "src/app/layout.tsx",
  "src/app/library/page.tsx",
  "src/app/manifest.ts",
  "src/app/page.tsx",
  "src/app/playlists/[id]/page.tsx",
  "src/app/playlists/page.tsx",
  "src/app/search/page.tsx",
  "src/components/background-sync.tsx",
  "src/components/collection-actions.tsx",
  "src/components/command-palette.tsx",
  "src/components/courses/add-lessons-dialog.tsx",
  "src/components/courses/course-card.tsx",
  "src/components/courses/course-classroom.tsx",
  "src/components/courses/course-cover.tsx",
  "src/components/courses/course-curriculum.tsx",
  "src/components/courses/course-dialog.tsx",
  "src/components/courses/course-editor.tsx",
  "src/components/courses/course-notes.tsx",
  "src/components/courses/courses-view.tsx",
  "src/components/dialogs/add-video-dialog.tsx",
  "src/components/dialogs/edit-video-dialog.tsx",
  "src/components/dialogs/playlist-dialog.tsx",
  "src/components/dialogs/settings-dialog.tsx",
  "src/components/dialogs/shortcuts-dialog.tsx",
  "src/components/document-title.tsx",
  "src/components/empty-state.tsx",
  "src/components/global-hotkeys.tsx",
  "src/components/home/home-view.tsx",
  "src/components/home/today-stats.tsx",
  "src/components/hydration-gate.tsx",
  "src/components/layout/app-shell.tsx",
  "src/components/layout/sidebar.tsx",
  "src/components/layout/top-bar.tsx",
  "src/components/link-drop-zone.tsx",
  "src/components/page-header.tsx",
  "src/components/player/now-playing.tsx",
  "src/components/player/osd.tsx",
  "src/components/player/playback-rate-menu.tsx",
  "src/components/player/player-bar.tsx",
  "src/components/player/player-host.tsx",
  "src/components/player/queue-list.tsx",
  "src/components/player/queue-sheet.tsx",
  "src/components/playlist/playlist-card.tsx",
  "src/components/playlist/playlist-cover.tsx",
  "src/components/providers.tsx",
  "src/components/search/google-setup.tsx",
  "src/components/timers/timer-engine.tsx",
  "src/components/timers/timer-popover.tsx",
  "src/components/ui/accordion.tsx",
  "src/components/ui/alert-dialog.tsx",
  "src/components/ui/badge.tsx",
  "src/components/ui/button.tsx",
  "src/components/ui/checkbox.tsx",
  "src/components/ui/command.tsx",
  "src/components/ui/context-menu.tsx",
  "src/components/ui/dialog.tsx",
  "src/components/ui/dropdown-menu.tsx",
  "src/components/ui/input.tsx",
  "src/components/ui/kbd.tsx",
  "src/components/ui/label.tsx",
  "src/components/ui/popover.tsx",
  "src/components/ui/progress.tsx",
  "src/components/ui/scroll-area.tsx",
  "src/components/ui/separator.tsx",
  "src/components/ui/sheet.tsx",
  "src/components/ui/skeleton.tsx",
  "src/components/ui/slider.tsx",
  "src/components/ui/sonner.tsx",
  "src/components/ui/switch.tsx",
  "src/components/ui/tabs.tsx",
  "src/components/ui/textarea.tsx",
  "src/components/ui/tooltip.tsx",
  "src/components/video/collection-toolbar.tsx",
  "src/components/video/equalizer.tsx",
  "src/components/video/favorite-heart.tsx",
  "src/components/video/video-card.tsx",
  "src/components/video/video-list.tsx",
  "src/components/video/video-menu.tsx",
  "src/components/video/video-thumbnail.tsx",
  "src/components/views/favorites-view.tsx",
  "src/components/views/library-view.tsx",
  "src/components/views/playlist-view.tsx",
  "src/components/views/playlists-view.tsx",
  "src/components/views/search-view.tsx",
  "src/lib/accents.ts",
  "src/lib/actions.ts",
  "src/lib/chime.ts",
  "src/lib/courses.ts",
  "src/lib/google-cse.ts",
  "src/lib/layout.ts",
  "src/lib/pwa.ts",
  "src/lib/utils.ts",
  "src/lib/youtube-bridge.ts",
  "src/lib/youtube-prober.ts",
  "src/lib/youtube-search.ts",
  "src/lib/youtube.ts",
  "src/stores/library-store.ts",
  "src/stores/player-store.ts",
  "src/stores/stats-store.ts",
  "src/stores/timer-store.ts",
  "src/stores/ui-store.ts",
  "tsconfig.json"
];

const args = process.argv.slice(2);
const force = args.includes("--force");
const branch = args.find((a) => a.startsWith("--branch="))?.split("=")[1] || "ccr-51a0610f-9pvjs9";
const target = path.resolve(args.find((a) => !a.startsWith("--")) || "sintonia");

if (fs.existsSync(target) && fs.readdirSync(target).length > 0 && !force) {
  console.error(`✖ A pasta "${target}" já existe e não está vazia. Use --force para sobrescrever.`);
  process.exit(1);
}

const failures = [];
let done = 0;

async function download(file) {
  const url = `https://raw.githubusercontent.com/${REPO}/${encodeURIComponent(branch)}/${file.split("/").map(encodeURIComponent).join("/")}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const destination = path.resolve(target, file);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, Buffer.from(await res.arrayBuffer()));
      done++;
      process.stdout.write(`\r  ${done}/${FILES.length} arquivos`);
      return;
    } catch (err) {
      if (attempt === 3) failures.push(`${file} (${err.message})`);
      else await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }
}

console.log(`Baixando ${FILES.length} arquivos de ${REPO} (branch ${branch}) para ${target}`);
// Poucos downloads em paralelo para não ser bloqueado.
const queue = [...FILES];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) await download(queue.shift());
  })
);
console.log("");

if (failures.length) {
  console.error(`✖ ${failures.length} arquivo(s) falharam:`);
  for (const f of failures) console.error("   - " + f);
  console.error("  Rode de novo com --force para tentar outra vez.");
  process.exit(1);
}

console.log("✔ Tudo baixado! Próximos passos:");
console.log(`  cd "${path.relative(process.cwd(), target) || "."}"`);
console.log("  npm install");
console.log("  npm run dev");
