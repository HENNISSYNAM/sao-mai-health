import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { EdgeVitals } from "@/services/ruview";
import type { VitalEstimate } from "@/services/vitalsQuality";

/**
 * Bedside-monitor style panel.
 *
 * Honesty note on what is drawn: the sensing engine reports *rates*, not raw
 * chest-displacement waveforms. The respiration and pulse traces here are
 * therefore rhythms reconstructed from the measured rate — they show cadence
 * truthfully but are not raw sensor output, and the UI says so. The motion band
 * underneath IS the real per-frame signal from the mesh.
 *
 * Rendered on canvas with a single rAF loop so a full ward of tiles stays cheap.
 */

interface Props {
  label: string;
  breathing: VitalEstimate;
  heart: VitalEstimate;
  history: EdgeVitals[];
  heartZ?: number | null;
  breathingZ?: number | null;
  className?: string;
}

const COL = {
  breath: "#38bdf8",
  heart: "#fb7185",
  motion: "#a78bfa",
  grid: "rgba(148,163,184,0.14)",
};

export function VitalsMonitor({
  label, breathing, heart, history, heartZ, breathingZ, className,
}: Props) {
  const { t } = useTranslation();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef<number | null>(null);
  const tRef = useRef(0);
  // Keep latest props in a ref so the draw loop never needs re-subscribing.
  const data = useRef({ breathing, heart, history });
  data.current = { breathing, heart, history };

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== w * dpr || cv.height !== h * dpr) {
        cv.width = w * dpr; cv.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // grid
      ctx.strokeStyle = COL.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += 24) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = 0; y < h; y += 24) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();

      const t = (tRef.current += 1 / 60);
      const { breathing: br, heart: hr, history: hist } = data.current;
      const rowH = h / 3;

      // ── respiration: asymmetric wave (inhale faster than exhale) ──
      const drawWave = (
        row: number, colour: string, rateBpm: number | null, shape: (p: number) => number,
      ) => {
        const yMid = rowH * row + rowH / 2;
        if (rateBpm == null) {
          ctx.strokeStyle = "rgba(148,163,184,0.35)";
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(0, yMid); ctx.lineTo(w, yMid); ctx.stroke();
          return;
        }
        const cyclesPerSec = rateBpm / 60;
        const pxPerSec = 60;
        ctx.strokeStyle = colour;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let x = 0; x <= w; x++) {
          const timeAt = t - (w - x) / pxPerSec;      // scrolls right→left
          const phase = ((timeAt * cyclesPerSec) % 1 + 1) % 1;
          const y = yMid - shape(phase) * (rowH * 0.34);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        // leading dot
        const phaseNow = ((t * cyclesPerSec) % 1 + 1) % 1;
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.arc(w - 1, yMid - shape(phaseNow) * (rowH * 0.34), 2.5, 0, Math.PI * 2);
        ctx.fill();
      };

      // Breathing: rise ~40% of cycle, fall ~60% — matches real inhale/exhale ratio.
      drawWave(0, COL.breath, br.value, (p) =>
        p < 0.4 ? Math.sin((p / 0.4) * Math.PI / 2) : Math.cos(((p - 0.4) / 0.6) * Math.PI / 2));

      // Pulse: sharp systolic upstroke + dicrotic notch.
      drawWave(1, COL.heart, hr.value, (p) => {
        if (p < 0.10) return Math.sin((p / 0.10) * Math.PI / 2);
        if (p < 0.30) return Math.cos(((p - 0.10) / 0.20) * Math.PI / 2) * 0.85;
        if (p < 0.38) return 0.22 * Math.sin(((p - 0.30) / 0.08) * Math.PI);
        return 0;
      });

      // ── motion: the genuine per-frame signal ──
      {
        const yMid = rowH * 2 + rowH / 2;
        const pts = hist.slice(-90).map((v) => v.motion);
        ctx.strokeStyle = COL.motion;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        if (pts.length > 1) {
          pts.forEach((m, i) => {
            const x = (i / (pts.length - 1)) * w;
            const y = yMid + rowH * 0.34 - Math.min(1, m * 2.2) * (rowH * 0.62);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          });
        } else { ctx.moveTo(0, yMid); ctx.lineTo(w, yMid); }
        ctx.stroke();
      }

      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);

  const Reading = ({
    v, unit, colour, z, name,
  }: { v: number | null; unit: string; colour: string; z?: number | null; name: string }) => {
    const abnormal = z != null && Math.abs(z) >= 3;
    return (
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{name}</div>
        <div className="flex items-baseline gap-1">
          <span
            className="text-3xl font-bold tabular-nums leading-none"
            style={{ color: abnormal ? "#f43f5e" : colour }}
          >
            {v != null ? v.toFixed(0) : "--"}
          </span>
          <span className="text-[10px] text-muted-foreground">{unit}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`rounded-xl border bg-slate-950 text-slate-100 overflow-hidden ${className ?? ""}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <span className="text-xs font-medium tracking-wide">{label}</span>
        <span className="text-[10px] text-slate-400 tabular-nums">
          {breathing.value != null || heart.value != null
            ? t("sensing.confidence", { pct: (Math.max(breathing.confidence, heart.confidence) * 100).toFixed(0) })
            : t("sensing.vitals.unavailable")}
        </span>
      </div>

      <canvas ref={canvas} className="w-full h-32 block" />

      <div className="flex gap-3 px-3 py-2 border-t border-slate-800">
        <Reading name={t("sensing.vitals.breathing")} v={breathing.value} unit="bpm" colour={COL.breath} z={breathingZ} />
        <Reading name={t("sensing.vitals.heartRate")} v={heart.value} unit="bpm" colour={COL.heart} z={heartZ} />
        <Reading
          name={t("sensing.vitals.motion")} unit="%" colour={COL.motion}
          v={history.length ? history[history.length - 1].motion * 100 : null}
        />
      </div>

      <p className="px-3 pb-2 text-[9px] leading-tight text-slate-500">
        {t("sensing.vitals.traceNote")}
      </p>
    </div>
  );
}
