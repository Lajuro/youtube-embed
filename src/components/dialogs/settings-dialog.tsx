"use client";

import { useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Download, ExternalLink, Globe, Monitor, Moon, Server, ShieldCheck, Sun, Trash2, Tv, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { CREATE_ENGINE_URL, GoogleCxForm } from "@/components/search/google-setup";
import { downloadBackup } from "@/lib/actions";
import { cn, pluralize } from "@/lib/utils";
import type { EmbedHost } from "@/lib/youtube";
import { useLibrary, type LibraryBackup } from "@/stores/library-store";
import { usePlayer } from "@/stores/player-store";
import { useSettings, useUi } from "@/stores/ui-store";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function OptionCard({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-all hover:bg-accent/50",
        selected && "border-primary bg-primary/5 ring-1 ring-primary"
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", selected ? "text-primary" : "text-muted-foreground")} />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </span>
    </button>
  );
}

function storageUsage() {
  try {
    let bytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("sintonia:")) bytes += (localStorage.getItem(key)?.length ?? 0) * 2;
    }
    return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  } catch {
    return "—";
  }
}

export function SettingsDialog() {
  const open = useUi((s) => s.settingsOpen);
  const setOpen = useUi((s) => s.setSettingsOpen);
  const { theme, setTheme } = useTheme();
  const settings = useSettings();
  const videoCount = useLibrary((s) => Object.keys(s.videos).length);
  const playlistCount = useLibrary((s) => s.playlists.length);
  const favoriteCount = useLibrary((s) => s.favorites.length);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingBackup, setPendingBackup] = useState<LibraryBackup | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as LibraryBackup;
      if (data?.app !== "sintonia" || !Array.isArray(data.videos)) throw new Error();
      setPendingBackup(data);
    } catch {
      toast.error("Esse arquivo não parece um backup do Sintonia.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const applyBackup = (mode: "merge" | "replace") => {
    if (!pendingBackup) return;
    const result = useLibrary.getState().importBackup(pendingBackup, mode);
    setPendingBackup(null);
    toast.success("Backup importado", {
      description: `${pluralize(result.videos, "vídeo", "vídeos")} e ${pluralize(result.playlists, "playlist", "playlists")}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto scrollbar-thin sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>Tudo fica salvo só neste navegador — nada vai para servidor nenhum.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-2">
          <Section title="Aparência">
            <div className="grid grid-cols-3 gap-2">
              <OptionCard selected={theme === "dark"} onClick={() => setTheme("dark")} icon={Moon} title="Escuro" />
              <OptionCard selected={theme === "light"} onClick={() => setTheme("light")} icon={Sun} title="Claro" />
              <OptionCard selected={theme === "system"} onClick={() => setTheme("system")} icon={Monitor} title="Sistema" />
            </div>
            <Label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-3 font-normal">
              <span>
                <span className="block text-sm font-medium">Luz ambiente</span>
                <span className="block text-xs text-muted-foreground">
                  Fundo com as cores da capa do vídeo que está tocando.
                </span>
              </span>
              <Switch checked={settings.ambient} onCheckedChange={settings.setAmbient} />
            </Label>
          </Section>

          <Separator />

          <Section
            title="Player"
            description="Se o vídeo não carregar na sua rede, experimente o outro domínio."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  { host: "www.youtube.com", icon: Tv, title: "youtube.com", description: "Padrão. Funciona na maioria das redes." },
                  {
                    host: "www.youtube-nocookie.com",
                    icon: ShieldCheck,
                    title: "youtube-nocookie.com",
                    description: "Modo de privacidade aprimorada.",
                  },
                ] as { host: EmbedHost; icon: typeof Tv; title: string; description: string }[]
              ).map((o) => (
                <OptionCard
                  key={o.host}
                  selected={settings.embedHost === o.host}
                  onClick={() => settings.setEmbedHost(o.host)}
                  icon={o.icon}
                  title={o.title}
                  description={o.description}
                />
              ))}
            </div>
            <Label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-3 font-normal">
              <span>
                <span className="block text-sm font-medium">Pular vídeos bloqueados</span>
                <span className="block text-xs text-muted-foreground">
                  Alguns donos de vídeo proíbem tocar fora do YouTube. Pula para o próximo automaticamente.
                </span>
              </span>
              <Switch checked={settings.autoSkipErrors} onCheckedChange={settings.setAutoSkipErrors} />
            </Label>
          </Section>

          <Separator />

          <Section title="Busca" description="Como o app procura vídeos quando você pesquisa algo.">
            <div className="grid gap-2 sm:grid-cols-2">
              <OptionCard
                selected={settings.searchProvider === "google"}
                onClick={() => settings.setSearchProvider("google")}
                icon={Globe}
                title="Google (recomendado)"
                description="Roda no navegador. Funciona mesmo com o youtube.com bloqueado."
              />
              <OptionCard
                selected={settings.searchProvider === "server"}
                onClick={() => settings.setSearchProvider("server")}
                icon={Server}
                title="Direto no YouTube"
                description="Roda no servidor do app. Precisa que ele alcance o youtube.com."
              />
            </div>
            {settings.searchProvider === "google" && (
              <div className="grid gap-2 rounded-xl border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">ID do mecanismo de pesquisa (cx)</span>
                  <a
                    href={CREATE_ENGINE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Criar um mecanismo <ExternalLink className="size-3" />
                  </a>
                </div>
                <GoogleCxForm />
                <p className="text-xs text-muted-foreground">
                  Crie um mecanismo gratuito restrito a <code>youtube.com</code> e cole o ID aqui. Não é chave de API. O passo
                  a passo completo aparece na tela Buscar.
                </p>
              </div>
            )}
          </Section>

          <Separator />

          <Section title="Seus dados" description="Faça backup de vez em quando: limpar os dados do navegador apaga tudo.">
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: "vídeos", value: videoCount },
                { label: "playlists", value: playlistCount },
                { label: "favoritos", value: favoriteCount },
                { label: "em uso", value: open ? storageUsage() : "" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border bg-muted/30 px-2 py-3">
                  <p className="text-lg font-semibold tabular-nums">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {pendingBackup ? (
              <div className="grid gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
                <p className="text-sm">
                  Backup com <strong>{pluralize(pendingBackup.videos.length, "vídeo", "vídeos")}</strong> e{" "}
                  <strong>{pluralize(pendingBackup.playlists?.length ?? 0, "playlist", "playlists")}</strong>. Como
                  importar?
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="brand" onClick={() => applyBackup("merge")}>
                    Juntar com o que já tenho
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => applyBackup("replace")}>
                    Substituir tudo
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPendingBackup(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={downloadBackup}>
                  <Download /> Exportar backup
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload /> Importar backup
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive sm:ml-auto">
                      <Trash2 /> Apagar tudo
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Apagar todos os dados?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso remove vídeos, favoritos, playlists e a fila deste navegador. Não dá para desfazer — se
                        quiser, exporte um backup antes.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => {
                          usePlayer.getState().stop();
                          useLibrary.getState().clearAll();
                          toast.success("Tudo apagado. Começando do zero!");
                        }}
                      >
                        Apagar tudo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
