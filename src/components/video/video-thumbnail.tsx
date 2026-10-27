/* eslint-disable @next/next/no-img-element -- miniaturas vêm direto do i.ytimg.com, sem otimização no servidor */
"use client";

import { useState } from "react";
import { Music2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { thumbnailUrl, type ThumbnailQuality } from "@/lib/youtube";
import { useLibrary } from "@/stores/library-store";

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
  /** Imagem alternativa se a do i.ytimg.com não carregar (ex.: miniatura servida pelo Google). */
  fallbackSrc?: string;
  children?: React.ReactNode;
}

export function VideoThumbnail({
  id,
  alt = "",
  quality = "mqdefault",
  className,
  imgClassName,
  fallbackSrc,
  children,
}: VideoThumbnailProps) {
  const stored = useLibrary((s) => s.videos[id]?.thumbnail);
  const alternative = fallbackSrc ?? stored;
  // 0 = i.ytimg.com, 1 = imagem alternativa, 2 = gradiente
  const [attempt, setAttempt] = useState(0);
  const src = attempt === 0 ? thumbnailUrl(id, quality) : alternative;
  const failed = attempt >= 2 || !src;

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
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setAttempt((a) => (a === 0 && alternative ? 1 : 2))}
          className={cn("size-full object-cover", imgClassName)}
        />
      )}
      {children}
    </div>
  );
}
