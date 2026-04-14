import { useState, useEffect, useCallback, useRef } from 'react';

// ============= TYPES =============
export interface SensorData {
  accelerometer: { x: number; y: number; z: number; magnitude: number } | null;
  gyroscope: { alpha: number; beta: number; gamma: number; magnitude: number } | null;
  magnetometer: { x: number; y: number; z: number; magnitude: number } | null;
  ambientLight: { lux: number } | null;
}

export interface SensorStatus {
  isSupported: boolean;
  isActive: boolean;
  error: string | null;
}

export interface HealthIndicators {
  steps: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'vigorous';
  tremorDetected: boolean;
  tremorIntensity: number; // 0-1
  balanceIssue: boolean;
  balanceScore: number; // 0-100, higher = better
  fallDetected: boolean;
}

export interface DeviceSensorsState {
  data: SensorData;
  status: {
    accelerometer: SensorStatus;
    gyroscope: SensorStatus;
    magnetometer: SensorStatus;
    ambientLight: SensorStatus;
  };
  health: HealthIndicators;
  isAnyActive: boolean;
  supportedCount: number;
}

const STORAGE_KEY = 'device_sensors_history';
const STEP_THRESHOLD = 1.2; // Acceleration threshold for step detection
const TREMOR_WINDOW = 50; // Number of readings for tremor analysis
const FALL_THRESHOLD = 25; // m/s² - sudden acceleration spike
const BALANCE_GYRO_THRESHOLD = 2.0; // rad/s - abnormal rotation

