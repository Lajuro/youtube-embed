"use client";

import { GraduationCap, Link2, ListVideo, NotebookPen, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/courses/course-card";
import { HydrationGate } from "@/components/hydration-gate";
import { courseStats } from "@/lib/courses";
import { pluralize } from "@/lib/utils";
import { useLibrary, type Course } from "@/stores/library-store";
import { useUi } from "@/stores/ui-store";

export function CoursesView() {
  return (
    <HydrationGate>
      <Courses />
    </HydrationGate>
  );
}

/** Em andamento primeiro (pelo último acesso), depois os não começados, e os concluídos no fim. */
export function sortCourses(courses: Course[], progress: ReturnType<typeof useLibrary.getState>["progress"], videos: ReturnType<typeof useLibrary.getState>["videos"]) {
  const rank = (c: Course) => {
    const s = courseStats(c, progress, videos);
    if (s.total > 0 && s.completed === s.total) return 2;
    return c.lastOpenedAt ? 0 : 1;
  };
  return [...courses].sort((a, b) => rank(a) - rank(b) || (b.lastOpenedAt ?? b.createdAt) - (a.lastOpenedAt ?? a.createdAt));
}

function Courses() {
  const courses = useLibrary((s) => s.courses);
  const progress = useLibrary((s) => s.progress);
  const videos = useLibrary((s) => s.videos);
  const openCourseDialog = useUi((s) => s.openCourseDialog);
  const sorted = sortCourses(courses, progress, videos);

  return (
    <div className="pb-16">
      <section className="relative -mt-14 overflow-hidden px-4 pt-18 pb-8 md:px-8 md:pt-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 -left-20 size-[26rem] rounded-full bg-[var(--brand-from)] opacity-20 blur-[100px]" />
          <div className="absolute -top-20 right-10 size-[20rem] rounded-full bg-[var(--brand-to)] opacity-15 blur-[100px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              <GraduationCap className="size-4 text-primary" /> Aprender
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-5xl">
              Seus <span className="text-gradient">cursos</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {courses.length
                ? `${pluralize(courses.length, "curso", "cursos")}. Organize vídeos do YouTube em seções e aulas, com progresso e anotações.`
                : "Transforme vídeos e playlists do YouTube em cursos com seções, progresso e anotações — estilo Udemy."}
            </p>
          </div>
          <Button variant="brand" className="rounded-full" onClick={() => openCourseDialog()}>
            <Plus /> Novo curso
          </Button>
        </div>
      </section>

      <div className="px-4 md:px-8">
        {courses.length === 0 ? (
          <div className="grid gap-4">
            <div className="stagger grid gap-3 md:grid-cols-3">
              {[
                { icon: ListVideo, title: "Importe uma playlist", text: "Cole o link de uma playlist do YouTube e todas as aulas entram de uma vez." },
                { icon: GraduationCap, title: "Organize em seções", text: "Divida as aulas em seções, renomeie e reordene arrastando." },
                { icon: NotebookPen, title: "Estude de verdade", text: "Progresso por aula, retomar de onde parou, velocidade e anotações com tempo." },
              ].map((step, i) => (
                <div key={step.title} className="relative overflow-hidden rounded-2xl border bg-card/60 p-5">
                  <span className="absolute top-3 right-4 text-5xl font-black text-foreground/[0.05]">{i + 1}</span>
                  <div className="mb-3 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <step.icon className="size-5" />
                  </div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-start gap-3 rounded-2xl border bg-gradient-to-br from-primary/10 via-transparent to-transparent p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold">Crie seu primeiro curso</h3>
                <p className="mt-1 text-sm text-muted-foreground">Comece por uma playlist, por links soltos ou em branco.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="brand" className="rounded-full" onClick={() => openCourseDialog()}>
                  <Plus /> Novo curso
                </Button>
                <Button variant="outline" className="rounded-full" onClick={() => openCourseDialog()}>
                  <Link2 /> A partir de links
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {sorted.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
            <button
              type="button"
              onClick={() => openCourseDialog()}
              className="group/new flex min-h-64 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
            >
              <span className="grid size-12 place-items-center rounded-full bg-muted transition-transform group-hover/new:scale-110">
                <Plus className="size-6" />
              </span>
              <span className="text-sm font-medium">Novo curso</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
