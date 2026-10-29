"use client";

import { useState } from "react";
import { CirclePlay, TriangleAlert } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Equalizer } from "@/components/video/equalizer";
import { lessonTitle, sectionStats, toggleLessonCompleted } from "@/lib/courses";
import { cn, formatTime, formatTotalDuration } from "@/lib/utils";
import { useLibrary, type Course } from "@/stores/library-store";

interface CourseCurriculumProps {
  course: Course;
  /** Aula em destaque (a que está tocando, ou a próxima a assistir). */
  activeLessonId?: string;
  /** Se a aula em destaque está tocando agora. */
  playing?: boolean;
  onPlay: (lessonId: string) => void;
  className?: string;
}

export function CourseCurriculum({ course, activeLessonId, playing, onPlay, className }: CourseCurriculumProps) {
  const videos = useLibrary((s) => s.videos);
  const progress = useLibrary((s) => s.progress);

  const activeSectionId = course.sections.find((s) => s.lessons.some((l) => l.id === activeLessonId))?.id;
  const [open, setOpen] = useState<string[]>(() => [activeSectionId ?? course.sections[0]?.id].filter(Boolean) as string[]);
  // Quando a aula atual muda de seção, abre a nova seção automaticamente.
  const [lastActive, setLastActive] = useState(activeSectionId);
  if (activeSectionId !== lastActive) {
    setLastActive(activeSectionId);
    if (activeSectionId && !open.includes(activeSectionId)) setOpen([...open, activeSectionId]);
  }

  // Numeração contínua das aulas, como na Udemy.
  let counter = 0;

  return (
    <Accordion type="multiple" value={open} onValueChange={setOpen} className={className}>
      {course.sections.map((section, sectionIndex) => {
        const stats = sectionStats(section, progress, videos);
        return (
          <AccordionItem key={section.id} value={section.id}>
            <AccordionTrigger className="rounded-none bg-muted/40 px-4 py-3 hover:no-underline hover:bg-muted/70">
              <span className="min-w-0">
                <span className="block font-semibold">
                  Seção {sectionIndex + 1}: {section.title}
                </span>
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  {stats.completed}/{stats.total}
                  {stats.duration > 0 && ` | ${formatTotalDuration(stats.duration)}`}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-0">
              {section.lessons.length === 0 && (
                <p className="px-4 py-3 text-xs text-muted-foreground">Nenhuma aula nesta seção.</p>
              )}
              <ul>
                {section.lessons.map((lesson) => {
                  counter++;
                  const video = videos[lesson.videoId];
                  const p = progress[lesson.id];
                  const active = lesson.id === activeLessonId;
                  const duration = video?.duration ?? p?.duration;
                  const partial = !p?.completed && p?.position && duration ? (p.position / duration) * 100 : 0;
                  return (
                    <li key={lesson.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onPlay(lesson.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") onPlay(lesson.id);
                        }}
                        className={cn(
                          "group/lesson flex cursor-pointer gap-3 px-4 py-2.5 transition-colors outline-none hover:bg-accent/50 focus-visible:bg-accent/60",
                          active && "bg-primary/10 hover:bg-primary/15"
                        )}
                      >
                        <Checkbox
                          checked={Boolean(p?.completed)}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => toggleLessonCompleted(lesson.id)}
                          aria-label={p?.completed ? "Marcar como não concluída" : "Marcar como concluída"}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "text-sm leading-snug",
                              active && "font-medium text-primary",
                              video?.titleSource === "pending" && !lesson.title && "text-muted-foreground italic"
                            )}
                          >
                            {counter}. {lessonTitle(lesson, videos)}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            {video?.unavailable ? (
                              <>
                                <TriangleAlert className="size-3.5 text-amber-500" /> Bloqueado fora do YouTube
                              </>
                            ) : (
                              <>
                                <CirclePlay className="size-3.5" />
                                {duration ? formatTime(duration) : "—"}
                                {partial > 0 && p && <span>· parou em {formatTime(p.position)}</span>}
                              </>
                            )}
                          </p>
                          {partial > 0 && (
                            <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-foreground/10">
                              <div className="h-full bg-primary" style={{ width: `${partial}%` }} />
                            </div>
                          )}
                        </div>
                        {active && playing && <Equalizer className="mt-1 shrink-0" />}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
