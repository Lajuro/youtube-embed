/* eslint-disable @next/next/no-img-element -- miniaturas vêm direto do i.ytimg.com, sem otimização no servidor */
"use client";

import { useState } from "react";
import { Music2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { thumbnailUrl, type ThumbnailQuality } from "@/lib/youtube";

/** Gera um gradiente estável a partir do ID (usado quando a imagem não carrega). */
export function gradientFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(135deg, oklch(0.55 0.17 ${hue}), oklch(0.35 0.14 ${(hue + 60) % 360}))`;
}

interface VideoThumbnailProps {
  id: string;
  alt?: string;
  quality?: ThumbnailQuality;
  className?: string;
  imgClassName?: string;
  children?: React.ReactNode;
}

export function VideoThumbnail({
  id,
  alt = "",
  quality = "mqdefault",
  className,
  imgClassName,
  children,
}: VideoThumbnailProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={cn("relative overflow-hidden bg-muted", className)}
      style={failed ? { backgroundImage: gradientFor(id) } : undefined}
    >
      {failed ? (
        <div className="absolute inset-0 grid place-items-center text-white/80">
          <Music2 className="size-1/3 max-h-10 max-w-10" />
        </div>
      ) : (
        <img
          src={thumbnailUrl(id, quality)}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
          className={cn("size-full object-cover", imgClassName)}
        />
      )}
      {children}
    </div>
  );
}
