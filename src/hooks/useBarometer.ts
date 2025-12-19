import { useState, useEffect, useCallback, useRef } from 'react';

interface BarometerReading {
  pressure: number;
  timestamp: number;
}

interface BarometerState {
  currentPressure: number | null;
  pressureHistory: BarometerReading[];
  pressureChange24h: number | null;
  pressureChange1h: number | null;
  isSupported: boolean;
  isActive: boolean;
  error: string | null;
}

const STORAGE_KEY = 'stroke_barometer_history';
const MAX_HISTORY_HOURS = 72;
const READING_INTERVAL_MS = 60000; // 1 minute

export function useBarometer() {
  const [state, setState] = useState<BarometerState>({
    currentPressure: null,
    pressureHistory: [],
    pressureChange24h: null,
    pressureChange1h: null,
    isSupported: false,
    isActive: false,
    error: null
  });

  const sensorRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load history from localStorage
  const loadHistory = useCallback((): BarometerReading[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const history = JSON.parse(stored) as BarometerReading[];
        const cutoff = Date.now() - MAX_HISTORY_HOURS * 60 * 60 * 1000;
        return history.filter(r => r.timestamp > cutoff);
      }
    } catch (e) {
      console.error('Error loading barometer history:', e);
    }
    return [];
  }, []);

  // Save history to localStorage
  const saveHistory = useCallback((history: BarometerReading[]) => {
    try {
      const cutoff = Date.now() - MAX_HISTORY_HOURS * 60 * 60 * 1000;
      const filtered = history.filter(r => r.timestamp > cutoff);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Error saving barometer history:', e);
    }
  }, []);

  // Calculate pressure changes
  const calculateChanges = useCallback((history: BarometerReading[], current: number) => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    let change1h: number | null = null;
    let change24h: number | null = null;

    const hourReading = history.find(r => r.timestamp <= oneHourAgo);
    if (hourReading) {
      change1h = current - hourReading.pressure;
    }

    const dayReading = history.find(r => r.timestamp <= oneDayAgo);
    if (dayReading) {
      change24h = current - dayReading.pressure;
    }

    return { change1h, change24h };
  }, []);

  // Add reading to history
  const addReading = useCallback((pressure: number) => {
    const reading: BarometerReading = {
      pressure,
      timestamp: Date.now()
    };

    setState(prev => {
      const newHistory = [...prev.pressureHistory, reading];
      const changes = calculateChanges(newHistory, pressure);
      
      saveHistory(newHistory);
      
      return {
        ...prev,
        currentPressure: pressure,
        pressureHistory: newHistory,
        pressureChange1h: changes.change1h,
        pressureChange24h: changes.change24h
      };
    });
  }, [calculateChanges, saveHistory]);

  // Start barometer sensor
  const startBarometer = useCallback(async () => {
    // Check for Web Sensor API support
    if (!('Barometer' in window)) {
      // Fallback: use weather API pressure as estimate
      setState(prev => ({
        ...prev,
        isSupported: false,
        error: 'Thiết bị không hỗ trợ cảm biến khí áp. Sử dụng dữ liệu thời tiết.'
      }));
      return false;
    }

    try {
      // Request permission for sensors
      const result = await navigator.permissions.query({ name: 'ambient-pressure' as PermissionName });
      
      if (result.state === 'denied') {
        setState(prev => ({
          ...prev,
          isSupported: true,
          error: 'Quyền truy cập cảm biến bị từ chối'
        }));
        return false;
      }

      // Initialize sensor
      const Barometer = (window as any).Barometer;
      sensorRef.current = new Barometer({ frequency: 1 });
      
      sensorRef.current.addEventListener('reading', () => {
        const pressure = sensorRef.current.pressure;
        if (pressure) {
          addReading(pressure);
        }
      });

      sensorRef.current.addEventListener('error', (event: any) => {
        setState(prev => ({
          ...prev,
          error: `Lỗi cảm biến: ${event.error.message}`
        }));
      });

      sensorRef.current.start();

      setState(prev => ({
        ...prev,
        isSupported: true,
        isActive: true,
        error: null
      }));

      return true;
    } catch (error) {
      console.error('Barometer error:', error);
      setState(prev => ({
        ...prev,
        isSupported: false,
        error: 'Không thể khởi động cảm biến khí áp'
      }));
      return false;
    }
  }, [addReading]);

  // Stop barometer sensor
  const stopBarometer = useCallback(() => {
    if (sensorRef.current) {
      sensorRef.current.stop();
      sensorRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(prev => ({ ...prev, isActive: false }));
  }, []);

  // Simulate pressure reading from weather API
  const simulatePressureFromWeather = useCallback(async (pressure: number) => {
    addReading(pressure);
  }, [addReading]);

  // Initialize on mount
  useEffect(() => {
    const history = loadHistory();
    setState(prev => ({ ...prev, pressureHistory: history }));
    
    return () => {
      stopBarometer();
    };
  }, [loadHistory, stopBarometer]);

  return {
    ...state,
    startBarometer,
    stopBarometer,
    simulatePressureFromWeather,
    getLatestTrend: () => {
      const { pressureChange1h, pressureChange24h } = state;
      if (pressureChange1h !== null && Math.abs(pressureChange1h) > 3) {
        return pressureChange1h < 0 ? 'rapid_drop' : 'rapid_rise';
      }
      if (pressureChange24h !== null && Math.abs(pressureChange24h) > 8) {
        return pressureChange24h < 0 ? 'significant_drop' : 'significant_rise';
      }
      return 'stable';
    }
  };
}
