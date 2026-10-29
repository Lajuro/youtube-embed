"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useUi } from "@/stores/ui-store";

export const SHORTCUTS: { group: string; items: { keys: string[]; label: string }[] }[] = [
  {
    group: "Reprodução",
    items: [
      { keys: ["Espaço"], label: "Tocar / pausar" },
      { keys: ["N"], label: "Próximo" },
      { keys: ["P"], label: "Anterior" },
      { keys: ["←"], label: "Voltar 10 segundos" },
      { keys: ["→"], label: "Avançar 10 segundos" },
      { keys: ["M"], label: "Silenciar" },
      { keys: ["S"], label: "Aleatório" },
      { keys: ["R"], label: "Repetir (tudo / um / desligado)" },
    ],
  },
  {
    group: "Navegação",
    items: [
      { keys: ["Ctrl", "K"], label: "Buscar / paleta de comandos" },
      { keys: ["A"], label: "Adicionar vídeo" },
      { keys: ["E"], label: "Abrir / fechar “Tocando agora”" },
      { keys: ["T"], label: "Modo cinema (vídeo maior)" },
      { keys: ["Ctrl", "B"], label: "Recolher / expandir o menu" },
      { keys: ["Q"], label: "Fila de reprodução" },
      { keys: ["V"], label: "Mostrar / ocultar mini player" },
      { keys: ["F"], label: "Favoritar o que está tocando" },
      { keys: ["?"], label: "Esta lista de atalhos" },
    ],
  },
];

export function ShortcutsDialog() {
  const open = useUi((s) => s.shortcutsOpen);
  const setOpen = useUi((s) => s.setShortcutsOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Atalhos de teclado</DialogTitle>
          <DialogDescription>
            Dica: cole (<Kbd>Ctrl</Kbd>+<Kbd>V</Kbd>) um link do YouTube em qualquer lugar da página para adicioná-lo.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-2">
          {SHORTCUTS.map((group) => (
            <div key={group.group}>
              <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{group.group}</h3>
              <ul className="grid gap-1">
                {group.items.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-4 rounded-md px-2 py-1.5 text-sm hover:bg-accent/50">
                    <span>{item.label}</span>
                    <KbdGroup>
                      {item.keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </KbdGroup>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
