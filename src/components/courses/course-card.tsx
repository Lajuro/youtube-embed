"use client";

import Link from "next/link";
import { GraduationCap, Play, Trophy } from "lucide-react";

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
    <div className={cn("group/course relative flex flex-col overflow-hidden rounded-2xl border bg-card/60 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl", className)}>
      <Link href={`/courses/${course.id}`} className="absolute inset-0 z-0" aria-label={course.title} />
      <CourseCover course={course} className="pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
          <GraduationCap className="size-3.5" /> Curso
        </span>
        {done && (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white">
            <Trophy className="size-3.5" /> Concluído
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
              "pointer-events-auto absolute right-3 bottom-3 z-10 inline-flex translate-y-1 cursor-pointer items-center gap-1.5 rounded-full bg-brand-gradient px-3.5 py-2 text-sm font-semibold text-white opacity-0 shadow-xl transition-all group-hover/course:translate-y-0 group-hover/course:opacity-100",
              playingThis && "translate-y-0 opacity-100"
            )}
          >
            <Play className="size-4 fill-current" />
            {started ? "Continuar" : "Começar"}
          </button>
        )}
      </CourseCover>
      <div className="pointer-events-none relative flex flex-1 flex-col gap-1 p-4">
        <h3 className={cn("line-clamp-2 font-semibold leading-snug", playingThis && "text-primary")}>{course.title}</h3>
        {course.author && <p className="truncate text-sm text-muted-foreground">{course.author}</p>}
        <p className="text-xs text-muted-foreground">
          {pluralize(course.sections.length, "seção", "seções")} · {pluralize(stats.total, "aula", "aulas")}
          {stats.duration > 0 && ` · ${formatTotalDuration(stats.duration)}`}
        </p>
        <div className="mt-auto pt-3">
          <Progress value={stats.percent} />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {stats.total === 0 ? "Sem aulas ainda" : done ? "Você concluiu este curso 🎉" : `${stats.percent}% concluído`}
          </p>
        </div>
      </div>
    </div>
  );
}
