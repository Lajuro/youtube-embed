import { create } from "zustand";

/** Evento do Chrome/Edge que permite abrir a janela "Instalar app" quando quisermos. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    /** Guardado pelo script inline do <head>, caso o evento chegue antes do React. */
    __installPrompt?: BeforeInstallPromptEvent;
  }
}

export const useInstall = create<{ prompt: BeforeInstallPromptEvent | null; installed: boolean }>(() => ({
  prompt: null,
  installed: false,
}));

/** Começa a ouvir o pedido de instalação (devolve a função de limpeza). */
export function listenForInstall() {
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  useInstall.setState({ prompt: window.__installPrompt ?? null, installed: standalone });

  const onPrompt = (e: Event) => {
    e.preventDefault();
    useInstall.setState({ prompt: e as BeforeInstallPromptEvent });
  };
  const onInstalled = () => useInstall.setState({ prompt: null, installed: true });
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

export async function promptInstall() {
  const event = useInstall.getState().prompt;
  if (!event) return false;
  await event.prompt();
  const { outcome } = await event.userChoice;
  // O mesmo evento não pode ser usado duas vezes.
  useInstall.setState({ prompt: null });
  window.__installPrompt = undefined;
  return outcome === "accepted";
}

/** Para o script inline do <head>: guarda o pedido de instalação se ele vier cedo. */
export const INSTALL_BOOT_SCRIPT = `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__installPrompt=e});`;
