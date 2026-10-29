import * as React from "react";

import { cn } from "@/lib/utils";

/** Barra de progresso simples (0–100). */
function Progress({
  value = 0,
  className,
  indicatorClassName,
  ...props
}: React.ComponentProps<"div"> & { value?: number; indicatorClassName?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      data-slot="progress"
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/10", className)}
      {...props}
    >
      <div
        className={cn("h-full rounded-full bg-brand-gradient transition-[width] duration-500", indicatorClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export { Progress };
