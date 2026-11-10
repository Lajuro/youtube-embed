/* eslint-disable @next/next/no-img-element -- miniaturas vêm direto do i.ytimg.com, sem otimização no servidor */
"use client";

import { useState } from "react";
import { Music2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { thumbnailUrl, type ThumbnailQuality } from "@/lib/youtube";
import { useLibrary } from "@/stores/library-store";

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
  // 0 = i.ytimg.com, 1 = imagem alternativa, 2 = sem imagem (ícone neutro)
  const [attempt, setAttempt] = useState(0);
  const src = attempt === 0 ? thumbnailUrl(id, quality) : alternative;
  const failed = attempt >= 2 || !src;

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {failed ? (
        <div className="absolute inset-0 grid place-items-center text-muted-foreground/60">
          <Music2 className="size-1/3 max-h-8 max-w-8" />
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
