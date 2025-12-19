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

  // Fetch environment data (with throttling)
  const fetchEnvironment = useCallback(async (lat: number, lon: number) => {
    // Throttle: only fetch every 30 seconds minimum
    const now = Date.now();
    if (now - lastEnvFetchRef.current < 30000) {
      return;
    }
    lastEnvFetchRef.current = now;

    setEnvLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-environment-data', {
        body: { lat, lon }
      });

      if (error) throw error;

      // Use device barometer pressure if available, otherwise use API pressure
      const devicePressure = barometer.currentPressure;
      const apiPressure = data.weather?.pressure ?? null;

      setEnvironment({
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
      });

      // Feed API pressure to barometer for tracking if device doesn't have barometer
      if (!devicePressure && apiPressure) {
        barometer.simulatePressureFromWeather(apiPressure);
      }
    } catch (error) {
      console.error('Error fetching environment:', error);
    } finally {
      setEnvLoading(false);
    }
  }, [barometer]);

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

  // Start continuous GPS tracking with watchPosition
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
    
    // Record tracking start time
    const startTime = Date.now();
    setUserData(prev => ({ ...prev, trackingStartTime: startTime }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const newPoint: GPSPoint = {
          id: generateGPSId(),
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        };

        // Update GPS data first
        setUserData(prev => {
          const newHistory = [...prev.gpsHistory, newPoint].slice(-100);
          return {
            ...prev,
            gps: { lat: newPoint.lat, lon: newPoint.lon },
            gpsHistory: newHistory,
            gpsAccuracy: newPoint.accuracy,
            timestamp: Date.now()
          };
        });

        setGpsLoading(false);

        // Detect indoor/outdoor status
        const locationResult = await detectLocationType(
          newPoint.lat,
          newPoint.lon,
          newPoint.accuracy,
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
        fetchEnvironment(newPoint.lat, newPoint.lon);
      },
      (error) => {
        console.error('GPS error:', error);
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }, [generateGPSId, fetchEnvironment]);

  // Stop GPS tracking
  const stopGPSTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Get single GPS position (for initial load)
  const fetchGPS = useCallback(async (): Promise<{ lat: number; lon: number } | null> => {
    setGpsLoading(true);
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setGpsLoading(false);
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gps = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          const newPoint: GPSPoint = {
            id: generateGPSId(),
            lat: gps.lat,
            lon: gps.lon,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };
          setUserData(prev => ({
            ...prev,
            gps,
            gpsHistory: [...prev.gpsHistory, newPoint].slice(-100),
            gpsAccuracy: position.coords.accuracy,
            timestamp: Date.now()
          }));
          setGpsLoading(false);
          resolve(gps);
        },
        () => {
          setGpsLoading(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
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

  // Initialize and start continuous monitoring
  const startMonitoring = useCallback(async () => {
    setIsLoading(true);
    
    // Start device barometer sensor
    await barometer.startBarometer();
    
    // Get initial GPS
    const gps = await fetchGPS();
    
    // Fetch initial environment data
    if (gps) {
      await fetchEnvironment(gps.lat, gps.lon);
    }

    // Start continuous GPS tracking
    startGPSTracking();

    // Set up periodic environment refresh (every 2 minutes)
    refreshIntervalRef.current = setInterval(() => {
      if (userData.gps) {
        fetchEnvironment(userData.gps.lat, userData.gps.lon);
      }
    }, 120000);

    setIsLoading(false);
  }, []);

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
    };
  }, [stopGPSTracking]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    setEnvLoading(true);
    lastEnvFetchRef.current = 0; // Reset throttle
    const gps = await fetchGPS();
    if (gps) {
      await fetchEnvironment(gps.lat, gps.lon);
    }
    setEnvLoading(false);
  }, [fetchGPS, fetchEnvironment]);

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
