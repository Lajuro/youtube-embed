"use client";

import { GraduationCap, ListVideo, NotebookPen, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/courses/course-card";
import { HydrationGate } from "@/components/hydration-gate";
import { PageIntro } from "@/components/page-header";
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
      <PageIntro
        title="Cursos"
        description={
          courses.length
            ? pluralize(courses.length, "curso", "cursos")
            : "Transforme vídeos e playlists do YouTube em cursos com seções, progresso e anotações."
        }
        actions={
          <Button onClick={() => openCourseDialog()}>
            <Plus /> Novo curso
          </Button>
        }
      />

      <div className="px-4 md:px-8">
        {courses.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 md:p-8">
            <h2 className="text-[15px] font-semibold">Como funciona</h2>
            <dl className="stagger mt-5 grid gap-6 md:grid-cols-3">
              {[
                { icon: ListVideo, title: "Importe uma playlist", text: "Cole o link de uma playlist do YouTube e todas as aulas entram de uma vez." },
                { icon: GraduationCap, title: "Organize em seções", text: "Divida as aulas em seções, renomeie e reordene arrastando." },
                { icon: NotebookPen, title: "Acompanhe o progresso", text: "Retome de onde parou, ajuste a velocidade e faça anotações com o tempo do vídeo." },
              ].map((step) => (
                <div key={step.title}>
                  <dt className="flex items-center gap-2 text-sm font-medium">
                    <step.icon className="size-4 text-muted-foreground" /> {step.title}
                  </dt>
                  <dd className="mt-1.5 text-[13px] text-pretty text-muted-foreground">{step.text}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-7 flex flex-wrap gap-2">
              <Button onClick={() => openCourseDialog()}>
                <Plus /> Criar primeiro curso
              </Button>
            </div>
          </div>
        ) : (
          <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {sorted.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
