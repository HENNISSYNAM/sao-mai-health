import { useState, useEffect, useCallback, useRef } from 'react';
import { useBarometer } from './useBarometer';
import { supabase } from '@/integrations/supabase/client';

export type AgeGroup = '<18' | '18-35' | '36-55' | '>55';

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
  devicePressure: number | null;
  ageGroup: AgeGroup;
  timestamp: number;
}

interface UseStrokeRiskEngineProps {
  onRiskChange?: (risk: RiskAssessment) => void;
}

export function useStrokeRiskEngine({ onRiskChange }: UseStrokeRiskEngineProps = {}) {
  const [userData, setUserData] = useState<UserData>({
    phoneHash: null,
    gps: null,
    devicePressure: null,
    ageGroup: '36-55',
    timestamp: Date.now()
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

  const barometer = useBarometer();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Hash phone number for anonymization
  const hashPhone = useCallback(async (phone: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(phone + 'stroke_risk_salt');
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hash));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }, []);

  // Get GPS location
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
          setUserData(prev => ({ ...prev, gps, timestamp: Date.now() }));
          setGpsLoading(false);
          resolve(gps);
        },
        () => {
          setGpsLoading(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  // Fetch environment data
  const fetchEnvironment = useCallback(async (lat: number, lon: number) => {
    setEnvLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-environment-data', {
        body: { lat, lon }
      });

      if (error) throw error;

      setEnvironment({
        temperature: data.weather?.temperature ?? null,
        humidity: data.weather?.humidity ?? null,
        pressure: data.weather?.pressure ?? null,
        windSpeed: data.weather?.windSpeed ?? null,
        uvIndex: data.weather?.uvIndex ?? null,
        aqi: data.airQuality?.aqi ?? null,
        pm25: data.airQuality?.pm25 ?? null,
        pm10: null,
        no2: null,
        so2: null
      });

      // Feed pressure to barometer for tracking
      if (data.weather?.pressure) {
        barometer.simulatePressureFromWeather(data.weather.pressure);
      }
    } catch (error) {
      console.error('Error fetching environment:', error);
    } finally {
      setEnvLoading(false);
    }
  }, [barometer]);

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

    // Pressure drop contribution (0-25 points)
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

    // Always add base recommendations
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
  }, [userData.ageGroup, environment, barometer.pressureChange1h]);

  // Update risk when data changes
  useEffect(() => {
    const newRisk = calculateRisk();
    setRiskAssessment(newRisk);
    onRiskChange?.(newRisk);
  }, [calculateRisk, onRiskChange]);

  // Update device pressure from barometer
  useEffect(() => {
    if (barometer.currentPressure) {
      setUserData(prev => ({ ...prev, devicePressure: barometer.currentPressure }));
    }
  }, [barometer.currentPressure]);

  // Initialize and start continuous monitoring
  const startMonitoring = useCallback(async () => {
    setIsLoading(true);
    
    // Start barometer
    await barometer.startBarometer();
    
    // Get GPS
    const gps = await fetchGPS();
    
    // Fetch environment if GPS available
    if (gps) {
      await fetchEnvironment(gps.lat, gps.lon);
    }

    // Set up refresh interval (every 5 minutes)
    refreshIntervalRef.current = setInterval(async () => {
      const currentGps = userData.gps;
      if (currentGps) {
        await fetchEnvironment(currentGps.lat, currentGps.lon);
      }
    }, 5 * 60 * 1000);

    setIsLoading(false);
  }, [barometer, fetchGPS, fetchEnvironment, userData.gps]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    barometer.stopBarometer();
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, [barometer]);

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
      stopMonitoring();
    };
  }, [stopMonitoring]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    const gps = await fetchGPS();
    if (gps) {
      await fetchEnvironment(gps.lat, gps.lon);
    }
  }, [fetchGPS, fetchEnvironment]);

  return {
    userData,
    environment,
    riskAssessment,
    barometer,
    isLoading,
    gpsLoading,
    envLoading,
    startMonitoring,
    stopMonitoring,
    setAgeGroup,
    setPhone,
    refreshData,
    fetchGPS,
    fetchEnvironment
  };
}
