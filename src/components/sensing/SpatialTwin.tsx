import { useMemo } from "react";
import type { NodeSensing } from "@/hooks/useRuViewSensing";

/**
 * Spatial digital twin — a live floor plan where each occupant is drawn at the
 * position the WiFi mesh infers, and glides as they move through real space.
 *
 * How position is derived without cameras: each ESP32 node covers a zone, and
 * `presence_score` is a proximity proxy (how strongly that node's CSI is being
 * perturbed). We place the occupant inside that zone and size a confidence halo
 * from the score — with a single node per room the honest resolution is
 * "somewhere in this room", so we show that rather than fake centimetre accuracy.
 *
 * Movement is driven by the measured motion amplitude and rendered with CSS
 * transitions plus declarative SMIL, so there is no per-frame React state (the
 * twin costs one render per sensing update, not 60/s).
 */

export interface RoomGeometry {
  node_id: string;
  label: string;
  /** Floor-plan rectangle on a 0..100 grid. */
  x: number; y: number; w: number; h: number;
  /** Optional furniture hint used to dress the room. */
  fixture?: "bed" | "sofa" | "toilet";
}

export const DEFAULT_FLOORPLAN: RoomGeometry[] = [
  { node_id: "node-a1", label: "Phòng ngủ",   x: 4,  y: 6,  w: 40, h: 46, fixture: "bed" },
  { node_id: "node-a2", label: "Phòng khách", x: 48, y: 6,  w: 48, h: 62, fixture: "sofa" },
  { node_id: "node-a3", label: "Nhà vệ sinh", x: 4,  y: 56, w: 40, h: 38, fixture: "toilet" },
];

/** Room dressing — drawn faintly so the occupant stays the focal point. */
function Fixture({ r }: { r: RoomGeometry }) {
  const common = {
    fill: "currentColor",
    fillOpacity: 0.07,
    stroke: "currentColor",
    strokeOpacity: 0.28,
    strokeWidth: 0.35,
    className: "text-muted-foreground",
  } as const;

  if (r.fixture === "bed") {
    const w = r.w * 0.44, h = r.h * 0.3;
    const x = r.x + r.w - w - 3, y = r.y + r.h - h - 3;
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx="1.2" {...common} />
        <rect x={x + 1} y={y + 1} width={w - 2} height={h * 0.32} rx="0.8" {...common} />
      </g>
    );
  }
  if (r.fixture === "sofa") {
    const w = r.w * 0.5, h = r.h * 0.16;
    const x = r.x + 4, y = r.y + r.h - h - 4;
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx="1.4" {...common} />
        <rect x={x} y={y - 1.8} width={w} height="2" rx="1" {...common} />
        <circle cx={r.x + r.w - 9} cy={y + h / 2} r="3.2" {...common} />
      </g>
    );
  }
  if (r.fixture === "toilet") {
    const x = r.x + r.w - 10, y = r.y + r.h - 12;
    return (
      <g>
        <rect x={x} y={y} width="6" height="3" rx="0.8" {...common} />
        <ellipse cx={x + 3} cy={y + 6} rx="3" ry="3.6" {...common} />
      </g>
    );
  }
  return null;
}

/** Articulated stick figure whose gait speed tracks the measured motion. */
function Occupant({ motion, alert }: { motion: number; alert: boolean }) {
  const m = Math.max(0, Math.min(1, motion));
  const walking = m > 0.12;
  const gait = Math.max(0.42, 1.35 - m * 1.1).toFixed(2) + "s";
  const swing = (8 + m * 26).toFixed(0);
  const breathe = Math.max(2.2, 4.4 - m * 1.6).toFixed(2) + "s";

  return (
    <g className={alert ? "text-rose-500" : "text-emerald-500"}>
      {/* contact shadow keeps the figure grounded on the floor plan */}
      <ellipse cx="0" cy="4.6" rx="2" ry="0.6" fill="currentColor" fillOpacity="0.18" />

      <g>
        {/* vertical bob while walking, gentle breathing lift while still */}
        <animateTransform
          attributeName="transform" type="translate"
          values={walking ? `0 0; 0 ${(-0.45 - m * 0.9).toFixed(2)}; 0 0` : "0 0; 0 -0.18; 0 0"}
          dur={walking ? gait : breathe}
          repeatCount="indefinite"
        />

        {/* legs */}
        <g transform="translate(0 2)">
          <path d="M0,0 L-0.9,2.4" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" fill="none">
            {walking && (
              <animateTransform attributeName="transform" type="rotate"
                values={`-${swing};${swing};-${swing}`} dur={gait} repeatCount="indefinite" />
            )}
          </path>
          <path d="M0,0 L0.9,2.4" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" fill="none">
            {walking && (
              <animateTransform attributeName="transform" type="rotate"
                values={`${swing};-${swing};${swing}`} dur={gait} repeatCount="indefinite" />
            )}
          </path>
        </g>

        {/* torso */}
        <path d="M0,-0.9 L0,2.1" stroke="currentColor" strokeWidth="0.62" strokeLinecap="round" fill="none" />

        {/* arms */}
        <g transform="translate(0 0.1)">
          <path d="M0,0 L-1.5,1.5" stroke="currentColor" strokeWidth="0.45" strokeLinecap="round" fill="none">
            {walking && (
              <animateTransform attributeName="transform" type="rotate"
                values={`${swing};-${swing};${swing}`} dur={gait} repeatCount="indefinite" />
            )}
          </path>
          <path d="M0,0 L1.5,1.5" stroke="currentColor" strokeWidth="0.45" strokeLinecap="round" fill="none">
            {walking && (
              <animateTransform attributeName="transform" type="rotate"
                values={`-${swing};${swing};-${swing}`} dur={gait} repeatCount="indefinite" />
            )}
          </path>
        </g>

        {/* head */}
        <circle cx="0" cy="-2.2" r="1.3" fill="currentColor" />
        <circle cx="0" cy="-2.2" r="1.3" fill="none" stroke="currentColor" strokeWidth="0.25" opacity="0.5">
          <animate attributeName="r" values="1.3;1.9;1.3" dur={breathe} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.45;0;0.45" dur={breathe} repeatCount="indefinite" />
        </circle>
      </g>
    </g>
  );
}

