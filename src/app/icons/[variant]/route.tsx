import { ImageResponse } from "next/og";

/**
 * Ícones PNG do app instalado (PWA), desenhados na hora a partir do mesmo desenho do
 * icon.svg — assim o projeto não precisa guardar imagens binárias.
 *  - /icons/192 e /icons/512: quadrado arredondado (uso geral);
 *  - /icons/maskable-512: fundo até a borda, para o sistema recortar no formato que quiser.
 */
const VARIANTS = {
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  "maskable-512": { size: 512, maskable: true },
} as const;

type Variant = keyof typeof VARIANTS;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

/** As cinco barrinhas do equalizador do logo (alturas em 64 avos, como no icon.svg). */
const BARS = [12.5, 28.5, 40.5, 24.5, 12.5];

export async function GET(_request: Request, { params }: RouteContext<"/icons/[variant]">) {
  const { variant } = await params;
  const config = VARIANTS[variant as Variant];
  if (!config) return new Response("Not found", { status: 404 });

  const { size, maskable } = config;
  // Ícones "maskable" precisam do desenho dentro da zona segura (80% central).
  const unit = (size / 64) * (maskable ? 0.72 : 1);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4.5 * unit,
          backgroundImage: "linear-gradient(135deg, #8b5cf6, #ec4899)",
          borderRadius: maskable ? 0 : size * 0.25,
        }}
      >
        {BARS.map((height, i) => (
          <div
            key={i}
            style={{ width: 4.5 * unit, height: height * unit, borderRadius: 4.5 * unit, background: "#ffffff" }}
          />
        ))}
      </div>
    ),
    { width: size, height: size }
  );
}
