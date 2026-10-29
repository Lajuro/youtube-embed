/* eslint-disable @next/next/no-img-element -- miniaturas vêm direto do i.ytimg.com */
"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";

import { gradientFor } from "@/components/video/video-thumbnail";
import { cn } from "@/lib/utils";
import { thumbnailUrl } from "@/lib/youtube";
import { courseLessons, useLibrary, type Course } from "@/stores/library-store";

/** Capa do curso: a miniatura da primeira aula sobre um gradiente com a "marca" do curso. */
export function CourseCover({ course, className, children }: { course: Course; className?: string; children?: React.ReactNode }) {
  const firstVideo = courseLessons(course)[0]?.videoId;
  const fallback = useLibrary((s) => (firstVideo ? s.videos[firstVideo]?.thumbnail : undefined));
  const [attempt, setAttempt] = useState(0);
  const src = firstVideo ? (attempt === 0 ? thumbnailUrl(firstVideo, "hqdefault") : attempt === 1 ? fallback : undefined) : undefined;

  return (
    <div
      className={cn("relative aspect-video overflow-hidden bg-muted", className)}
      style={{ backgroundImage: gradientFor(course.id) }}
    >
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
        <div className="absolute inset-0 grid place-items-center text-white/85">
          <GraduationCap className="size-1/4 max-h-16 max-w-16" />
        </div>
      )}
      {children}
    </div>
  );
}
