/**
 * useMapHandCursor Hook
 * 
 * Hand tracking cursor layer cho map - hoạt động như mouse input
 * 
 * Tay trái = Left mouse (drag map, select points)
 * Tay phải = Right mouse (context menu, layer options)
 * Pinch = Click
 * Pinch giữ = Drag
 * Hai tay = Zoom
 * Nắm tay = Pause input
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Cursor states
export type CursorMode = 'idle' | 'hover' | 'click' | 'drag' | 'zoom' | 'paused';

// Hand types
export type HandType = 'left' | 'right' | 'both' | 'none';

// Map actions from cursor
export type CursorMapAction = 
  | { type: 'none' }
  | { type: 'pan'; deltaX: number; deltaY: number }
  | { type: 'zoom'; delta: number }
  | { type: 'click'; x: number; y: number; button: 'left' | 'right' }
  | { type: 'context_menu'; x: number; y: number }
  | { type: 'pause' };

interface CursorState {
  x: number;
  y: number;
  isVisible: boolean;
  mode: CursorMode;
  hand: HandType;
  isPinching: boolean;
  confidence: number;
}

interface HandData {
  landmarks: Array<{ x: number; y: number; z?: number }>;
  handedness: 'Left' | 'Right';
  confidence: number;
}

interface UseMapHandCursorOptions {
  containerRef: React.RefObject<HTMLElement>;
  enabled?: boolean;
  onMapAction?: (action: CursorMapAction) => void;
  smoothingFactor?: number;
}

interface UseMapHandCursorReturn {
  cursor: CursorState;
  status: 'inactive' | 'initializing' | 'active' | 'paused' | 'error';
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  start: () => Promise<void>;
  stop: () => void;
  toggle: () => Promise<void>;
}

// Landmark indices
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

// Load MediaPipe scripts
const loadMediaPipeScripts = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).Hands && (window as any).Camera) {
      resolve();
      return;
    }

    const loadScript = (src: string): Promise<void> => {
      return new Promise((res, rej) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          res();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => res();
        script.onerror = () => rej(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    };

    Promise.all([
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'),
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'),
    ])
      .then(() => setTimeout(resolve, 100))
      .catch(reject);
  });
};

export function useMapHandCursor(options: UseMapHandCursorOptions): UseMapHandCursorReturn {
  const { containerRef, enabled = true, onMapAction, smoothingFactor = 0.3 } = options;

  const [status, setStatus] = useState<'inactive' | 'initializing' | 'active' | 'paused' | 'error'>('inactive');
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<CursorState>({
    x: 0,
    y: 0,
    isVisible: false,
    mode: 'idle',
    hand: 'none',
    isPinching: false,
    confidence: 0,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  
  // State refs for gesture tracking
  const prevCursorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const prevPinchStateRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const prevFingerDistRef = useRef<number | null>(null);
  const smoothedPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Check if cursor is within container bounds
  const isWithinBounds = useCallback((x: number, y: number): boolean => {
    if (!containerRef.current) return false;
    const rect = containerRef.current.getBoundingClientRect();
    return x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
  }, [containerRef]);

  // Calculate pinch state
  const isPinching = useCallback((landmarks: Array<{ x: number; y: number; z?: number }>): boolean => {
    const thumbTip = landmarks[LANDMARK.THUMB_TIP];
    const indexTip = landmarks[LANDMARK.INDEX_TIP];
    const dx = thumbTip.x - indexTip.x;
    const dy = thumbTip.y - indexTip.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < 0.06; // Pinch threshold
  }, []);

  // Check if fist (pause gesture)
  const isFist = useCallback((landmarks: Array<{ x: number; y: number; z?: number }>): boolean => {
    const isExtended = (tipIdx: number, mcpIdx: number): boolean => {
      return landmarks[tipIdx].y < landmarks[mcpIdx].y - 0.05;
    };
    
    const indexExt = isExtended(LANDMARK.INDEX_TIP, LANDMARK.INDEX_MCP);
    const middleExt = isExtended(LANDMARK.MIDDLE_TIP, LANDMARK.MIDDLE_MCP);
    const ringExt = isExtended(LANDMARK.RING_TIP, LANDMARK.RING_MCP);
    const pinkyExt = isExtended(LANDMARK.PINKY_TIP, LANDMARK.PINKY_MCP);
    
    return !indexExt && !middleExt && !ringExt && !pinkyExt;
  }, []);

  // Convert camera coordinates to container coordinates
  const cameraToContainer = useCallback((x: number, y: number): { x: number; y: number } => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    // Mirror X axis (camera is mirrored) and map to container
    return {
      x: (1 - x) * rect.width,
      y: y * rect.height,
    };
  }, [containerRef]);

  // Process MediaPipe results
  const onResults = useCallback((results: any) => {
    // Draw preview
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx && videoRef.current) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      ctx.drawImage(videoRef.current, 0, 0);
      ctx.restore();

      // Draw hand landmarks
      if (results.multiHandLandmarks) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
          const landmarks = results.multiHandLandmarks[i];
          const handedness = results.multiHandedness?.[i]?.label || 'Right';
          const color = handedness === 'Left' ? '#00FF00' : '#0088FF';
          
          for (const landmark of landmarks) {
            ctx.beginPath();
            ctx.arc((1 - landmark.x) * canvas.width, landmark.y * canvas.height, 3, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }
          
          // Highlight index finger tip
          const indexTip = landmarks[LANDMARK.INDEX_TIP];
          ctx.beginPath();
          ctx.arc((1 - indexTip.x) * canvas.width, indexTip.y * canvas.height, 8, 0, 2 * Math.PI);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    // No hands detected
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      setCursor(prev => ({
        ...prev,
        isVisible: false,
        mode: 'idle',
        hand: 'none',
        confidence: 0,
      }));
      dragStartRef.current = null;
      return;
    }

    // Parse hands data
    const hands: HandData[] = results.multiHandLandmarks.map((landmarks: any, i: number) => ({
      landmarks,
      handedness: results.multiHandedness?.[i]?.label || 'Right',
      confidence: results.multiHandedness?.[i]?.score || 0.5,
    }));

    const leftHand = hands.find(h => h.handedness === 'Left');
    const rightHand = hands.find(h => h.handedness === 'Right');

    // Check for fist (pause) on any hand
    const anyFist = hands.some(h => isFist(h.landmarks));
    if (anyFist) {
      setStatus('paused');
      setCursor(prev => ({
        ...prev,
        mode: 'paused',
        isVisible: true,
      }));
      if (onMapAction) onMapAction({ type: 'pause' });
      return;
    }

    setStatus('active');

    // Two hands = zoom mode
    if (leftHand && rightHand) {
      const leftIndex = leftHand.landmarks[LANDMARK.INDEX_TIP];
      const rightIndex = rightHand.landmarks[LANDMARK.INDEX_TIP];
      const dx = leftIndex.x - rightIndex.x;
      const dy = leftIndex.y - rightIndex.y;
      const fingerDist = Math.sqrt(dx * dx + dy * dy);

      // Center cursor between two hands
      const centerX = (leftIndex.x + rightIndex.x) / 2;
      const centerY = (leftIndex.y + rightIndex.y) / 2;
      const containerPos = cameraToContainer(centerX, centerY);

      if (prevFingerDistRef.current !== null && isWithinBounds(containerPos.x, containerPos.y)) {
        const distDelta = fingerDist - prevFingerDistRef.current;
        if (Math.abs(distDelta) > 0.01) {
          const zoomDelta = distDelta > 0 ? 1 : -1;
          if (onMapAction) onMapAction({ type: 'zoom', delta: zoomDelta });
        }
      }
      
      prevFingerDistRef.current = fingerDist;

      setCursor({
        x: containerPos.x,
        y: containerPos.y,
        isVisible: true,
        mode: 'zoom',
        hand: 'both',
        isPinching: false,
        confidence: Math.min(leftHand.confidence, rightHand.confidence),
      });
      return;
    }

    prevFingerDistRef.current = null;

    // Single hand mode - use as cursor
    const activeHand = leftHand || rightHand;
    if (!activeHand) return;

    const handType = activeHand.handedness === 'Left' ? 'left' : 'right';
    const indexTip = activeHand.landmarks[LANDMARK.INDEX_TIP];
    const rawPos = cameraToContainer(indexTip.x, indexTip.y);

    // Smooth cursor movement
    smoothedPosRef.current = {
      x: smoothedPosRef.current.x + (rawPos.x - smoothedPosRef.current.x) * smoothingFactor,
      y: smoothedPosRef.current.y + (rawPos.y - smoothedPosRef.current.y) * smoothingFactor,
    };

    const cursorPos = smoothedPosRef.current;
    const pinching = isPinching(activeHand.landmarks);
    const prevPinch = handType === 'left' ? prevPinchStateRef.current.left : prevPinchStateRef.current.right;
    const withinBounds = isWithinBounds(cursorPos.x, cursorPos.y);

    // Handle pinch state changes
    if (withinBounds) {
      // Pinch start (click)
      if (pinching && !prevPinch) {
        const button = handType === 'left' ? 'left' : 'right';
        if (button === 'left') {
          dragStartRef.current = { x: cursorPos.x, y: cursorPos.y };
        } else {
          // Right click = context menu
          if (onMapAction) onMapAction({ type: 'context_menu', x: cursorPos.x, y: cursorPos.y });
        }
        if (onMapAction) onMapAction({ type: 'click', x: cursorPos.x, y: cursorPos.y, button });
      }

      // Drag (pinch hold + movement) - only left hand
      if (pinching && dragStartRef.current && handType === 'left') {
        const deltaX = cursorPos.x - prevCursorRef.current.x;
        const deltaY = cursorPos.y - prevCursorRef.current.y;
        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
          if (onMapAction) onMapAction({ type: 'pan', deltaX: -deltaX, deltaY: -deltaY });
        }
      }

      // Pinch end
      if (!pinching && prevPinch) {
        dragStartRef.current = null;
      }
    }

    // Update pinch state
    if (handType === 'left') {
      prevPinchStateRef.current.left = pinching;
    } else {
      prevPinchStateRef.current.right = pinching;
    }

    // Update cursor state
    let mode: CursorMode = 'hover';
    if (pinching && dragStartRef.current) {
      mode = 'drag';
    } else if (pinching) {
      mode = 'click';
    }

    setCursor({
      x: cursorPos.x,
      y: cursorPos.y,
      isVisible: withinBounds,
      mode,
      hand: handType,
      isPinching: pinching,
      confidence: activeHand.confidence,
    });

    prevCursorRef.current = { x: cursorPos.x, y: cursorPos.y };
  }, [cameraToContainer, isPinching, isFist, isWithinBounds, onMapAction, smoothingFactor]);

  // Start hand tracking
  const start = useCallback(async () => {
    try {
      setError(null);
      setStatus('initializing');

      // Wait for video element with longer timeout
      let retries = 0;
      while (!videoRef.current && retries < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }

      if (!videoRef.current) {
        throw new Error('Video element chưa sẵn sàng');
      }

      console.log('Loading MediaPipe scripts...');
      await loadMediaPipeScripts();

      const HandsClass = (window as any).Hands;
      const CameraClass = (window as any).Camera;

      if (!HandsClass || !CameraClass) {
        throw new Error('Không thể tải MediaPipe');
      }

      console.log('Requesting camera access...');
      
      // Try rear camera first, fallback to front camera
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 640 },
            height: { ideal: 480 },
          }
        });
      } catch (rearCameraError) {
        console.log('Rear camera failed, trying front camera...');
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: 640 },
              height: { ideal: 480 },
            }
          });
        } catch (frontCameraError) {
          // Final fallback - any camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
        }
      }

      console.log('Camera stream obtained');
      videoRef.current.srcObject = stream;
      
      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const video = videoRef.current!;
        video.onloadedmetadata = () => {
          video.play()
            .then(() => resolve())
            .catch(reject);
        };
        video.onerror = () => reject(new Error('Video error'));
        // Timeout
        setTimeout(() => reject(new Error('Video timeout')), 10000);
      });

      console.log('Video playing, initializing MediaPipe Hands...');

      // Initialize MediaPipe Hands
      const hands = new HandsClass({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.5,
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      console.log('Starting camera processing...');

      // Start camera processing
      const camera = new CameraClass(videoRef.current, {
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
      
      console.log('Hand tracking started successfully');
      setStatus('active');
    } catch (err) {
      console.error('Failed to start hand cursor:', err);
      
      // Provide user-friendly error messages
      let errorMessage = 'Không thể khởi tạo camera';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.message.includes('Permission')) {
          errorMessage = 'Vui lòng cho phép truy cập camera';
        } else if (err.name === 'NotFoundError' || err.message.includes('not found')) {
          errorMessage = 'Không tìm thấy camera';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera đang được sử dụng bởi ứng dụng khác';
        } else if (err.message.includes('MediaPipe')) {
          errorMessage = 'Không thể tải thư viện nhận diện tay';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setStatus('error');
      setStatus('error');
    }
  }, [onResults]);

  // Stop hand tracking
  const stop = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }

    setStatus('inactive');
    setCursor({
      x: 0,
      y: 0,
      isVisible: false,
      mode: 'idle',
      hand: 'none',
      isPinching: false,
      confidence: 0,
    });
  }, []);

  // Toggle
  const toggle = useCallback(async () => {
    if (status === 'inactive' || status === 'error') {
      await start();
    } else {
      stop();
    }
  }, [status, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    cursor,
    status,
    error,
    videoRef,
    canvasRef,
    start,
    stop,
    toggle,
  };
}
