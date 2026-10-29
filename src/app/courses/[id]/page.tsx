import { Suspense, use } from "react";
import type { Metadata } from "next";

import { HydrationGate, PageSkeleton } from "@/components/hydration-gate";
import { CourseClassroom } from "@/components/courses/course-classroom";

export const metadata: Metadata = { title: "Curso · Sintonia" };

/** Os cursos vivem no localStorage: o ID só é conhecido no navegador (por isso o Suspense). */
export default function CoursePage({ params }: PageProps<"/courses/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Classroom params={params} />
    </Suspense>
  );
}

function Classroom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <HydrationGate>
      <CourseClassroom courseId={id} />
    </HydrationGate>
  );
}
