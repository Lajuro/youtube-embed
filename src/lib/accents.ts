/**
 * Cores de destaque do app. Os valores espelham as variáveis de globals.css
 * (`:root[data-accent=...]`) e servem para desenhar as amostras nas Configurações.
 */
export const ACCENTS = [
  { id: "violet", label: "Violeta", h: 292, c: 0.24, h2: 352, c2: 0.22 },
  { id: "ocean", label: "Oceano", h: 255, c: 0.19, h2: 205, c2: 0.14 },
  { id: "aqua", label: "Água-marinha", h: 192, c: 0.12, h2: 165, c2: 0.14 },
  { id: "forest", label: "Floresta", h: 150, c: 0.16, h2: 118, c2: 0.17 },
  { id: "sunset", label: "Pôr do sol", h: 45, c: 0.19, h2: 15, c2: 0.2 },
  { id: "rose", label: "Rosa", h: 0, c: 0.21, h2: 320, c2: 0.2 },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

export function accentGradient(accent: (typeof ACCENTS)[number]) {
  return `linear-gradient(135deg, oklch(0.64 ${accent.c} ${accent.h}), oklch(0.72 ${accent.c2} ${accent.h2}))`;
}

export function applyAccent(id: AccentId) {
  document.documentElement.dataset.accent = id;
}

/**
 * Roda antes da página aparecer (inline no <head>) para já pintar com a cor escolhida,
 * sem piscar o violeta padrão enquanto o localStorage ainda não foi lido pelo React.
 */
export const ACCENT_BOOT_SCRIPT = `try{var s=JSON.parse(localStorage.getItem("sintonia:settings")||"{}").state;if(s&&s.accent)document.documentElement.dataset.accent=s.accent}catch(e){}`;
