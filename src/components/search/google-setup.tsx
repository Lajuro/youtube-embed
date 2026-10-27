"use client";

import { useState } from "react";
import { Check, ExternalLink, KeyRound, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { googleWebSearchUrl } from "@/lib/google-cse";
import { cn } from "@/lib/utils";
import { extractCx, useSettings } from "@/stores/ui-store";

export const CREATE_ENGINE_URL = "https://programmablesearchengine.google.com/controlpanel/create";

/** Campo para colar o ID do mecanismo de pesquisa do Google (cx). */
export function GoogleCxForm({ className, onSaved }: { className?: string; onSaved?: () => void }) {
  const saved = useSettings((s) => s.googleCx);
  const [value, setValue] = useState(saved);
  const parsed = extractCx(value);
  const valid = /^[\w:-]{8,}$/.test(parsed);

  return (
    <form
      className={cn("flex flex-col gap-2 sm:flex-row", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        const changed = saved && saved !== parsed;
        useSettings.getState().setGoogleCx(parsed);
        useSettings.getState().setSearchProvider("google");
        setValue(parsed);
        if (changed) {
          toast.success("ID atualizado", {
            description: "Recarregue a página para a busca usar o novo mecanismo.",
            action: { label: "Recarregar", onClick: () => window.location.reload() },
          });
        } else {
          toast.success("Busca pelo Google configurada!");
        }
        onSaved?.();
      }}
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Cole o ID (ex.: 0123456789abcdef0) ou o código <script>"
        aria-label="ID do mecanismo de pesquisa do Google"
        className="font-mono text-sm"
      />
      <Button type="submit" variant="brand" disabled={!valid || parsed === saved}>
        {parsed === saved && saved ? <Check /> : <KeyRound />}
        {parsed === saved && saved ? "Salvo" : "Salvar"}
      </Button>
    </form>
  );
}

/** Passo a passo para criar o mecanismo de pesquisa (uma vez só, de graça). */
export function GoogleSetupGuide({ query }: { query?: string }) {
  const steps = [
    <>
      Abra o{" "}
      <a href={CREATE_ENGINE_URL} target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">
        Programmable Search Engine do Google
      </a>{" "}
      (entre com qualquer conta Google).
    </>,
    <>
      Dê um nome (ex.: <em>Sintonia</em>) e, em <strong>“O que pesquisar?”</strong>, escolha{" "}
      <strong>“Pesquisar em sites ou páginas específicas”</strong> e adicione <code className="rounded bg-muted px-1">youtube.com</code>.
    </>,
    <>
      Clique em <strong>Criar</strong>. Na tela seguinte, copie o <strong>“ID do mecanismo de pesquisa”</strong> — ou o código{" "}
      <code className="rounded bg-muted px-1">&lt;script&gt;</code> inteiro, tanto faz.
    </>,
    <>Cole aqui embaixo e salve. Pronto: as buscas passam a aparecer dentro do app.</>,
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card/60 p-5 backdrop-blur md:p-6">
      <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
      <div className="relative">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-lg">
            <Search className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold">Ative a busca pelo Google (uma vez só)</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A busca roda no seu navegador, pelo Google — o mesmo caminho que já funciona na sua rede. É gratuito e{" "}
              <strong className="text-foreground">não é uma chave de API</strong>: é só o ID de um “mecanismo de pesquisa”
              restrito ao youtube.com.
            </p>
          </div>
        </div>

        <ol className="mt-5 grid gap-3">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <span className="pt-0.5 text-muted-foreground [&_strong]:text-foreground">{step}</span>
            </li>
          ))}
        </ol>

        <GoogleCxForm className="mt-5" />

        <div className="mt-5 flex flex-col gap-2 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Sem configurar: busque no Google, copie o link do vídeo e cole aqui com <Kbd>Ctrl</Kbd>+<Kbd>V</Kbd>.
          </span>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <a href={googleWebSearchUrl(query || "lofi")} target="_blank" rel="noreferrer">
              <ExternalLink /> Abrir no Google
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
