import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EnvironmentData {
  timestamp: string;
  location: { lat: number; lon: number };
  sources: {
    weather: string;
    airQuality: string;
  };
  weather: {
    temperature: number | null;
    humidity: number | null;
    pressure: number | null;
    windSpeed: number | null;
    uvIndex: number | null;
  } | null;
  airQuality: {
    aqi: number | null;
    pm25: number | null;
    pm10: number | null;
    no2: number | null;
    so2: number | null;
    co: number | null;
    o3: number | null;
    mainPollutant: string;
  };
  fetchTimeMs: number;
}

export interface EnvironmentHealthImpact {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  factors: {
    name: string;
    value: number | string;
    impact: 'positive' | 'neutral' | 'negative' | 'dangerous';
    description: string;
  }[];
  recommendations: string[];
}

// Calculate health impact from environment data
export function calculateEnvironmentHealthImpact(
  env: EnvironmentData | null,
  userProfile?: {
    chronicConditions?: string[];
    allergies?: string[];
    age?: number;
  }
): EnvironmentHealthImpact | null {
  if (!env) return null;

  const factors: EnvironmentHealthImpact['factors'] = [];
  let totalRisk = 0;
  const recommendations: string[] = [];

  // Temperature impact
  if (env.weather?.temperature !== null) {
    const temp = env.weather.temperature;
    let tempImpact: 'positive' | 'neutral' | 'negative' | 'dangerous' = 'neutral';
    let tempRisk = 0;
    
    if (temp >= 35) {
      tempImpact = 'dangerous';
      tempRisk = 25;
      recommendations.push('Nhiệt độ rất cao! Cần uống đủ nước và tránh hoạt động ngoài trời.');
    } else if (temp >= 32) {
      tempImpact = 'negative';
      tempRisk = 15;
      recommendations.push('Nhiệt độ cao, cần uống nhiều nước và hạn chế ra ngoài vào buổi trưa.');
    } else if (temp >= 20 && temp <= 28) {
      tempImpact = 'positive';
      tempRisk = 0;
    } else if (temp < 15) {
      tempImpact = 'negative';
      tempRisk = 10;
      recommendations.push('Nhiệt độ thấp, cần mặc đủ ấm khi ra ngoài.');
    }
    
    totalRisk += tempRisk;
    factors.push({
      name: 'Nhiệt độ',
      value: `${temp.toFixed(1)}°C`,
      impact: tempImpact,
      description: temp >= 35 ? 'Nguy hiểm cho sức khỏe' : 
                   temp >= 32 ? 'Cảnh báo nóng' :
                   temp >= 20 ? 'Thoải mái' : 'Lạnh'
    });
  }

  // Humidity impact
  if (env.weather?.humidity !== null) {
    const humidity = env.weather.humidity;
    let humidityImpact: 'positive' | 'neutral' | 'negative' | 'dangerous' = 'neutral';
    let humidityRisk = 0;

    if (humidity >= 85) {
      humidityImpact = 'negative';
      humidityRisk = 15;
      recommendations.push('Độ ẩm rất cao, có thể gây khó thở và mệt mỏi.');
    } else if (humidity >= 40 && humidity <= 60) {
      humidityImpact = 'positive';
    } else if (humidity < 30) {
      humidityImpact = 'negative';
      humidityRisk = 10;
      recommendations.push('Không khí khô, nên sử dụng máy tạo ẩm.');
    }

    totalRisk += humidityRisk;
    factors.push({
      name: 'Độ ẩm',
      value: `${humidity.toFixed(0)}%`,
      impact: humidityImpact,
      description: humidity >= 85 ? 'Rất ẩm' :
                   humidity >= 60 ? 'Ẩm' :
                   humidity >= 40 ? 'Lý tưởng' : 'Khô'
    });
  }

  // Air Quality Index impact
  if (env.airQuality?.aqi !== null) {
    const aqi = env.airQuality.aqi;
    let aqiImpact: 'positive' | 'neutral' | 'negative' | 'dangerous' = 'neutral';
    let aqiRisk = 0;

    if (aqi >= 150) {
      aqiImpact = 'dangerous';
      aqiRisk = 35;
      recommendations.push('Chất lượng không khí NGUY HẠI! Hạn chế ra ngoài, sử dụng khẩu trang N95.');
    } else if (aqi >= 100) {
      aqiImpact = 'negative';
      aqiRisk = 20;
      recommendations.push('Chất lượng không khí kém, người nhạy cảm nên hạn chế ra ngoài.');
    } else if (aqi >= 50) {
      aqiImpact = 'neutral';
      aqiRisk = 5;
    } else {
      aqiImpact = 'positive';
    }

    // Extra risk for people with respiratory conditions
    if (userProfile?.chronicConditions?.some(c => 
      c.toLowerCase().includes('hen') || 
      c.toLowerCase().includes('asthma') ||
      c.toLowerCase().includes('phổi')
    )) {
      aqiRisk += 15;
      if (aqi >= 50) {
        recommendations.push('Với bệnh hô hấp của bạn, cần đặc biệt chú ý chất lượng không khí.');
      }
    }

    totalRisk += aqiRisk;
    factors.push({
      name: 'Chỉ số AQI',
      value: aqi.toFixed(0),
      impact: aqiImpact,
      description: aqi >= 150 ? 'Không lành mạnh cho mọi người' :
                   aqi >= 100 ? 'Không lành mạnh cho nhóm nhạy cảm' :
                   aqi >= 50 ? 'Trung bình' : 'Tốt'
    });
  }

  // PM2.5 impact (most harmful pollutant)
  if (env.airQuality?.pm25 !== null) {
    const pm25 = env.airQuality.pm25;
    let pm25Impact: 'positive' | 'neutral' | 'negative' | 'dangerous' = 'neutral';
    let pm25Risk = 0;

    if (pm25 >= 55) {
      pm25Impact = 'dangerous';
      pm25Risk = 25;
    } else if (pm25 >= 35) {
      pm25Impact = 'negative';
      pm25Risk = 15;
    } else if (pm25 >= 12) {
      pm25Impact = 'neutral';
      pm25Risk = 5;
    } else {
      pm25Impact = 'positive';
    }

    totalRisk += pm25Risk;
    factors.push({
      name: 'Bụi mịn PM2.5',
      value: `${pm25.toFixed(1)} µg/m³`,
      impact: pm25Impact,
      description: pm25 >= 55 ? 'Nguy hiểm' :
                   pm25 >= 35 ? 'Kém' :
                   pm25 >= 12 ? 'Trung bình' : 'Tốt'
    });
  }

  // Pressure impact (affects stroke risk)
  if (env.weather?.pressure !== null) {
    const pressure = env.weather.pressure;
    let pressureImpact: 'positive' | 'neutral' | 'negative' | 'dangerous' = 'neutral';
    let pressureRisk = 0;

    // Normal pressure is ~1013 hPa
    if (pressure < 1000 || pressure > 1030) {
      pressureImpact = 'negative';
      pressureRisk = 10;
      recommendations.push('Áp suất khí quyển bất thường, người có bệnh tim mạch cần chú ý.');
    } else {
      pressureImpact = 'positive';
    }

    totalRisk += pressureRisk;
    factors.push({
      name: 'Áp suất khí quyển',
      value: `${pressure.toFixed(0)} hPa`,
      impact: pressureImpact,
      description: pressure >= 1000 && pressure <= 1030 ? 'Bình thường' : 'Bất thường'
    });
  }

  // UV Index impact
  if (env.weather?.uvIndex !== null) {
    const uv = env.weather.uvIndex;
    let uvImpact: 'positive' | 'neutral' | 'negative' | 'dangerous' = 'neutral';
    let uvRisk = 0;

    if (uv >= 11) {
      uvImpact = 'dangerous';
      uvRisk = 20;
      recommendations.push('Chỉ số UV CỰC CAO! Tránh ra ngoài từ 10h-16h, sử dụng kem chống nắng SPF50+.');
    } else if (uv >= 8) {
      uvImpact = 'dangerous';
      uvRisk = 15;
      recommendations.push('Chỉ số UV rất cao, cần kem chống nắng SPF30+ và mũ/nón.');
    } else if (uv >= 6) {
      uvImpact = 'negative';
      uvRisk = 10;
    } else if (uv >= 3) {
      uvImpact = 'neutral';
      uvRisk = 5;
    } else {
      uvImpact = 'positive';
    }

    totalRisk += uvRisk;
    factors.push({
      name: 'Chỉ số UV',
      value: uv.toFixed(1),
      impact: uvImpact,
      description: uv >= 11 ? 'Cực cao' :
                   uv >= 8 ? 'Rất cao' :
                   uv >= 6 ? 'Cao' :
                   uv >= 3 ? 'Trung bình' : 'Thấp'
    });
  }

  // Normalize risk score to 0-100
  const riskScore = Math.min(100, totalRisk);
  const overallRisk: EnvironmentHealthImpact['overallRisk'] = 
    riskScore >= 60 ? 'critical' :
    riskScore >= 40 ? 'high' :
    riskScore >= 20 ? 'medium' : 'low';

  return {
    overallRisk,
    riskScore,
    factors,
    recommendations
  };
}

