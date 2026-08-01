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
 * transitions, so there is no per-frame React state (the twin costs one render
 * per sensing update, not 60/s).
 */

export interface RoomGeometry {
  node_id: string;
  label: string;
  /** Floor-plan rectangle on a 0..100 grid. */
  x: number; y: number; w: number; h: number;
}

export const DEFAULT_FLOORPLAN: RoomGeometry[] = [
  { node_id: "node-a1", label: "Phòng ngủ",   x: 4,  y: 6,  w: 40, h: 46 },
  { node_id: "node-a2", label: "Phòng khách", x: 48, y: 6,  w: 48, h: 62 },
  { node_id: "node-a3", label: "Nhà vệ sinh", x: 4,  y: 56, w: 40, h: 38 },
];

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
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <pattern id="twin-grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M5 0 L0 0 0 5" fill="none" stroke="currentColor" strokeWidth="0.15" opacity="0.12" />
          </pattern>
        </defs>

        <rect x="0" y="0" width="100" height="100" fill="url(#twin-grid)" className="text-muted-foreground" />

        {plan.map((r) => {
          const occupied = occupiedIds.has(r.node_id);
          return (
            <g key={r.node_id}>
              <rect
                x={r.x} y={r.y} width={r.w} height={r.h} rx="1.5"
                className={occupied ? "text-primary" : "text-muted-foreground"}
                fill="currentColor" fillOpacity={occupied ? 0.07 : 0.03}
                stroke="currentColor" strokeOpacity={occupied ? 0.5 : 0.22} strokeWidth="0.4"
                style={{ transition: "fill-opacity .6s, stroke-opacity .6s" }}
              />
              <text x={r.x + 2} y={r.y + 4.5} fontSize="2.8"
                    className="fill-muted-foreground" style={{ userSelect: "none" }}>
                {r.label}
              </text>
              <circle cx={r.x + r.w - 3} cy={r.y + 3} r="0.9"
                      className={occupied ? "fill-primary" : "fill-muted-foreground"} />
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
            {/* human figure; bob speed scales with measured motion */}
            <g>
              <animateTransform
                attributeName="transform" type="translate"
                values={`0 0; 0 ${(-0.5 - o.motion * 2.5).toFixed(2)}; 0 0`}
                dur={`${Math.max(0.9, 2.6 - o.motion * 4).toFixed(2)}s`}
                repeatCount="indefinite"
              />
              <circle cx="0" cy="-2.2" r="1.35" fill="currentColor" />
              <path
                d="M0,-0.9 L0,2.2 M-1.5,0.2 L1.5,0.2 M0,2.2 L-1.2,4.2 M0,2.2 L1.2,4.2"
                stroke="currentColor" strokeWidth="0.55" fill="none" strokeLinecap="round"
              />
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
