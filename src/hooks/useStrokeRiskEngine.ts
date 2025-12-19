import { useState, useEffect, useCallback, useRef } from 'react';
import { useBarometer } from './useBarometer';
import { supabase } from '@/integrations/supabase/client';

export type AgeGroup = '<18' | '18-35' | '36-55' | '>55';

export interface GPSPoint {
  id: string;
  lat: number;
  lon: number;
  accuracy: number;
  timestamp: number;
  label?: string;
}

export interface EnvironmentData {
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  windSpeed: number | null;
  uvIndex: number | null;
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
}

export interface RiskAssessment {
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  primary_factors: string[];
  recommendations: {
    do: string[];
    avoid: string[];
  };
  visual_state: {
    map: 'normal' | 'heatmap_active';
    alerts: boolean;
  };
}

export interface UserData {
  phoneHash: string | null;
  gps: { lat: number; lon: number } | null;
  gpsHistory: GPSPoint[];
  devicePressure: number | null;
  ageGroup: AgeGroup;
  timestamp: number;
  gpsAccuracy: number | null;
  outdoorMinutes: number; // Time spent outdoor based on GPS tracking
  trackingStartTime: number | null;
  isOutdoor: boolean; // AI-detected indoor/outdoor status
  locationConfidence: number; // Confidence of indoor/outdoor detection
  safeOutdoorMinutes: number; // Safe time limit based on environment
  outdoorWarning: string | null; // Warning message when exceeding safe time
}

interface UseStrokeRiskEngineProps {
  onRiskChange?: (risk: RiskAssessment) => void;
}