export function useEnvironmentData() {
  const [data, setData] = useState<EnvironmentData | null>(null);
  const [healthImpact, setHealthImpact] = useState<EnvironmentHealthImpact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current location
  const getCurrentLocation = useCallback((): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  // Fetch environment data for a location
  const fetchEnvironmentData = useCallback(async (
    location?: { lat: number; lng: number },
    userProfile?: { chronicConditions?: string[]; allergies?: string[]; age?: number }
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Get location if not provided
      let loc = location;
      if (!loc) {
        try {
          loc = await getCurrentLocation();
        } catch {
          // Default to HCMC
          loc = { lat: 10.762622, lng: 106.660172 };
        }
      }

      // Call edge function
      const { data: envData, error: envError } = await supabase.functions.invoke('fetch-environment-data', {
        body: { lat: loc.lat, lon: loc.lng }
      });

      if (envError) throw new Error(envError.message);

      setData(envData as EnvironmentData);
      
      // Calculate health impact
      const impact = calculateEnvironmentHealthImpact(envData, userProfile);
      setHealthImpact(impact);

      // Silent persistence to environment_daily_log (fire-and-forget)
      (async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const env = envData as EnvironmentData;
          await supabase.from('environment_daily_log' as any).insert({
            user_id: user?.id ?? null,
            lat: env?.location?.lat ?? null,
            lon: env?.location?.lon ?? null,
            temperature: env?.weather?.temperature ?? null,
            humidity: env?.weather?.humidity ?? null,
            pressure: env?.weather?.pressure ?? null,
            wind_speed: env?.weather?.windSpeed ?? null,
            uv_index: env?.weather?.uvIndex ?? null,
            aqi: env?.airQuality?.aqi ?? null,
            pm25: env?.airQuality?.pm25 ?? null,
            pm10: env?.airQuality?.pm10 ?? null,
            no2: env?.airQuality?.no2 ?? null,
            so2: env?.airQuality?.so2 ?? null,
            co: env?.airQuality?.co ?? null,
            o3: env?.airQuality?.o3 ?? null,
            main_pollutant: env?.airQuality?.mainPollutant ?? null,
            weather_source: env?.sources?.weather ?? null,
            air_quality_source: env?.sources?.airQuality ?? null,
            risk_score: impact?.riskScore ?? null,
            overall_risk: impact?.overallRisk ?? null,
            raw: env as any,
          });
        } catch (e) {
          console.warn('[env-log] silent persist failed', e);
        }
      })();

      return { environment: envData, impact };
    } catch (err: any) {
      console.error('Error fetching environment data:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getCurrentLocation]);

  return {
    data,
    healthImpact,
    loading,
    error,
    fetchEnvironmentData
  };
}
