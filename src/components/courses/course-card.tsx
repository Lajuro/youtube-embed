"use client";

import Link from "next/link";
import { Check, Play } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { CourseCover } from "@/components/courses/course-cover";
import { continueCourse, courseStats } from "@/lib/courses";
import { cn, formatTotalDuration, pluralize } from "@/lib/utils";
import { useLibrary, type Course } from "@/stores/library-store";
import { usePlayer } from "@/stores/player-store";

export function CourseCard({ course, className }: { course: Course; className?: string }) {
  const progress = useLibrary((s) => s.progress);
  const videos = useLibrary((s) => s.videos);
  const playingThis = usePlayer((s) => s.source?.type === "course" && s.source.id === course.id);
  const stats = courseStats(course, progress, videos);
  const started = stats.completed > 0 || Boolean(course.lastLessonId);
  const done = stats.total > 0 && stats.completed === stats.total;

  return (
    <div
      className={cn(
        "group/course relative flex flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-foreground/20",
        className
      )}
    >
      <Link href={`/courses/${course.id}`} className="absolute inset-0 z-0" aria-label={course.title} />
      <CourseCover course={course} className="pointer-events-none border-b">
        {done && (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">
            <Check className="size-3" strokeWidth={3} /> Concluído
          </span>
        )}
        {stats.total > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              continueCourse(course.id);
            }}
            className={cn(
              "pointer-events-auto absolute right-2.5 bottom-2.5 z-10 inline-flex h-8 translate-y-1 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground opacity-0 shadow-lg shadow-black/30 transition-all duration-200 group-hover/course:translate-y-0 group-hover/course:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100",
              playingThis && "translate-y-0 opacity-100"
            )}
          >
            <Play className="size-3.5 fill-current" />
            {started ? "Continuar" : "Começar"}
          </button>
        )}
      </CourseCover>
      <div className="pointer-events-none relative flex flex-1 flex-col p-4">
        <h3 className={cn("line-clamp-2 text-[15px] leading-snug font-semibold", playingThis && "text-primary")}>{course.title}</h3>
        <p className="mt-1 truncate text-[13px] text-muted-foreground">
          {[course.author, pluralize(stats.total, "aula", "aulas"), stats.duration > 0 ? formatTotalDuration(stats.duration) : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="mt-auto flex items-center gap-3 pt-4">
          <Progress value={stats.percent} className="flex-1" />
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {stats.total === 0 ? "Sem aulas" : done ? "Concluído" : `${stats.percent}%`}
          </span>
        </div>
      </div>
    </div>
  );
}
