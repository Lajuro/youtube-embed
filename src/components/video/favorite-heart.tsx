"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Ícone de coração dos favoritos. Ao favoritar, ele "pulsa" e solta um anel —
 * só quando muda para favorito (não ao abrir a página com ele já marcado).
 */
export function FavoriteHeart({ active, className }: { active: boolean; className?: string }) {
  const [prev, setPrev] = useState(active);
  const [pops, setPops] = useState(0);
  // Ajuste de estado durante o render: detecta a transição sem precisar de effect.
  if (prev !== active) {
    setPrev(active);
    if (active) setPops((n) => n + 1);
  }

  return (
    <span className="relative inline-grid place-items-center">
      <Heart
        key={pops}
        className={cn(className, active && "fill-primary text-primary", pops > 0 && active && "animate-heart-pop")}
      />
      {pops > 0 && active && (
        <span
          key={`ring-${pops}`}
          aria-hidden
          className="pointer-events-none absolute inset-[-35%] animate-heart-burst rounded-full border-2 border-primary"
        />
      )}
    </span>
  );
}
