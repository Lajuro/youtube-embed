"use client";

import { useState } from "react";
import { Check, ExternalLink, KeyRound } from "lucide-react";
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
      <Button type="submit" disabled={!valid || parsed === saved}>
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
    <div className="max-w-3xl rounded-xl border bg-card p-5 md:p-6">
      <div>
        <h3 className="text-[15px] font-semibold">Ative a busca pelo Google</h3>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          Configuração única. A busca roda no seu navegador, pelo Google — o mesmo caminho que já funciona na sua rede. É
          gratuito e <strong className="font-medium text-foreground">não é uma chave de API</strong>: é só o ID de um
          “mecanismo de pesquisa” restrito ao youtube.com.
        </p>

        <ol className="mt-5 grid gap-3">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="grid size-5 shrink-0 place-items-center rounded-full border text-[11px] font-medium text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              <span className="text-pretty text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">{step}</span>
            </li>
          ))}
        </ol>

        <GoogleCxForm className="mt-5" />

        <div className="mt-5 flex flex-col gap-2 border-t pt-4 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Sem configurar: busque no Google, copie o link do vídeo e cole aqui com <Kbd>Ctrl</Kbd>+<Kbd>V</Kbd>.
          </span>
          <Button asChild variant="outline" size="sm">
            <a href={googleWebSearchUrl(query || "lofi")} target="_blank" rel="noreferrer">
              <ExternalLink /> Abrir no Google
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
