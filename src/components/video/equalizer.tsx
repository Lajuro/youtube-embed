import { cn } from "@/lib/utils";

/** Barrinhas animadas indicando o que está tocando. */
export function Equalizer({ paused = false, className }: { paused?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex h-3.5 items-end gap-[2px]", className)} aria-label="Tocando">
      {[0, 0.25, 0.5, 0.15].map((delay, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] origin-bottom rounded-full bg-primary",
            paused ? "h-1" : "h-full animate-equalizer"
          )}
          style={{ animationDelay: `${delay}s`, animationDuration: `${0.8 + i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
