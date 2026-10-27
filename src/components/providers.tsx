"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useLibrary } from "@/stores/library-store";
import { usePlayer } from "@/stores/player-store";
import { useHydration, useSearchHistory, useSettings } from "@/stores/ui-store";

/** Carrega os dados salvos no localStorage depois que a página monta no navegador. */
function StoreHydrator() {
  useEffect(() => {
    Promise.all([
      useLibrary.persist.rehydrate(),
      usePlayer.persist.rehydrate(),
      useSettings.persist.rehydrate(),
      useSearchHistory.persist.rehydrate(),
    ]).finally(() => {
      // Retomar a sessão anterior sem tocar automaticamente.
      if (usePlayer.getState().queue.length) usePlayer.setState({ status: "paused", autoplay: false });
      useHydration.getState().setHydrated();
    });

    // Mantém várias abas sincronizadas.
    const onStorage = (e: StorageEvent) => {
      if (e.key === "sintonia:library") useLibrary.persist.rehydrate();
      if (e.key === "sintonia:settings") useSettings.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <StoreHydrator />
        {children}
        <Toaster position="top-center" richColors={false} closeButton />
      </TooltipProvider>
    </ThemeProvider>
  );
}
