import { useState, useEffect, useCallback, useRef } from 'react';

interface GPSPosition {
  lat: number;
  lng: number;
  accuracy: number; // meters
  timestamp: number;
}

interface UseGPSOptions {
  /** Enable high accuracy (GPS hardware). Default: true */
  highAccuracy?: boolean;
  /** Watch position continuously. Default: false */
  watch?: boolean;
  /** Maximum age of cached position in ms. Default: 30000 (30s) */
  maxAge?: number;
  /** Timeout for GPS request in ms. Default: 15000 (15s) */
  timeout?: number;
  /** Fallback coordinates if GPS fails. Default: HCMC */
  fallback?: { lat: number; lng: number };
  /** Auto-start on mount. Default: true */
  autoStart?: boolean;
}

interface GPSState {
  position: GPSPosition | null;
  isLoading: boolean;
  error: string | null;
  isWatching: boolean;
  /** Whether position came from fallback */
  isFallback: boolean;
}

// Global singleton cache so multiple hook instances share the same GPS data
let globalPosition: GPSPosition | null = null;
let globalListeners: Set<(pos: GPSPosition) => void> = new Set();
let globalWatchId: number | null = null;

const HCMC_FALLBACK = { lat: 10.8231, lng: 106.6297 };

export function useGPS(options: UseGPSOptions = {}) {
  const {
    highAccuracy = true,
    watch = false,
    maxAge = 30000,
    timeout = 15000,
    fallback = HCMC_FALLBACK,
    autoStart = true,
  } = options;

  const [state, setState] = useState<GPSState>({
    position: globalPosition,
    isLoading: !globalPosition,
    error: null,
    isWatching: false,
    isFallback: false,
  });

  const mountedRef = useRef(true);

  // Listen for global position updates
  useEffect(() => {
    const listener = (pos: GPSPosition) => {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          position: pos,
          isLoading: false,
          error: null,
          isFallback: false,
        }));
      }
    };
    globalListeners.add(listener);

    // If global position already exists, use it immediately
    if (globalPosition) {
      listener(globalPosition);
    }

    return () => {
      globalListeners.delete(listener);
      mountedRef.current = false;
    };
  }, []);

  const broadcastPosition = useCallback((pos: GPSPosition) => {
    globalPosition = pos;
    globalListeners.forEach(listener => listener(pos));
  }, []);

  const applyFallback = useCallback(() => {
    if (mountedRef.current) {
      setState(prev => ({
        ...prev,
        position: { ...fallback, accuracy: 99999, timestamp: Date.now() },
        isLoading: false,
        isFallback: true,
      }));
    }
  }, [fallback]);

  // Get position once with progressive strategy:
  // 1. Try cached (fast, ~0ms)
  // 2. Try high accuracy (slow, precise)
  const requestPosition = useCallback(async (): Promise<GPSPosition | null> => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation not supported', isLoading: false }));
      applyFallback();
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // Strategy: fast cached first, then high accuracy
    const getPos = (opts: PositionOptions): Promise<GeolocationPosition | null> =>
      new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
          pos => resolve(pos),
          () => resolve(null),
          opts
        );
      });

    // Step 1: Try cached/low accuracy for instant result
    const cached = await getPos({
      enableHighAccuracy: false,
      maximumAge: maxAge,
      timeout: 3000,
    });

    if (cached) {
      const pos: GPSPosition = {
        lat: cached.coords.latitude,
        lng: cached.coords.longitude,
        accuracy: cached.coords.accuracy,
        timestamp: cached.timestamp,
      };
      broadcastPosition(pos);
    }

    // Step 2: If high accuracy requested, try for better result
    if (highAccuracy) {
      const precise = await getPos({
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout,
      });

      if (precise) {
        const pos: GPSPosition = {
          lat: precise.coords.latitude,
          lng: precise.coords.longitude,
          accuracy: precise.coords.accuracy,
          timestamp: precise.timestamp,
        };
        broadcastPosition(pos);
        console.log(`📍 GPS: ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} (±${pos.accuracy.toFixed(0)}m)`);
        return pos;
      }
    }

    // If we got cached result, that's good enough
    if (globalPosition) return globalPosition;

    // Total failure - use fallback
    console.warn('📍 GPS failed, using fallback:', fallback);
    setState(prev => ({ ...prev, error: 'GPS unavailable', isLoading: false }));
    applyFallback();
    return null;
  }, [highAccuracy, maxAge, timeout, fallback, broadcastPosition, applyFallback]);

  // Watch position continuously
  const startWatching = useCallback(() => {
    if (!navigator.geolocation || globalWatchId !== null) return;

    setState(prev => ({ ...prev, isWatching: true }));

    globalWatchId = navigator.geolocation.watchPosition(
      (position) => {
        const pos: GPSPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        broadcastPosition(pos);
      },
      (error) => {
        console.warn('GPS watch error:', error.message);
      },
      {
        enableHighAccuracy: highAccuracy,
        maximumAge: 5000,
        timeout: 20000,
      }
    );
  }, [highAccuracy, broadcastPosition]);

  const stopWatching = useCallback(() => {
    if (globalWatchId !== null) {
      navigator.geolocation.clearWatch(globalWatchId);
      globalWatchId = null;
    }
    setState(prev => ({ ...prev, isWatching: false }));
  }, []);

  // Auto-start on mount
  useEffect(() => {
    if (!autoStart) return;

    if (watch) {
      requestPosition().then(() => startWatching());
    } else {
      requestPosition();
    }

    return () => {
      if (watch) stopWatching();
    };
  }, [autoStart]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    /** Shorthand: { lat, lng } or fallback */
    gps: state.position
      ? { lat: state.position.lat, lng: state.position.lng }
      : fallback,
    requestPosition,
    startWatching,
    stopWatching,
  };
}

export type { GPSPosition, UseGPSOptions };
