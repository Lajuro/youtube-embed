"use client";

import { AddVideoDialog } from "@/components/dialogs/add-video-dialog";
import { CourseDialog } from "@/components/courses/course-dialog";
import { EditVideoDialog } from "@/components/dialogs/edit-video-dialog";
import { PlaylistDialog } from "@/components/dialogs/playlist-dialog";
import { SettingsDialog } from "@/components/dialogs/settings-dialog";
import { ShortcutsDialog } from "@/components/dialogs/shortcuts-dialog";
import { BackgroundSync } from "@/components/background-sync";
import { CommandPalette } from "@/components/command-palette";
import { DocumentTitle } from "@/components/document-title";
import { GlobalHotkeys } from "@/components/global-hotkeys";
import { LinkDropZone } from "@/components/link-drop-zone";
import { MobileSidebar, Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { NowPlaying } from "@/components/player/now-playing";
import { Osd } from "@/components/player/osd";
import { PlayerBar } from "@/components/player/player-bar";
import { PlayerHost } from "@/components/player/player-host";
import { QueueSheet } from "@/components/player/queue-sheet";
import { TimerEngine } from "@/components/timers/timer-engine";
import { usePlayer } from "@/stores/player-store";
import { useSettings, useUi } from "@/stores/ui-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  // No modo foco (sala de aula) a página ocupa a tela toda: sem menu, topo nem barra do player.
  const focus = useUi((s) => s.focusMode);
  // Com o mini player num canto de baixo, sobra um respiro no fim da página para o
  // conteúdo poder rolar até ficar acima dele.
  const miniAtBottom = usePlayer((s) => s.queue.length > 0 && s.videoMode === "mini");
  const corner = useSettings((s) => s.miniCorner);
  const spacer = miniAtBottom && !focus && corner.startsWith("bottom");

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        {!focus && <Sidebar />}
        <main id="main" className="relative min-w-0 flex-1 overflow-y-auto scrollbar-thin">
          {!focus && <TopBar />}
          {children}
          {spacer && <div aria-hidden className="h-28 sm:h-44" />}
        </main>
      </div>
      {!focus && <PlayerBar />}

      <NowPlaying />
      <PlayerHost />
      <QueueSheet />
      <Osd />
      <MobileSidebar />
      <AddVideoDialog />
      <PlaylistDialog />
      <CourseDialog />
      <EditVideoDialog />
      <SettingsDialog />
      <ShortcutsDialog />
      <CommandPalette />
      <GlobalHotkeys />
      <LinkDropZone />
      <DocumentTitle />
      <BackgroundSync />
      <TimerEngine />
    </div>
  );
}
