import { Suspense, use } from "react";
import type { Metadata } from "next";

import { HydrationGate, PageSkeleton } from "@/components/hydration-gate";
import { CourseEditor } from "@/components/courses/course-editor";

export const metadata: Metadata = { title: "Editar curso · Sintonia" };

export default function EditCoursePage({ params }: PageProps<"/courses/[id]/edit">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Editor params={params} />
    </Suspense>
  );
}

function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <HydrationGate>
      <CourseEditor courseId={id} />
    </HydrationGate>
  );
}
