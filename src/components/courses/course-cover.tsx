/* eslint-disable @next/next/no-img-element -- miniaturas vêm direto do i.ytimg.com */
"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";

import { cn } from "@/lib/utils";
import { thumbnailUrl } from "@/lib/youtube";
import { courseLessons, useLibrary, type Course } from "@/stores/library-store";

/** Capa do curso: a miniatura da primeira aula (ou um ícone neutro, se não houver). */
export function CourseCover({ course, className, children }: { course: Course; className?: string; children?: React.ReactNode }) {
  const firstVideo = courseLessons(course)[0]?.videoId;
  const fallback = useLibrary((s) => (firstVideo ? s.videos[firstVideo]?.thumbnail : undefined));
  const [attempt, setAttempt] = useState(0);
  const src = firstVideo ? (attempt === 0 ? thumbnailUrl(firstVideo, "hqdefault") : attempt === 1 ? fallback : undefined) : undefined;

  return (
    <div className={cn("relative aspect-video overflow-hidden bg-muted", className)}>
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          draggable={false}
          onError={() => setAttempt((a) => (a === 0 && fallback ? 1 : 2))}
          className="size-full scale-[1.34] object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-muted-foreground/60">
          <GraduationCap className="size-1/4 max-h-12 max-w-12" />
        </div>
      )}
      {children}
    </div>
  );
}