export function useStrokeRiskEngine({ onRiskChange }: UseStrokeRiskEngineProps = {}) {
  const [userData, setUserData] = useState<UserData>({
    phoneHash: null,
    gps: null,
    gpsHistory: [],
    devicePressure: null,
    ageGroup: '36-55',
    timestamp: Date.now(),
    gpsAccuracy: null,
    outdoorMinutes: 0,
    trackingStartTime: null,
    isOutdoor: true,
    locationConfidence: 50,
    safeOutdoorMinutes: 120,
    outdoorWarning: null
  });
  
  const [environment, setEnvironment] = useState<EnvironmentData>({
    temperature: null,
    humidity: null,
    pressure: null,
    windSpeed: null,
    uvIndex: null,
    aqi: null,
    pm25: null,
    pm10: null,
    no2: null,
    so2: null
  });

  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment>({
    risk_score: 0,
    risk_level: 'LOW',
    primary_factors: [],
    recommendations: { do: [], avoid: [] },
    visual_state: { map: 'normal', alerts: false }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [envLoading, setEnvLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  const barometer = useBarometer();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastEnvFetchRef = useRef<number>(0);
  const lastLocationCheckRef = useRef<number>(0);
  const outdoorStartTimeRef = useRef<number | null>(null);
  const hasShownWarningRef = useRef<boolean>(false);
  const envCacheRef = useRef<{ data: EnvironmentData; timestamp: number; lat: number; lon: number } | null>(null);
  const ENV_CACHE_DURATION = 60000; // 1 minute cache
  const ENV_DISTANCE_THRESHOLD = 0.01; // ~1km - refetch if moved more than this

  // Hash phone number for anonymization
  const hashPhone = useCallback(async (phone: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(phone + 'stroke_risk_salt');
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hash));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }, []);

  // Generate unique ID for GPS point
  const generateGPSId = useCallback(() => {
    return `gps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Check if should use cached environment data
  const shouldUseCachedEnv = useCallback((lat: number, lon: number): boolean => {
    const cache = envCacheRef.current;
    if (!cache) return false;
    
    const now = Date.now();
    const isRecent = now - cache.timestamp < ENV_CACHE_DURATION;
    const distance = Math.sqrt(
      Math.pow(lat - cache.lat, 2) + Math.pow(lon - cache.lon, 2)
    );
    const isNearby = distance < ENV_DISTANCE_THRESHOLD;
    
    return isRecent && isNearby;
  }, []);

  // Fetch environment data - OPTIMIZED with caching and smart throttling
  const fetchEnvironment = useCallback(async (lat: number, lon: number, forceRefresh = false) => {
    const now = Date.now();
    
    // Check cache first (skip if force refresh)
    if (!forceRefresh && shouldUseCachedEnv(lat, lon)) {
      const cache = envCacheRef.current!;
      // Apply device barometer pressure if available
      const devicePressure = barometer.currentPressure;
      setEnvironment({
        ...cache.data,
        pressure: devicePressure || cache.data.pressure
      });
      return;
    }

    // Throttle: only fetch every 20 seconds minimum
    if (!forceRefresh && now - lastEnvFetchRef.current < 20000) {
      return;
    }
    lastEnvFetchRef.current = now;

    setEnvLoading(true);
    
    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

      const { data, error } = await supabase.functions.invoke('fetch-environment-data', {
        body: { lat, lon }
      });

      clearTimeout(timeoutId);

      if (error) throw error;

      // Use device barometer pressure if available, otherwise use API pressure
      const devicePressure = barometer.currentPressure;
      const apiPressure = data.weather?.pressure ?? null;

      const envData: EnvironmentData = {
        temperature: data.weather?.temperature ?? null,
        humidity: data.weather?.humidity ?? null,
        pressure: devicePressure || apiPressure,
        windSpeed: data.weather?.windSpeed ?? null,
        uvIndex: data.weather?.uvIndex ?? null,
        aqi: data.airQuality?.aqi ?? null,
        pm25: data.airQuality?.pm25 ?? null,
        pm10: data.airQuality?.pm10 ?? null,
        no2: data.airQuality?.no2 ?? null,
        so2: data.airQuality?.so2 ?? null
      };

      // Update cache
      envCacheRef.current = {
        data: envData,
        timestamp: now,
        lat,
        lon
      };

      setEnvironment(envData);

      // Feed API pressure to barometer for tracking if device doesn't have barometer
      if (!devicePressure && apiPressure) {
        barometer.simulatePressureFromWeather(apiPressure);
      }
    } catch (error) {
      console.error('Error fetching environment:', error);
      // If fetch fails but we have cache, use it
      if (envCacheRef.current) {
        const devicePressure = barometer.currentPressure;
        setEnvironment({
          ...envCacheRef.current.data,
          pressure: devicePressure || envCacheRef.current.data.pressure
        });
      }
    } finally {
      setEnvLoading(false);
    }
  }, [barometer, shouldUseCachedEnv]);

  // Detect if user is indoor or outdoor using AI
  const detectLocationType = useCallback(async (lat: number, lon: number, gpsAccuracy: number | null, gpsHistory: GPSPoint[]) => {
    // Throttle: only check every 60 seconds minimum
    const now = Date.now();
    if (now - lastLocationCheckRef.current < 60000) {
      return null;
    }
    lastLocationCheckRef.current = now;

    try {
      const { data, error } = await supabase.functions.invoke('detect-location-type', {
        body: {
          locationData: {
            lat,
            lon,
            gpsAccuracy,
            gpsHistory: gpsHistory.slice(-10),
            environment: {
              temperature: environment.temperature,
              humidity: environment.humidity,
              aqi: environment.aqi
            }
          }
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error detecting location type:', error);
      return null;
    }
  }, [environment]);

  // Kalman filter for GPS smoothing
  const kalmanFilterRef = useRef({
    lat: { estimate: 0, errorEstimate: 1, errorMeasure: 0.00001 },
    lon: { estimate: 0, errorEstimate: 1, errorMeasure: 0.00001 },
    initialized: false
  });

  // Apply Kalman filter to smooth GPS readings
  const applyKalmanFilter = useCallback((lat: number, lon: number, accuracy: number) => {
    const filter = kalmanFilterRef.current;
    
    // Adjust error based on accuracy (higher accuracy = lower error)
    const errorFromAccuracy = accuracy / 100000;
    
    if (!filter.initialized) {
      filter.lat.estimate = lat;
      filter.lon.estimate = lon;
      filter.lat.errorEstimate = errorFromAccuracy;
      filter.lon.errorEstimate = errorFromAccuracy;
      filter.initialized = true;
      return { lat, lon };
    }
    
    // Kalman gain
    const latGain = filter.lat.errorEstimate / (filter.lat.errorEstimate + errorFromAccuracy);
    const lonGain = filter.lon.errorEstimate / (filter.lon.errorEstimate + errorFromAccuracy);
    
    // Update estimates
    filter.lat.estimate = filter.lat.estimate + latGain * (lat - filter.lat.estimate);
    filter.lon.estimate = filter.lon.estimate + lonGain * (lon - filter.lon.estimate);
    
    // Update error estimates
    filter.lat.errorEstimate = (1 - latGain) * filter.lat.errorEstimate;
    filter.lon.errorEstimate = (1 - lonGain) * filter.lon.errorEstimate;
    
    return {
      lat: filter.lat.estimate,
      lon: filter.lon.estimate
    };
  }, []);

  // Request wake lock to prevent device sleep during tracking
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('Wake Lock acquired for GPS tracking');
      }
    } catch (err) {
      console.log('Wake Lock not available:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
      console.log('Wake Lock released');
    }
  }, []);

  // Start continuous GPS tracking with maximum accuracy
  const startGPSTracking = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setGpsLoading(true);
    setIsTracking(true);
    
    // Request wake lock for continuous tracking
    requestWakeLock();
    
    // Reset Kalman filter
    kalmanFilterRef.current.initialized = false;
    
    // Record tracking start time
    const startTime = Date.now();
    setUserData(prev => ({ ...prev, trackingStartTime: startTime }));

    // Track best accuracy achieved
    let bestAccuracy = Infinity;
    let consecutiveGoodReadings = 0;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const rawLat = position.coords.latitude;
        const rawLon = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        const speed = position.coords.speed; // m/s
        const heading = position.coords.heading; // degrees
        const altitude = position.coords.altitude;
        const altitudeAccuracy = position.coords.altitudeAccuracy;
        
        // Update best accuracy
        if (accuracy < bestAccuracy) {
          bestAccuracy = accuracy;
        }

        // Filter out very inaccurate readings (> 500m)
        // But still accept them if we haven't got any good readings yet
        if (accuracy > 500 && bestAccuracy < 200) {
          console.log('Skipping inaccurate GPS reading:', accuracy, 'm');
          return;
        }

        // Apply Kalman filter for smoothing
        const smoothed = applyKalmanFilter(rawLat, rawLon, accuracy);
        
        // Calculate effective accuracy (improved by filtering)
        const effectiveAccuracy = Math.min(accuracy, bestAccuracy * 1.2);
        
        // Track consecutive good readings for confidence
        if (accuracy < 50) {
          consecutiveGoodReadings++;
        } else {
          consecutiveGoodReadings = Math.max(0, consecutiveGoodReadings - 1);
        }

        const newPoint: GPSPoint = {
          id: generateGPSId(),
          lat: smoothed.lat,
          lon: smoothed.lon,
          accuracy: effectiveAccuracy,
          timestamp: Date.now(),
          label: speed !== null ? `${(speed * 3.6).toFixed(1)} km/h` : undefined
        };

        // Update GPS data with enhanced metadata
        setUserData(prev => {
          const newHistory = [...prev.gpsHistory, newPoint].slice(-100);
          return {
            ...prev,
            gps: { lat: smoothed.lat, lon: smoothed.lon },
            gpsHistory: newHistory,
            gpsAccuracy: effectiveAccuracy,
            timestamp: Date.now()
          };
        });

        setGpsLoading(false);

        // Detect indoor/outdoor status
        const locationResult = await detectLocationType(
          smoothed.lat,
          smoothed.lon,
          effectiveAccuracy,
          userData.gpsHistory
        );

        if (locationResult) {
          const isOutdoor = locationResult.shouldCountOutdoorTime;
          
          setUserData(prev => {
            let newOutdoorMinutes = prev.outdoorMinutes;
            
            // Only count outdoor time when detected as outdoor
            if (isOutdoor) {
              // Start counting if just went outdoor
              if (!outdoorStartTimeRef.current) {
                outdoorStartTimeRef.current = Date.now();
              }
              newOutdoorMinutes = Math.floor((Date.now() - outdoorStartTimeRef.current) / 60000);
            } else {
              // Stop counting when indoor, but keep accumulated time
              outdoorStartTimeRef.current = null;
            }

            // Check if exceeding safe outdoor time and show warning
            const exceedingSafeTime = newOutdoorMinutes >= locationResult.safeOutdoorMinutes;
            if (exceedingSafeTime && !hasShownWarningRef.current && locationResult.outdoorWarning) {
              hasShownWarningRef.current = true;
              // Dispatch custom event for notification
              window.dispatchEvent(new CustomEvent('outdoor-time-warning', {
                detail: {
                  minutes: newOutdoorMinutes,
                  safeMinutes: locationResult.safeOutdoorMinutes,
                  warning: locationResult.outdoorWarning
                }
              }));
            }
            
            // Reset warning flag if back under safe time
            if (newOutdoorMinutes < locationResult.safeOutdoorMinutes) {
              hasShownWarningRef.current = false;
            }
            
            return {
              ...prev,
              isOutdoor,
              locationConfidence: locationResult.confidence,
              safeOutdoorMinutes: locationResult.safeOutdoorMinutes,
              outdoorWarning: exceedingSafeTime ? locationResult.outdoorWarning : null,
              outdoorMinutes: newOutdoorMinutes
            };
          });
        }

        // Fetch environment data for new position
        fetchEnvironment(smoothed.lat, smoothed.lon);
      },
      (error) => {
        console.error('GPS error:', error);
        setGpsLoading(false);
        
        // Try fallback to lower accuracy if high accuracy fails
        if (error.code === error.TIMEOUT && watchIdRef.current !== null) {
          console.log('Retrying with lower accuracy threshold...');
        }
      },
      {
        // Maximum accuracy settings
        enableHighAccuracy: true,
        timeout: 30000, // Increased timeout for better accuracy
        maximumAge: 0 // Always get fresh position, never use cached
      }
    );
  }, [generateGPSId, fetchEnvironment, applyKalmanFilter, requestWakeLock]);

  // Stop GPS tracking
  const stopGPSTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    // Release wake lock
    releaseWakeLock();
    setIsTracking(false);
  }, [releaseWakeLock]);

  // Get single GPS position with maximum accuracy (multiple attempts)
  const fetchGPS = useCallback(async (): Promise<{ lat: number; lon: number } | null> => {
    setGpsLoading(true);
    
    // Try multiple times to get best accuracy
    const attemptGPS = (attempt: number): Promise<GeolocationPosition | null> => {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position),
          () => resolve(null),
          { 
            enableHighAccuracy: true, 
            timeout: attempt === 1 ? 30000 : 10000, // Longer timeout on first attempt
            maximumAge: 0 
          }
        );
      });
    };
    
    if (!navigator.geolocation) {
      setGpsLoading(false);
      return null;
    }

    let bestPosition: GeolocationPosition | null = null;
    let bestAccuracy = Infinity;

    // Try up to 3 times to get best accuracy
    for (let i = 0; i < 3; i++) {
      const position = await attemptGPS(i + 1);
      if (position && position.coords.accuracy < bestAccuracy) {
        bestAccuracy = position.coords.accuracy;
        bestPosition = position;
        
        // If we got very good accuracy, stop trying
        if (bestAccuracy < 20) break;
      }
      
      // Small delay between attempts
      if (i < 2) await new Promise(r => setTimeout(r, 500));
    }

    if (!bestPosition) {
      setGpsLoading(false);
      return null;
    }

    const gps = {
      lat: bestPosition.coords.latitude,
      lon: bestPosition.coords.longitude
    };
    const newPoint: GPSPoint = {
      id: generateGPSId(),
      lat: gps.lat,
      lon: gps.lon,
      accuracy: bestPosition.coords.accuracy,
      timestamp: Date.now()
    };
    
    setUserData(prev => ({
      ...prev,
      gps,
      gpsHistory: [...prev.gpsHistory, newPoint].slice(-100),
      gpsAccuracy: bestPosition!.coords.accuracy,
      timestamp: Date.now()
    }));
    
    setGpsLoading(false);
    return gps;
  }, [generateGPSId]);

  // Add external GPS point (for multi-user tracking)
  const addExternalGPSPoint = useCallback((point: Omit<GPSPoint, 'id' | 'timestamp'>) => {
    const newPoint: GPSPoint = {
      ...point,
      id: generateGPSId(),
      timestamp: Date.now()
    };
    setUserData(prev => ({
      ...prev,
      gpsHistory: [...prev.gpsHistory, newPoint].slice(-100)
    }));
  }, [generateGPSId]);

  // Calculate risk score (0-100)
  const calculateRisk = useCallback((): RiskAssessment => {
    let score = 0;
    const factors: string[] = [];
    const doRecommendations: string[] = [];
    const avoidRecommendations: string[] = [];

    // Age factor (base risk)
    const ageMultiplier = {
      '<18': 0.5,
      '18-35': 0.7,
      '36-55': 1.0,
      '>55': 1.4
    };
    const ageFactor = ageMultiplier[userData.ageGroup];

    // Outdoor exposure time contribution (0-20 points)
    const outdoorMins = userData.outdoorMinutes;
    if (outdoorMins > 0) {
      // Combine with air quality for exposure risk
      const aqiMultiplier = environment.aqi ? Math.min(environment.aqi / 100, 2) : 1;
      
      if (outdoorMins > 120) { // > 2 hours
        score += Math.round(20 * aqiMultiplier);
        factors.push(`Ngoài trời ${Math.floor(outdoorMins / 60)}h`);
        avoidRecommendations.push('Nên vào trong nhà nghỉ ngơi');
      } else if (outdoorMins > 60) { // > 1 hour
        score += Math.round(12 * aqiMultiplier);
        factors.push(`Ngoài trời ${outdoorMins} phút`);
        doRecommendations.push('Tìm nơi nghỉ chân thoáng mát');
      } else if (outdoorMins > 30) {
        score += Math.round(5 * aqiMultiplier);
      }
    }

    // PM2.5 contribution (0-30 points)
    if (environment.pm25 !== null) {
      if (environment.pm25 > 150) {
        score += 30;
        factors.push('PM2.5 spike');
        avoidRecommendations.push('Tránh ra ngoài trời');
      } else if (environment.pm25 > 100) {
        score += 20;
        factors.push('Chất lượng không khí kém');
        avoidRecommendations.push('Hạn chế hoạt động ngoài trời');
      } else if (environment.pm25 > 50) {
        score += 10;
      }
    }

    // AQI contribution (0-25 points)
    if (environment.aqi !== null) {
      if (environment.aqi > 200) {
        score += 25;
        factors.push('AQI nguy hiểm');
      } else if (environment.aqi > 150) {
        score += 18;
      } else if (environment.aqi > 100) {
        score += 10;
      }
    }

    // Pressure drop contribution - use device barometer if available (0-25 points)
    const pressureChange = barometer.pressureChange1h;
    if (pressureChange !== null) {
      if (pressureChange < -5) {
        score += 25;
        factors.push('Áp suất giảm đột ngột');
        doRecommendations.push('Nghỉ ngơi, theo dõi sức khỏe');
      } else if (pressureChange < -3) {
        score += 15;
        factors.push('Áp suất thay đổi nhanh');
      } else if (pressureChange < -2) {
        score += 8;
      }
    }

    // Temperature stress (0-15 points)
    if (environment.temperature !== null) {
      if (environment.temperature > 38 || environment.temperature < 10) {
        score += 15;
        factors.push('Nhiệt độ cực đoan');
        avoidRecommendations.push('Tránh tiếp xúc nhiệt độ quá lâu');
        doRecommendations.push('Uống đủ nước');
      } else if (environment.temperature > 35 || environment.temperature < 15) {
        score += 8;
        doRecommendations.push('Uống nước thường xuyên');
      }
    }

    // Humidity stress (0-10 points)
    if (environment.humidity !== null) {
      if (environment.humidity > 90 || environment.humidity < 20) {
        score += 10;
      } else if (environment.humidity > 80 || environment.humidity < 30) {
        score += 5;
      }
    }

    // Apply age multiplier
    score = Math.round(score * ageFactor);
    score = Math.min(100, Math.max(0, score));

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    if (score >= 61) {
      riskLevel = 'HIGH';
      if (!doRecommendations.includes('Nghỉ ngơi, theo dõi sức khỏe')) {
        doRecommendations.push('Nghỉ ngơi tại nơi thoáng mát');
      }
      if (!avoidRecommendations.includes('Tránh vận động mạnh')) {
        avoidRecommendations.push('Tránh vận động mạnh');
      }
    } else if (score >= 31) {
      riskLevel = 'MEDIUM';
      if (!doRecommendations.includes('Uống nước thường xuyên')) {
        doRecommendations.push('Uống nước thường xuyên');
      }
    } else {
      riskLevel = 'LOW';
      doRecommendations.push('Duy trì lối sống lành mạnh');
    }

    if (doRecommendations.length === 0) {
      doRecommendations.push('Duy trì lối sống lành mạnh');
    }

    return {
      risk_score: score,
      risk_level: riskLevel,
      primary_factors: factors.length > 0 ? factors : ['Điều kiện bình thường'],
      recommendations: {
        do: doRecommendations.slice(0, 4),
        avoid: avoidRecommendations.slice(0, 4)
      },
      visual_state: {
        map: score >= 31 ? 'heatmap_active' : 'normal',
        alerts: score >= 31
      }
    };
  }, [userData.ageGroup, userData.outdoorMinutes, environment, barometer.pressureChange1h]);

  // Update risk when data changes
  useEffect(() => {
    const newRisk = calculateRisk();
    setRiskAssessment(newRisk);
  }, [userData.ageGroup, userData.outdoorMinutes, environment.aqi, environment.pm25, environment.temperature, environment.humidity, barometer.pressureChange1h]);

  // Update device pressure from barometer
  useEffect(() => {
    if (barometer.currentPressure) {
      setUserData(prev => ({ ...prev, devicePressure: barometer.currentPressure }));
      // Update environment pressure with device barometer
      setEnvironment(prev => ({
        ...prev,
        pressure: barometer.currentPressure
      }));
    }
  }, [barometer.currentPressure]);

  // Initialize and start continuous monitoring - ULTRA OPTIMIZED for fastest startup
  const startMonitoring = useCallback(async () => {
    setIsLoading(true);
    
    // Start barometer immediately (non-blocking)
    barometer.startBarometer();
    
    // Try to use cached environment data immediately
    const cachedEnv = envCacheRef.current;
    if (cachedEnv && Date.now() - cachedEnv.timestamp < ENV_CACHE_DURATION * 2) {
      const devicePressure = barometer.currentPressure;
      setEnvironment({
        ...cachedEnv.data,
        pressure: devicePressure || cachedEnv.data.pressure
      });
      console.log('Using cached environment data for instant display');
    }
    
    // Start GPS tracking immediately
    startGPSTracking();
    
    // UI can render NOW - data will update in background
    setIsLoading(false);
    
    // Quick GPS with very short timeout for fast initial data
    const getQuickGPS = (): Promise<{ lat: number; lon: number } | null> => {
      return new Promise((resolve) => {
        // Try cached position first (instant)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          },
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 2000, maximumAge: 300000 } // Allow 5 min cached, low accuracy first
        );
        
        // Fallback timeout
        setTimeout(() => resolve(null), 2500);
      });
    };
    
    // Fetch environment data in background
    getQuickGPS().then(gps => {
      if (gps) {
        fetchEnvironment(gps.lat, gps.lon);
        // Also update userData with GPS
        setUserData(prev => ({
          ...prev,
          gps: { lat: gps.lat, lon: gps.lon },
          timestamp: Date.now()
        }));
      }
    });

    // Set up periodic environment refresh (every 90 seconds instead of 2 min)
    refreshIntervalRef.current = setInterval(() => {
      if (userData.gps) {
        fetchEnvironment(userData.gps.lat, userData.gps.lon);
      }
    }, 90000);
  }, [barometer, startGPSTracking, fetchEnvironment, userData.gps]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    stopGPSTracking();
    barometer.stopBarometer();
  }, [stopGPSTracking, barometer]);

  // Set age group
  const setAgeGroup = useCallback((ageGroup: AgeGroup) => {
    setUserData(prev => ({ ...prev, ageGroup }));
  }, []);

  // Set phone (hashed)
  const setPhone = useCallback(async (phone: string) => {
    if (phone) {
      const hash = await hashPhone(phone);
      setUserData(prev => ({ ...prev, phoneHash: hash }));
    } else {
      setUserData(prev => ({ ...prev, phoneHash: null }));
    }
  }, [hashPhone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      stopGPSTracking();
      releaseWakeLock();
    };
  }, [stopGPSTracking, releaseWakeLock]);

  // Refresh all data - OPTIMIZED
  const refreshData = useCallback(async () => {
    setEnvLoading(true);
    lastEnvFetchRef.current = 0; // Reset throttle
    
    // Use current GPS if available, otherwise fetch
    const currentGps = userData.gps;
    if (currentGps) {
      await fetchEnvironment(currentGps.lat, currentGps.lon, true); // Force refresh
    } else {
      const gps = await fetchGPS();
      if (gps) {
        await fetchEnvironment(gps.lat, gps.lon, true);
      }
    }
    setEnvLoading(false);
  }, [fetchGPS, fetchEnvironment, userData.gps]);

  return {
    userData,
    environment,
    riskAssessment,
    barometer,
    isLoading,
    gpsLoading,
    envLoading,
    isTracking,
    startMonitoring,
    stopMonitoring,
    startGPSTracking,
    stopGPSTracking,
    setAgeGroup,
    setPhone,
    refreshData,
    fetchGPS,
    fetchEnvironment,
    addExternalGPSPoint
  };
}