export function SpatialTwin({
  nodes,
  plan = DEFAULT_FLOORPLAN,
  className,
}: {
  nodes: NodeSensing[];
  plan?: RoomGeometry[];
  className?: string;
}) {
  const occupants = useMemo(() => {
    return nodes.flatMap((n) => {
      const v = n.latest;
      if (!v?.presence) return [];
      const room = plan.find((r) => r.node_id === n.node.node_id);
      if (!room) return [];

      // Drift the figure inside its room using the live motion signal, so an
      // active person visibly wanders and a sleeping one stays put. Seeded by
      // the timestamp → deterministic per frame, no random jitter.
      const t = v.timestamp_ms / 1000;
      const dx = Math.sin(t * 0.5 + room.x) * v.motion * room.w * 0.32;
      const dy = Math.cos(t * 0.37 + room.y) * v.motion * room.h * 0.24;

      const alert =
        v.fall_detected ||
        n.fallRisk >= 70 ||
        n.semantics.some((s) => s.active && s.primitive === "possible_distress");

      return [{
        id: n.node.node_id,
        x: room.x + room.w / 2 + dx,
        y: room.y + room.h / 2 + dy,
        motion: v.motion,
        halo: 6 + (1 - Math.max(0, Math.min(1, v.presence_score))) * 10,
        alert,
        label: room.label,
        persons: v.n_persons ?? 1,
      }];
    });
  }, [nodes, plan]);

  const occupiedIds = new Set(occupants.map((o) => o.id));

  return (
    <div className={className}>
      <svg viewBox="0 0 100 100" className="w-full h-full" role="img"
           aria-label="Bản sao số không gian: vị trí người ở theo thời gian thực">
        <defs>
          <radialGradient id="twin-halo">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
            <stop offset="60%" stopColor="currentColor" stopOpacity="0.12" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="twin-room" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.03" />
          </linearGradient>
          <pattern id="twin-grid" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M4 0 L0 0 0 4" fill="none" stroke="currentColor" strokeWidth="0.12" opacity="0.14" />
          </pattern>
        </defs>

        <rect x="0" y="0" width="100" height="100" fill="url(#twin-grid)" className="text-muted-foreground" />

        {plan.map((r) => {
          const occupied = occupiedIds.has(r.node_id);
          return (
            <g key={r.node_id}>
              <rect
                x={r.x} y={r.y} width={r.w} height={r.h} rx="2"
                className={occupied ? "text-primary" : "text-muted-foreground"}
                fill={occupied ? "url(#twin-room)" : "currentColor"}
                fillOpacity={occupied ? 1 : 0.03}
                stroke="currentColor" strokeOpacity={occupied ? 0.55 : 0.2} strokeWidth="0.45"
                style={{ transition: "fill-opacity .6s, stroke-opacity .6s" }}
              />
              <Fixture r={r} />
              <text x={r.x + 2.5} y={r.y + 5} fontSize="2.9"
                    className={occupied ? "fill-foreground" : "fill-muted-foreground"}
                    style={{ userSelect: "none", fontWeight: occupied ? 600 : 400 }}>
                {r.label}
              </text>
              {/* sensor node indicator; pulses while the zone is being perturbed */}
              <g transform={`translate(${r.x + r.w - 3.5} ${r.y + 3.5})`}>
                {occupied && (
                  <circle r="1" fill="none" stroke="currentColor" strokeWidth="0.25" className="text-primary">
                    <animate attributeName="r" values="1;3.2;1" dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.7;0;0.7" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle r="0.9" className={occupied ? "fill-primary" : "fill-muted-foreground"} />
              </g>
            </g>
          );
        })}

        {occupants.map((o) => (
          <g
            key={o.id}
            className={o.alert ? "text-rose-500" : "text-emerald-500"}
            transform={`translate(${o.x.toFixed(2)} ${o.y.toFixed(2)})`}
            style={{ transition: "transform 1s cubic-bezier(.4,0,.2,1)" }}
          >
            <circle cx="0" cy="0" r={o.halo.toFixed(1)} fill="url(#twin-halo)" />
            {o.alert && (
              <circle cx="0" cy="0" r={o.halo.toFixed(1)} fill="none"
                      stroke="currentColor" strokeWidth="0.3">
                <animate attributeName="r"
                         values={`${(o.halo * 0.5).toFixed(1)};${o.halo.toFixed(1)};${(o.halo * 0.5).toFixed(1)}`}
                         dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0.1;0.8" dur="1.6s" repeatCount="indefinite" />
              </circle>
            )}
            <Occupant motion={o.motion} alert={o.alert} />
            {o.persons > 1 && (
              <text x="2.6" y="-2.6" fontSize="2.4" fill="currentColor" style={{ userSelect: "none" }}>
                ×{o.persons}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
