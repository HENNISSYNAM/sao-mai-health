/**
 * gestureToMapAction Utility
 * 
 * Ánh xạ cử động tay thành hành động điều khiển bản đồ.
 * Được thiết kế để dễ mở rộng với các gesture mới.
 * 
 * Gesture → Action mapping:
 * ✌️ Hai ngón tay mở rộng - khoảng cách tăng → Zoom In
 * ✌️ Hai ngón tay mở rộng - khoảng cách giảm → Zoom Out
 * ✋ Bàn tay mở, di chuyển sang trái/phải/trên/dưới → Pan map
 * ✊ Nắm tay → Disable gesture input (pause)
 */

import type { GestureType, MapAction } from '@/hooks/useHandGestureController';

// Configuration for gesture sensitivity
export interface GestureConfig {
  zoomThreshold: number;      // Min distance change for zoom
  panThreshold: number;       // Min movement for pan
  smoothingFactor: number;    // Smoothing for movements (0-1)
  minConfidence: number;      // Minimum confidence to act
}

export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  zoomThreshold: 0.02,
  panThreshold: 0.03,
  smoothingFactor: 0.7,
  minConfidence: 0.7,
};

// Map action details with visual feedback info
export interface MapActionDetails {
  action: MapAction;
  icon: string;
  label: string;
  color: string;
}

// Get display details for an action
export function getActionDetails(action: MapAction): MapActionDetails {
  switch (action) {
    case 'zoom_in':
      return { action, icon: '🔍+', label: 'Phóng to', color: 'text-green-500' };
    case 'zoom_out':
      return { action, icon: '🔍-', label: 'Thu nhỏ', color: 'text-orange-500' };
    case 'pan_left':
      return { action, icon: '←', label: 'Sang trái', color: 'text-blue-500' };
    case 'pan_right':
      return { action, icon: '→', label: 'Sang phải', color: 'text-blue-500' };
    case 'pan_up':
      return { action, icon: '↑', label: 'Lên trên', color: 'text-blue-500' };
    case 'pan_down':
      return { action, icon: '↓', label: 'Xuống dưới', color: 'text-blue-500' };
    case 'pause':
      return { action, icon: '✊', label: 'Tạm dừng', color: 'text-yellow-500' };
    default:
      return { action, icon: '👋', label: 'Đang chờ', color: 'text-muted-foreground' };
  }
}

// Get gesture display info
export function getGestureInfo(gesture: GestureType): { icon: string; label: string } {
  switch (gesture) {
    case 'peace_sign':
      return { icon: '✌️', label: 'Hai ngón' };
    case 'open_palm':
      return { icon: '✋', label: 'Bàn tay mở' };
    case 'fist':
      return { icon: '✊', label: 'Nắm tay' };
    case 'pinch':
      return { icon: '👌', label: 'Kẹp' };
    default:
      return { icon: '🖐️', label: 'Không xác định' };
  }
}

// Smooth a value using exponential moving average
export function smoothValue(
  current: number, 
  previous: number, 
  factor: number = DEFAULT_GESTURE_CONFIG.smoothingFactor
): number {
  return previous * factor + current * (1 - factor);
}

// Calculate velocity between two points
export function calculateVelocity(
  current: { x: number; y: number },
  previous: { x: number; y: number },
  deltaTimeMs: number
): { vx: number; vy: number; speed: number } {
  const deltaTimeSec = Math.max(deltaTimeMs / 1000, 0.016); // At least 60fps
  const vx = (current.x - previous.x) / deltaTimeSec;
  const vy = (current.y - previous.y) / deltaTimeSec;
  const speed = Math.sqrt(vx * vx + vy * vy);
  return { vx, vy, speed };
}

// Check if movement is intentional (not just hand shake)
export function isIntentionalMovement(
  speed: number,
  minSpeed: number = 0.5,
  maxSpeed: number = 5.0
): boolean {
  return speed > minSpeed && speed < maxSpeed;
}

// Direction detector for pan gestures
export function detectPanDirection(
  deltaX: number,
  deltaY: number,
  threshold: number = DEFAULT_GESTURE_CONFIG.panThreshold
): MapAction {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX < threshold && absY < threshold) {
    return 'idle';
  }

  if (absX > absY) {
    return deltaX > 0 ? 'pan_left' : 'pan_right';
  } else {
    return deltaY > 0 ? 'pan_down' : 'pan_up';
  }
}

// Zoom detector based on finger distance change
export function detectZoom(
  currentDistance: number,
  previousDistance: number,
  threshold: number = DEFAULT_GESTURE_CONFIG.zoomThreshold
): MapAction {
  const delta = currentDistance - previousDistance;
  
  if (Math.abs(delta) < threshold) {
    return 'idle';
  }

  return delta > 0 ? 'zoom_in' : 'zoom_out';
}