// ============= MAIN HOOK =============
export function useDeviceSensors() {
  const [state, setState] = useState<DeviceSensorsState>({
    data: { accelerometer: null, gyroscope: null, magnetometer: null, ambientLight: null },
    status: {
      accelerometer: { isSupported: false, isActive: false, error: null },
      gyroscope: { isSupported: false, isActive: false, error: null },
      magnetometer: { isSupported: false, isActive: false, error: null },
      ambientLight: { isSupported: false, isActive: false, error: null },
    },
    health: {
      steps: 0, activityLevel: 'sedentary',
      tremorDetected: false, tremorIntensity: 0,
      balanceIssue: false, balanceScore: 100,
      fallDetected: false,
    },
    isAnyActive: false,
    supportedCount: 0,
  });

  const sensorsRef = useRef<Record<string, any>>({});
  const accelHistoryRef = useRef<number[]>([]); // magnitude history for step/tremor detection
  const gyroHistoryRef = useRef<number[]>([]); // gyro magnitude for balance
  const stepCountRef = useRef(0);
  const lastStepTimeRef = useRef(0);
  const fallCooldownRef = useRef(0);
  const deviceMotionActiveRef = useRef(false);

  // Load saved step count from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const today = new Date().toDateString();
        if (parsed.date === today) {
          stepCountRef.current = parsed.steps || 0;
          setState(prev => ({
            ...prev,
            health: { ...prev.health, steps: stepCountRef.current }
          }));
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Save step count periodically
  const saveSteps = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        date: new Date().toDateString(),
        steps: stepCountRef.current,
      }));
    } catch { /* ignore */ }
  }, []);

  // Step detection from accelerometer magnitude
  const detectStep = useCallback((magnitude: number) => {
    const now = Date.now();
    // Minimum 250ms between steps (max ~4 steps/sec)
    if (magnitude > STEP_THRESHOLD + 9.81 && now - lastStepTimeRef.current > 250) {
      // Verify it's a step pattern (not just a shake)
      const history = accelHistoryRef.current;
      if (history.length >= 3) {
        const recent = history.slice(-3);
        const hasValley = recent.some(v => v < 9.5);
        if (hasValley) {
          stepCountRef.current++;
          lastStepTimeRef.current = now;
          return true;
        }
      }
    }
    return false;
  }, []);

  // Tremor detection from high-frequency oscillations
  const detectTremor = useCallback((history: number[]): { detected: boolean; intensity: number } => {
    if (history.length < TREMOR_WINDOW) return { detected: false, intensity: 0 };
    
    const recent = history.slice(-TREMOR_WINDOW);
    // Calculate zero-crossing rate (tremor = rapid oscillations around mean)
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    let crossings = 0;
    for (let i = 1; i < recent.length; i++) {
      if ((recent[i] - mean) * (recent[i - 1] - mean) < 0) crossings++;
    }
    
    // Tremor frequency: 4-12 Hz typical for Parkinson's
    // At 5Hz sampling, crossings > 4 in 50 samples suggests tremor
    const crossingRate = crossings / recent.length;
    const detected = crossingRate > 0.15 && crossingRate < 0.6;
    const intensity = Math.min(1, crossingRate / 0.6);
    
    return { detected, intensity: detected ? intensity : 0 };
  }, []);

  // Balance assessment from gyroscope
  const assessBalance = useCallback((gyroHistory: number[]): { issue: boolean; score: number } => {
    if (gyroHistory.length < 10) return { issue: false, score: 100 };
    
    const recent = gyroHistory.slice(-20);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance = recent.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recent.length;
    const stdDev = Math.sqrt(variance);
    
    // High variance in rotation = poor balance
    const issue = stdDev > BALANCE_GYRO_THRESHOLD || recent.some(v => v > 5);
    const score = Math.max(0, Math.min(100, 100 - stdDev * 20));
    
    return { issue, score: Math.round(score) };
  }, []);

  // Activity level from step rate
  const getActivityLevel = useCallback((steps: number): DeviceSensorsState['health']['activityLevel'] => {
    // Based on steps in last ~5 minutes
    const stepsPerMinute = steps / Math.max(1, (Date.now() - lastStepTimeRef.current) / 60000);
    if (stepsPerMinute > 130) return 'vigorous';
    if (stepsPerMinute > 80) return 'moderate';
    if (stepsPerMinute > 30) return 'light';
    return 'sedentary';
  }, []);

  // Process accelerometer reading
  const processAccelerometer = useCallback((x: number, y: number, z: number) => {
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    
    accelHistoryRef.current.push(magnitude);
    if (accelHistoryRef.current.length > 200) accelHistoryRef.current = accelHistoryRef.current.slice(-200);
    
    // Step detection
    const stepped = detectStep(magnitude);
    
    // Fall detection
    const now = Date.now();
    let fallDetected = false;
    if (magnitude > FALL_THRESHOLD && now - fallCooldownRef.current > 5000) {
      fallDetected = true;
      fallCooldownRef.current = now;
    }
    
    // Tremor detection
    const tremor = detectTremor(accelHistoryRef.current);
    
    const steps = stepCountRef.current;
    if (stepped) saveSteps();
    
    setState(prev => ({
      ...prev,
      data: { ...prev.data, accelerometer: { x, y, z, magnitude } },
      health: {
        ...prev.health,
        steps,
        activityLevel: getActivityLevel(steps),
        tremorDetected: tremor.detected,
        tremorIntensity: tremor.intensity,
        fallDetected: fallDetected || prev.health.fallDetected,
      }
    }));
  }, [detectStep, detectTremor, getActivityLevel, saveSteps]);

  // Process gyroscope reading
  const processGyroscope = useCallback((alpha: number, beta: number, gamma: number) => {
    const magnitude = Math.sqrt(alpha * alpha + beta * beta + gamma * gamma);
    
    gyroHistoryRef.current.push(magnitude);
    if (gyroHistoryRef.current.length > 100) gyroHistoryRef.current = gyroHistoryRef.current.slice(-100);
    
    const balance = assessBalance(gyroHistoryRef.current);
    
    setState(prev => ({
      ...prev,
      data: { ...prev.data, gyroscope: { alpha, beta, gamma, magnitude } },
      health: {
        ...prev.health,
        balanceIssue: balance.issue,
        balanceScore: balance.score,
      }
    }));
  }, [assessBalance]);

  // Start Generic Sensor API sensors
  const startGenericSensors = useCallback(() => {
    const results: Record<string, SensorStatus> = {};
    
    // Accelerometer
    if ('Accelerometer' in window) {
      try {
        const sensor = new (window as any).Accelerometer({ frequency: 5 });
        sensor.addEventListener('reading', () => {
          processAccelerometer(sensor.x, sensor.y, sensor.z);
        });
        sensor.addEventListener('error', (e: any) => {
          setState(prev => ({
            ...prev,
            status: { ...prev.status, accelerometer: { ...prev.status.accelerometer, error: e.error?.message || 'Error' } }
          }));
        });
        sensor.start();
        sensorsRef.current.accelerometer = sensor;
        results.accelerometer = { isSupported: true, isActive: true, error: null };
      } catch {
        results.accelerometer = { isSupported: false, isActive: false, error: 'Không thể khởi động' };
      }
    }
    
    // Gyroscope
    if ('Gyroscope' in window) {
      try {
        const sensor = new (window as any).Gyroscope({ frequency: 5 });
        sensor.addEventListener('reading', () => {
          processGyroscope(sensor.x, sensor.y, sensor.z);
        });
        sensor.start();
        sensorsRef.current.gyroscope = sensor;
        results.gyroscope = { isSupported: true, isActive: true, error: null };
      } catch {
        results.gyroscope = { isSupported: false, isActive: false, error: 'Không thể khởi động' };
      }
    }
    
    // Magnetometer
    if ('Magnetometer' in window) {
      try {
        const sensor = new (window as any).Magnetometer({ frequency: 1 });
        sensor.addEventListener('reading', () => {
          const x = sensor.x, y = sensor.y, z = sensor.z;
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          setState(prev => ({
            ...prev,
            data: { ...prev.data, magnetometer: { x, y, z, magnitude } }
          }));
        });
        sensor.start();
        sensorsRef.current.magnetometer = sensor;
        results.magnetometer = { isSupported: true, isActive: true, error: null };
      } catch {
        results.magnetometer = { isSupported: false, isActive: false, error: 'Không thể khởi động' };
      }
    }
    
    // AmbientLightSensor
    if ('AmbientLightSensor' in window) {
      try {
        const sensor = new (window as any).AmbientLightSensor({ frequency: 1 });
        sensor.addEventListener('reading', () => {
          setState(prev => ({
            ...prev,
            data: { ...prev.data, ambientLight: { lux: sensor.illuminance } }
          }));
        });
        sensor.start();
        sensorsRef.current.ambientLight = sensor;
        results.ambientLight = { isSupported: true, isActive: true, error: null };
      } catch {
        results.ambientLight = { isSupported: false, isActive: false, error: 'Không thể khởi động' };
      }
    }
    
    return results;
  }, [processAccelerometer, processGyroscope]);

  // Fallback: DeviceMotion API for accelerometer + gyroscope
  const startDeviceMotionFallback = useCallback(() => {
    if (deviceMotionActiveRef.current) return;
    
    const handler = (event: DeviceMotionEvent) => {
      // Accelerometer from accelerationIncludingGravity
      const accel = event.accelerationIncludingGravity;
      if (accel && accel.x != null && accel.y != null && accel.z != null) {
        processAccelerometer(accel.x, accel.y, accel.z);
      }
      
      // Gyroscope from rotationRate
      const rotation = event.rotationRate;
      if (rotation && rotation.alpha != null && rotation.beta != null && rotation.gamma != null) {
        // Convert deg/s to rad/s
        processGyroscope(
          rotation.alpha * Math.PI / 180,
          rotation.beta * Math.PI / 180,
          rotation.gamma * Math.PI / 180
        );
      }
    };
    
    window.addEventListener('devicemotion', handler);
    deviceMotionActiveRef.current = true;
    sensorsRef.current.deviceMotionHandler = handler;
    
    return {
      accelerometer: { isSupported: true, isActive: true, error: null } as SensorStatus,
      gyroscope: { isSupported: true, isActive: true, error: null } as SensorStatus,
    };
  }, [processAccelerometer, processGyroscope]);

  // Start all sensors
  const startAll = useCallback(async () => {
    // Request permission on iOS
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission !== 'granted') {
          console.warn('DeviceMotion permission denied');
        }
      } catch { /* ignore */ }
    }
    
    // Try Generic Sensor API first
    const genericResults = startGenericSensors();
    
    // Use DeviceMotion fallback for unsupported sensors
    let fallbackResults: Record<string, SensorStatus> = {};
    const needsAccelFallback = !genericResults.accelerometer?.isActive;
    const needsGyroFallback = !genericResults.gyroscope?.isActive;
    
    if (needsAccelFallback || needsGyroFallback) {
      fallbackResults = startDeviceMotionFallback() || {};
    }
    
    // Merge results
    const finalStatus = {
      accelerometer: genericResults.accelerometer || fallbackResults.accelerometer || { isSupported: false, isActive: false, error: 'Không hỗ trợ' },
      gyroscope: genericResults.gyroscope || fallbackResults.gyroscope || { isSupported: false, isActive: false, error: 'Không hỗ trợ' },
      magnetometer: genericResults.magnetometer || { isSupported: false, isActive: false, error: 'Không hỗ trợ' },
      ambientLight: genericResults.ambientLight || { isSupported: false, isActive: false, error: 'Không hỗ trợ' },
    };
    
    const supportedCount = Object.values(finalStatus).filter(s => s.isSupported).length;
    const isAnyActive = Object.values(finalStatus).some(s => s.isActive);
    
    setState(prev => ({
      ...prev,
      status: finalStatus,
      isAnyActive,
      supportedCount,
    }));
    
    console.log(`[SENSORS] Started ${supportedCount} sensors`);
  }, [startGenericSensors, startDeviceMotionFallback]);

  // Stop all sensors
  const stopAll = useCallback(() => {
    // Stop Generic Sensor API sensors
    ['accelerometer', 'gyroscope', 'magnetometer', 'ambientLight'].forEach(key => {
      if (sensorsRef.current[key]) {
        try { sensorsRef.current[key].stop(); } catch { /* ignore */ }
        sensorsRef.current[key] = null;
      }
    });
    
    // Stop DeviceMotion fallback
    if (sensorsRef.current.deviceMotionHandler) {
      window.removeEventListener('devicemotion', sensorsRef.current.deviceMotionHandler);
      sensorsRef.current.deviceMotionHandler = null;
      deviceMotionActiveRef.current = false;
    }
    
    setState(prev => ({
      ...prev,
      status: {
        accelerometer: { ...prev.status.accelerometer, isActive: false },
        gyroscope: { ...prev.status.gyroscope, isActive: false },
        magnetometer: { ...prev.status.magnetometer, isActive: false },
        ambientLight: { ...prev.status.ambientLight, isActive: false },
      },
      isAnyActive: false,
    }));
  }, []);

  // Reset fall detection flag
  const resetFallAlert = useCallback(() => {
    setState(prev => ({
      ...prev,
      health: { ...prev.health, fallDetected: false }
    }));
  }, []);

  // Reset step counter
  const resetSteps = useCallback(() => {
    stepCountRef.current = 0;
    setState(prev => ({
      ...prev,
      health: { ...prev.health, steps: 0 }
    }));
    saveSteps();
  }, [saveSteps]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopAll(); };
  }, [stopAll]);

  return {
    ...state,
    startAll,
    stopAll,
    resetFallAlert,
    resetSteps,
  };
}
