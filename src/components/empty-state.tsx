import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed px-6 py-16 text-center",
        className
      )}
    >
      <div className="pointer-events-none absolute top-0 left-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
      <div className="relative mb-4 grid size-14 place-items-center rounded-2xl border bg-card shadow-sm">
        <Icon className="size-6 text-primary" />
      </div>
      <h3 className="relative text-lg font-semibold">{title}</h3>
      {description && <p className="relative mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {children && <div className="relative mt-6 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
