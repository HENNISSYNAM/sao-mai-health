import { useMemo } from "react";
import type { EdgeVitals } from "@/services/ruview";

interface Props {
  history: EdgeVitals[];
  field: "breathing_rate_bpm" | "heartrate_bpm" | "motion";
  className?: string;
  stroke?: string;
}

/**
 * Compact sparkline of a CSI-derived vital. SVG-only (no chart lib) so it stays
 * cheap enough to render one per node at 1 Hz.
 */
export function VitalsTrace({ history, field, className, stroke = "currentColor" }: Props) {
  const path = useMemo(() => {
    const pts = history
      .map((h) => (field === "motion" ? h.motion * 100 : h[field]))
      .filter((v): v is number => v != null);
    if (pts.length < 2) return null;
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = max - min || 1;
    const W = 100, H = 28;
    return pts
      .map((v, i) => {
        const x = (i / (pts.length - 1)) * W;
        const y = H - ((v - min) / span) * H;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [history, field]);

  if (!path) {
    return <div className={`h-7 flex items-center text-[10px] text-muted-foreground ${className ?? ""}`}>đang thu tín hiệu…</div>;
  }
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className={`h-7 w-full ${className ?? ""}`} aria-hidden>
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
