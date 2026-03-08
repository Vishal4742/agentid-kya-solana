import { cn } from "@/lib/utils";

/** Animated pulse rectangle matching the editorial dark theme */
export function Sk({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(
        "bg-secondary/60 animate-pulse rounded-none",
        className
      )}
      style={style}
    />
  );
}

/** Full-width hairline-height row skeleton */
export function SkRow({ className }: { className?: string }) {
  return <Sk className={cn("h-px w-full", className)} />;
}
