"use client";

import { AddVideoDialog } from "@/components/dialogs/add-video-dialog";
import { EditVideoDialog } from "@/components/dialogs/edit-video-dialog";
import { PlaylistDialog } from "@/components/dialogs/playlist-dialog";
import { SettingsDialog } from "@/components/dialogs/settings-dialog";
import { ShortcutsDialog } from "@/components/dialogs/shortcuts-dialog";
import { CommandPalette } from "@/components/command-palette";
import { DocumentTitle } from "@/components/document-title";
import { GlobalHotkeys } from "@/components/global-hotkeys";
import { MobileSidebar, Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { NowPlaying } from "@/components/player/now-playing";
import { PlayerBar } from "@/components/player/player-bar";
import { PlayerHost } from "@/components/player/player-host";
import { QueueSheet } from "@/components/player/queue-sheet";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main id="main" className="relative min-w-0 flex-1 overflow-y-auto scrollbar-thin">
          <TopBar />
          {children}
        </main>
      </div>
      <PlayerBar />

      <NowPlaying />
      <PlayerHost />
      <QueueSheet />
      <MobileSidebar />
      <AddVideoDialog />
      <PlaylistDialog />
      <EditVideoDialog />
      <SettingsDialog />
      <ShortcutsDialog />
      <CommandPalette />
      <GlobalHotkeys />
      <DocumentTitle />
    </div>
  );
}
