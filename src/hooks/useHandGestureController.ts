/**
 * useHandGestureController Hook
 * 
 * Sử dụng MediaPipe Hands để nhận diện cử động tay và điều khiển bản đồ.
 * 
 * Pipeline:
 * Camera Stream → Hand Detection (keypoints) → Gesture Classification → Action Mapping → Map Control
 * 
 * Gestures:
 * ✌️ Hai ngón tay - khoảng cách tăng → Zoom In
 * ✌️ Hai ngón tay - khoảng cách giảm → Zoom Out
 * ✋ Bàn tay mở, di chuyển → Pan map
 * ✊ Nắm tay → Pause gesture control
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Hands, Results, NormalizedLandmark } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

// Gesture types that can be detected
export type GestureType = 
  | 'none'
  | 'peace_sign'      // ✌️ Two fingers extended
  | 'open_palm'       // ✋ All fingers extended
  | 'fist'            // ✊ All fingers closed
  | 'pinch';          // 👌 Thumb and index close together

// Map actions that gestures can trigger
export type MapAction = 
  | 'idle'
  | 'zoom_in'
  | 'zoom_out'
  | 'pan_left'
  | 'pan_right'
  | 'pan_up'
  | 'pan_down'
  | 'pause';

// Gesture controller status
export type GestureStatus = 'inactive' | 'initializing' | 'detecting' | 'active' | 'paused' | 'error';

// Hand landmark indices for MediaPipe
const LANDMARK = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_TIP: 8,
  MIDDLE_TIP: 12,
  RING_TIP: 16,
  PINKY_TIP: 20,
  INDEX_MCP: 5,
  MIDDLE_MCP: 9,
  RING_MCP: 13,
  PINKY_MCP: 17,
};

interface GestureState {
  gesture: GestureType;
  action: MapAction;
  confidence: number;
  handCount: number;
  palmPosition: { x: number; y: number } | null;
  fingerDistance: number | null;
}

interface UseHandGestureControllerOptions {
  onAction?: (action: MapAction, data?: { deltaX?: number; deltaY?: number }) => void;
  minConfidence?: number;
  debounceMs?: number;
}

interface UseHandGestureControllerReturn {
  status: GestureStatus;
  gestureState: GestureState;
  error: string | null;
  isEnabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  start: () => Promise<void>;
  stop: () => void;
  toggle: () => Promise<void>;
}

export function useHandGestureController(
  options: UseHandGestureControllerOptions = {}
): UseHandGestureControllerReturn {
  const {
    onAction,
    minConfidence = 0.7,
    debounceMs = 100,
  } = options;

  const [status, setStatus] = useState<GestureStatus>('inactive');
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [gestureState, setGestureState] = useState<GestureState>({
    gesture: 'none',
    action: 'idle',
    confidence: 0,
    handCount: 0,
    palmPosition: null,
    fingerDistance: null,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const lastActionRef = useRef<MapAction>('idle');
  const lastActionTimeRef = useRef<number>(0);
  const lastPalmPositionRef = useRef<{ x: number; y: number } | null>(null);
  const lastFingerDistanceRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  // Calculate distance between two landmarks
  const getDistance = useCallback((p1: NormalizedLandmark, p2: NormalizedLandmark): number => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Check if a finger is extended (tip above MCP for detection)
  const isFingerExtended = useCallback((
    landmarks: NormalizedLandmark[],
    tipIdx: number,
    mcpIdx: number
  ): boolean => {
    const tip = landmarks[tipIdx];
    const mcp = landmarks[mcpIdx];
    // Y is inverted in camera (smaller = higher)
    return tip.y < mcp.y - 0.05;
  }, []);

  // Classify gesture from hand landmarks
  const classifyGesture = useCallback((landmarks: NormalizedLandmark[]): { gesture: GestureType; confidence: number } => {
    const indexExtended = isFingerExtended(landmarks, LANDMARK.INDEX_TIP, LANDMARK.INDEX_MCP);
    const middleExtended = isFingerExtended(landmarks, LANDMARK.MIDDLE_TIP, LANDMARK.MIDDLE_MCP);
    const ringExtended = isFingerExtended(landmarks, LANDMARK.RING_TIP, LANDMARK.RING_MCP);
    const pinkyExtended = isFingerExtended(landmarks, LANDMARK.PINKY_TIP, LANDMARK.PINKY_MCP);

    const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

    // ✊ Fist - no fingers extended
    if (extendedCount === 0) {
      return { gesture: 'fist', confidence: 0.9 };
    }

    // ✌️ Peace sign - only index and middle extended
    if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
      return { gesture: 'peace_sign', confidence: 0.85 };
    }

    // ✋ Open palm - all fingers extended
    if (extendedCount >= 3) {
      return { gesture: 'open_palm', confidence: 0.8 };
    }

    // 👌 Pinch - thumb and index close together
    const thumbIndexDist = getDistance(landmarks[LANDMARK.THUMB_TIP], landmarks[LANDMARK.INDEX_TIP]);
    if (thumbIndexDist < 0.08) {
      return { gesture: 'pinch', confidence: 0.75 };
    }

    return { gesture: 'none', confidence: 0.5 };
  }, [isFingerExtended, getDistance]);

  // Convert gesture to map action based on movement
  const gestureToMapAction = useCallback((
    gesture: GestureType,
    palmPosition: { x: number; y: number } | null,
    fingerDistance: number | null
  ): { action: MapAction; deltaX?: number; deltaY?: number } => {
    // Fist = pause
    if (gesture === 'fist') {
      return { action: 'pause' };
    }

    // Peace sign - zoom based on finger distance change
    if (gesture === 'peace_sign' && fingerDistance !== null && lastFingerDistanceRef.current !== null) {
      const distDelta = fingerDistance - lastFingerDistanceRef.current;
      const threshold = 0.02; // Sensitivity threshold
      
      if (distDelta > threshold) {
        return { action: 'zoom_in' };
      } else if (distDelta < -threshold) {
        return { action: 'zoom_out' };
      }
    }

    // Open palm - pan based on palm movement
    if (gesture === 'open_palm' && palmPosition && lastPalmPositionRef.current) {
      const deltaX = palmPosition.x - lastPalmPositionRef.current.x;
      const deltaY = palmPosition.y - lastPalmPositionRef.current.y;
      const panThreshold = 0.03;

      if (Math.abs(deltaX) > panThreshold || Math.abs(deltaY) > panThreshold) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Invert X because camera is mirrored
          return deltaX > 0 
            ? { action: 'pan_left', deltaX: deltaX * 100 } 
            : { action: 'pan_right', deltaX: deltaX * 100 };
        } else {
          return deltaY > 0 
            ? { action: 'pan_down', deltaY: deltaY * 100 } 
            : { action: 'pan_up', deltaY: deltaY * 100 };
        }
      }
    }

    return { action: 'idle' };
  }, []);

  // Process MediaPipe results
  const onResults = useCallback((results: Results) => {
    frameCountRef.current++;
    
    // Draw to canvas for visual feedback
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx && videoRef.current) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(videoRef.current, 0, 0);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Draw hand landmarks
        for (const landmarks of results.multiHandLandmarks) {
          // Draw connections
          ctx.strokeStyle = '#00FF00';
          ctx.lineWidth = 2;
          
          // Draw points
          for (const landmark of landmarks) {
            ctx.beginPath();
            ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 4, 0, 2 * Math.PI);
            ctx.fillStyle = '#FF0000';
            ctx.fill();
          }
        }
      }
    }

    // Process hand detection
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      setGestureState(prev => ({
        ...prev,
        gesture: 'none',
        action: 'idle',
        handCount: 0,
        palmPosition: null,
        fingerDistance: null,
      }));
      setStatus('detecting');
      return;
    }

    setStatus('active');

    // Use first detected hand
    const landmarks = results.multiHandLandmarks[0];
    const { gesture, confidence } = classifyGesture(landmarks);

    // Calculate palm position (wrist)
    const palmPosition = {
      x: landmarks[LANDMARK.WRIST].x,
      y: landmarks[LANDMARK.WRIST].y,
    };

    // Calculate finger distance for peace sign zoom
    let fingerDistance: number | null = null;
    if (gesture === 'peace_sign') {
      fingerDistance = getDistance(landmarks[LANDMARK.INDEX_TIP], landmarks[LANDMARK.MIDDLE_TIP]);
    }

    // Get map action
    const { action, deltaX, deltaY } = gestureToMapAction(gesture, palmPosition, fingerDistance);

    // Debounce actions
    const now = Date.now();
    if (action !== 'idle' && 
        action !== lastActionRef.current && 
        now - lastActionTimeRef.current > debounceMs) {
      lastActionRef.current = action;
      lastActionTimeRef.current = now;
      
      if (onAction && confidence >= minConfidence) {
        onAction(action, { deltaX, deltaY });
      }
    }

    // Update state
    setGestureState({
      gesture,
      action,
      confidence,
      handCount: results.multiHandLandmarks.length,
      palmPosition,
      fingerDistance,
    });

    // Store for next frame comparison
    lastPalmPositionRef.current = palmPosition;
    lastFingerDistanceRef.current = fingerDistance;
  }, [classifyGesture, gestureToMapAction, getDistance, onAction, minConfidence, debounceMs]);

  // Start gesture detection
  const start = useCallback(async () => {
    try {
      setError(null);
      setStatus('initializing');

      if (!videoRef.current) {
        throw new Error('Video element not available');
      }

      // Request camera permission - prefer rear camera for mobile
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Rear camera
          width: { ideal: 640 },
          height: { ideal: 480 },
        }
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      // Initialize MediaPipe Hands
      const hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      // Start camera processing
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });

      await camera.start();
      cameraRef.current = camera;

      setIsEnabled(true);
      setStatus('detecting');
    } catch (err) {
      console.error('Failed to start gesture controller:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize camera');
      setStatus('error');
    }
  }, [onResults]);

  // Stop gesture detection
  const stop = useCallback(() => {
    // Stop camera
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }

    // Stop video stream
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    // Clean up MediaPipe
    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setIsEnabled(false);
    setStatus('inactive');
    setGestureState({
      gesture: 'none',
      action: 'idle',
      confidence: 0,
      handCount: 0,
      palmPosition: null,
      fingerDistance: null,
    });
  }, []);

  // Toggle gesture detection
  const toggle = useCallback(async () => {
    if (isEnabled) {
      stop();
    } else {
      await start();
    }
  }, [isEnabled, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    status,
    gestureState,
    error,
    isEnabled,
    videoRef,
    canvasRef,
    start,
    stop,
    toggle,
  };
}
