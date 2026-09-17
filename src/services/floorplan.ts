export interface RoomGeometry {
  node_id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fixture?: "bed" | "sofa" | "toilet";
}

export interface RoomMeasurement {
  node_id: string;
  widthM: number;
  lengthM: number;
}

export const PLAN_UNITS_PER_METRE = 10;
export const UNIT_M = 1 / PLAN_UNITS_PER_METRE;

export const DEFAULT_ROOM_MEASUREMENTS: RoomMeasurement[] = [
  { node_id: "node-a1", widthM: 3.8, lengthM: 4.2 },
  { node_id: "node-a2", widthM: 4.4, lengthM: 5.8 },
  { node_id: "node-a3", widthM: 3.8, lengthM: 3.8 },
];

const ROOM_META = [
  { node_id: "node-a1", label: "sensing.rooms.bedroom", fixture: "bed" as const },
  { node_id: "node-a2", label: "sensing.rooms.living", fixture: "sofa" as const },
  { node_id: "node-a3", label: "sensing.rooms.bathroom", fixture: "toilet" as const },
];

export function buildFloorplan(measurements: RoomMeasurement[]): RoomGeometry[] {
  const byId = new Map(measurements.map((room) => [room.node_id, room]));
  const bedroom = byId.get("node-a1") ?? DEFAULT_ROOM_MEASUREMENTS[0];
  const living = byId.get("node-a2") ?? DEFAULT_ROOM_MEASUREMENTS[1];
  const bathroom = byId.get("node-a3") ?? DEFAULT_ROOM_MEASUREMENTS[2];
  const gap = 4;
  const margin = 6;
  const leftWidth = Math.max(bedroom.widthM, bathroom.widthM) * PLAN_UNITS_PER_METRE;

  const positions = new Map<string, { x: number; y: number }>([
    ["node-a1", { x: margin, y: margin }],
    ["node-a3", { x: margin, y: margin + bedroom.lengthM * PLAN_UNITS_PER_METRE + gap }],
    ["node-a2", { x: margin + leftWidth + gap, y: margin }],
  ]);

  return ROOM_META.map((meta) => {
    const measured = byId.get(meta.node_id) ?? DEFAULT_ROOM_MEASUREMENTS.find((room) => room.node_id === meta.node_id);
    const fallback = DEFAULT_ROOM_MEASUREMENTS[0];
    const size = measured ?? fallback;
    const position = positions.get(meta.node_id) ?? { x: margin, y: margin };
    return {
      ...meta,
      ...position,
      w: size.widthM * PLAN_UNITS_PER_METRE,
      h: size.lengthM * PLAN_UNITS_PER_METRE,
    };
  });
}

export const DEFAULT_FLOORPLAN = buildFloorplan(DEFAULT_ROOM_MEASUREMENTS);

export function floorplanBounds(plan: RoomGeometry[], margin = 4) {
  if (!plan.length) return { minX: 0, minY: 0, width: 100, height: 100 };
  const minX = Math.min(...plan.map((room) => room.x)) - margin;
  const minY = Math.min(...plan.map((room) => room.y)) - margin;
  const maxX = Math.max(...plan.map((room) => room.x + room.w)) + margin;
  const maxY = Math.max(...plan.map((room) => room.y + room.h)) + margin;
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}