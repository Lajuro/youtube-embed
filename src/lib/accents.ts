/**
 * Cores de destaque do app. Os valores espelham as variáveis de globals.css
 * (`:root[data-accent=...]`) e servem para desenhar as amostras nas Configurações.
 */
export const ACCENTS = [
  { id: "blue", label: "Azul", swatch: "oklch(0.58 0.19 262)" },
  { id: "violet", label: "Violeta", swatch: "oklch(0.58 0.2 292)" },
  { id: "teal", label: "Azul-petróleo", swatch: "oklch(0.6 0.11 195)" },
  { id: "green", label: "Verde", swatch: "oklch(0.6 0.15 152)" },
  { id: "amber", label: "Âmbar", swatch: "oklch(0.64 0.15 58)" },
  { id: "rose", label: "Rosa", swatch: "oklch(0.6 0.19 12)" },
  { id: "graphite", label: "Grafite", swatch: "oklch(0.55 0.006 270)" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

export const DEFAULT_ACCENT: AccentId = "blue";

/** Valores salvos por versões antigas (ou inválidos) caem no padrão. */
export function resolveAccent(id: string | undefined) {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];
}

export function applyAccent(id: string | undefined) {
  document.documentElement.dataset.accent = resolveAccent(id).id;
}

/**
 * Roda antes da página aparecer (inline no <head>) para já pintar com a cor escolhida,
 * sem piscar a cor padrão enquanto o localStorage ainda não foi lido pelo React.
 */
export const ACCENT_BOOT_SCRIPT = `try{var s=JSON.parse(localStorage.getItem("sintonia:settings")||"{}").state;if(s&&s.accent)document.documentElement.dataset.accent=s.accent}catch(e){}`;
