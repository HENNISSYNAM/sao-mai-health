import { useCallback, useMemo, useState } from "react";
import {
  buildFloorplan,
  DEFAULT_ROOM_MEASUREMENTS,
  type RoomMeasurement,
} from "@/services/floorplan";

const STORAGE_KEY = "sao-mai-floorplan-v1";

function loadMeasurements(): RoomMeasurement[] {
  if (typeof window === "undefined") return DEFAULT_ROOM_MEASUREMENTS;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as RoomMeasurement[] | null;
    if (!Array.isArray(stored) || stored.length !== DEFAULT_ROOM_MEASUREMENTS.length) {
      return DEFAULT_ROOM_MEASUREMENTS;
    }
    const valid = stored.every((room) =>
      typeof room.node_id === "string" &&
      Number.isFinite(room.widthM) && room.widthM >= 1 && room.widthM <= 20 &&
      Number.isFinite(room.lengthM) && room.lengthM >= 1 && room.lengthM <= 20
    );
    return valid ? stored : DEFAULT_ROOM_MEASUREMENTS;
  } catch {
    return DEFAULT_ROOM_MEASUREMENTS;
  }
}

export function useFloorplan() {
  const [measurements, setMeasurementsState] = useState<RoomMeasurement[]>(loadMeasurements);

  const setMeasurements = useCallback((next: RoomMeasurement[]) => {
    setMeasurementsState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const resetMeasurements = useCallback(() => {
    setMeasurementsState(DEFAULT_ROOM_MEASUREMENTS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const plan = useMemo(() => buildFloorplan(measurements), [measurements]);
  const calibrated = useMemo(
    () => localStorage.getItem(STORAGE_KEY) !== null,
    [measurements],
  );

  return { plan, measurements, setMeasurements, resetMeasurements, calibrated };
}