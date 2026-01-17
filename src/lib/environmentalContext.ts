/**
 * ENVIRONMENTAL CONTEXT INTEGRATION FOR DIGITAL TWIN
 * 
 * This module defines how environmental factors affect physiological states.
 * Privacy-first: Only coarse location used, no tracking.
 * Time-aware: Circadian and seasonal adjustments.
 */

import type { SystemId, RiskLevel } from './healthOntology';

// ============================================================================
// DATA SCHEMA
// ============================================================================

export interface EnvironmentContext {
  // Timestamp of measurement
  timestamp: Date;
  
  // Location (coarse - city level only for privacy)
  location: {
    city: string;
    region: string;
    timezone: string;
    // Coarse coordinates (rounded to ~1km)
    lat: number;
    lon: number;
  };
  
  // Weather conditions
  weather: {
    temperature: number;      // °C
    humidity: number;         // %
    pressure: number;         // hPa
    pressureChange1h: number; // hPa change in last hour
    pressureChange24h: number;// hPa change in last 24h
    uvIndex: number;          // 0-11+
    windSpeed: number;        // km/h
    cloudCover: number;       // %
    visibility: number;       // km
    conditions: WeatherCondition;
  };
  
  // Air quality
  airQuality: {
    aqi: number;              // 0-500 (US EPA scale)
    pm25: number;             // µg/m³
    pm10: number;             // µg/m³
    o3: number;               // µg/m³
    no2: number;              // µg/m³
    so2: number;              // µg/m³
    co: number;               // µg/m³
    mainPollutant: PollutantType;
    category: AQICategory;
  };
  
  // Optional sensors (device-dependent)
  sensors?: {
    noise?: {                 // Ambient noise
      level: number;          // dB
      exposure24h: number;    // Average 24h dB
    };
    light?: {                 // Ambient light
      lux: number;            // Current lux
      blueLight: number;      // Blue light intensity
    };
    barometer?: {             // Device barometer
      pressure: number;
      trend: 'rising' | 'falling' | 'stable';
    };
  };
  
  // Time context
  timeContext: {
    localHour: number;
    dayPhase: DayPhase;
    season: Season;
    isWeekend: boolean;
    daylightHours: number;
  };
  
  // Data quality
  meta: {
    sources: string[];
    freshness: 'live' | 'recent' | 'cached' | 'stale';
    lastUpdated: Date;
    accuracy: 'high' | 'medium' | 'low';
  };
}

export type WeatherCondition = 
  | 'clear' | 'clouds' | 'rain' | 'drizzle' | 'thunderstorm' 
  | 'snow' | 'mist' | 'fog' | 'dust' | 'smoke' | 'haze';

export type PollutantType = 'pm25' | 'pm10' | 'o3' | 'no2' | 'so2' | 'co';

export type AQICategory = 
  | 'good' | 'moderate' | 'unhealthy_sensitive' 
  | 'unhealthy' | 'very_unhealthy' | 'hazardous';

export type DayPhase = 
  | 'dawn' | 'morning' | 'midday' | 'afternoon' 
  | 'evening' | 'night' | 'late_night';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'dry' | 'wet';

// ============================================================================
// PHYSIOLOGICAL STRESS MAPPING
// ============================================================================

export interface PhysiologicalStressFactors {
  // Cardiovascular stress
  cardiovascular: {
    bloodPressureLoad: number;     // 0-100
    heartRateVariability: number;  // Impact on HRV
    vasodilation: number;          // -1 to 1
    triggers: StressTrigger[];
  };
  
  // Respiratory stress
  respiratory: {
    airwayIrritation: number;      // 0-100
    oxygenationEfficiency: number; // 0-100
    breathingEffort: number;       // 0-100
    triggers: StressTrigger[];
  };
  
  // Neurological stress
  neurological: {
    cognitiveLoad: number;         // 0-100
    sleepPressure: number;         // 0-100
    moodImpact: number;            // -50 to 50
    headacheTrigger: number;       // 0-100
    triggers: StressTrigger[];
  };
  
  // Metabolic stress
  metabolic: {
    thermoregulationLoad: number;  // 0-100
    hydrationDemand: number;       // 0-100
    glucoseFluctuation: number;    // 0-100
    triggers: StressTrigger[];
  };
  
  // Immune stress
  immune: {
    inflammatoryLoad: number;      // 0-100
    pathogenExposure: number;      // 0-100
    allergenLoad: number;          // 0-100
    triggers: StressTrigger[];
  };
  
  // Musculoskeletal stress
  musculoskeletal: {
    jointPressure: number;         // 0-100
    muscleStiffness: number;       // 0-100
    activityCapacity: number;      // 0-100
    triggers: StressTrigger[];
  };
  
  // Overall composite
  overall: {
    stressIndex: number;           // 0-100
    riskLevel: RiskLevel;
    primaryConcerns: string[];
    recommendedActions: string[];
  };
}

export interface StressTrigger {
  factor: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  source: 'weather' | 'air' | 'time' | 'sensor';
  description: string;
  descriptionVi: string;
}

// ============================================================================
// MAPPING FUNCTIONS
// ============================================================================

/**
 * Map environmental context to physiological stress factors
 */
export function mapEnvironmentToPhysiology(
  env: EnvironmentContext,
  userProfile?: {
    age?: number;
    chronicConditions?: string[];
    allergies?: string[];
    medications?: string[];
  }
): PhysiologicalStressFactors {
  const triggers: Record<SystemId, StressTrigger[]> = {
    nervous: [],
    cardiovascular: [],
    respiratory: [],
    metabolic: [],
    immune: [],
    musculoskeletal: []
  };

  // =========== CARDIOVASCULAR STRESS ===========
  let bpLoad = 20; // baseline
  let hrvImpact = 0;
  let vasodilation = 0;

  // Pressure effects (barometric)
  if (env.weather.pressure < 1005) {
    bpLoad += 25;
    triggers.cardiovascular.push({
      factor: 'Very low barometric pressure',
      severity: 'high',
      source: 'weather',
      description: `Pressure ${env.weather.pressure.toFixed(0)} hPa - significant cardiovascular stress`,
      descriptionVi: `Áp suất ${env.weather.pressure.toFixed(0)} hPa - căng thẳng tim mạch đáng kể`
    });
  } else if (env.weather.pressure < 1010) {
    bpLoad += 15;
    triggers.cardiovascular.push({
      factor: 'Low barometric pressure',
      severity: 'moderate',
      source: 'weather',
      description: `Pressure ${env.weather.pressure.toFixed(0)} hPa - moderate cardiovascular stress`,
      descriptionVi: `Áp suất ${env.weather.pressure.toFixed(0)} hPa - căng thẳng tim mạch trung bình`
    });
  }

  // Rapid pressure changes
  if (Math.abs(env.weather.pressureChange1h) > 3) {
    bpLoad += 20;
    hrvImpact -= 15;
    triggers.cardiovascular.push({
      factor: 'Rapid pressure change',
      severity: 'high',
      source: 'weather',
      description: `${env.weather.pressureChange1h > 0 ? 'Rising' : 'Falling'} ${Math.abs(env.weather.pressureChange1h).toFixed(1)} hPa/hour`,
      descriptionVi: `${env.weather.pressureChange1h > 0 ? 'Tăng' : 'Giảm'} ${Math.abs(env.weather.pressureChange1h).toFixed(1)} hPa/giờ`
    });
  }

  // Temperature effects
  if (env.weather.temperature > 35) {
    bpLoad += 20;
    vasodilation = 0.8;
    triggers.cardiovascular.push({
      factor: 'Extreme heat',
      severity: 'high',
      source: 'weather',
      description: `Temperature ${env.weather.temperature}°C - vasodilation and cardiac stress`,
      descriptionVi: `Nhiệt độ ${env.weather.temperature}°C - giãn mạch và căng thẳng tim`
    });
  } else if (env.weather.temperature < 5) {
    bpLoad += 15;
    vasodilation = -0.6;
    triggers.cardiovascular.push({
      factor: 'Cold exposure',
      severity: 'moderate',
      source: 'weather',
      description: `Temperature ${env.weather.temperature}°C - vasoconstriction`,
      descriptionVi: `Nhiệt độ ${env.weather.temperature}°C - co mạch`
    });
  }

  // High humidity compounds heat stress
  if (env.weather.humidity > 85 && env.weather.temperature > 28) {
    bpLoad += 15;
    triggers.cardiovascular.push({
      factor: 'Heat-humidity stress',
      severity: 'moderate',
      source: 'weather',
      description: `Humidity ${env.weather.humidity}% with heat creates cardiovascular burden`,
      descriptionVi: `Độ ẩm ${env.weather.humidity}% cùng với nóng tạo gánh nặng tim mạch`
    });
  }

  // =========== RESPIRATORY STRESS ===========
  let airwayIrritation = 10;
  let oxygenEfficiency = 95;
  let breathingEffort = 15;

  // AQI effects
  if (env.airQuality.aqi > 150) {
    airwayIrritation += 50;
    oxygenEfficiency -= 20;
    breathingEffort += 30;
    triggers.respiratory.push({
      factor: 'Unhealthy air quality',
      severity: 'critical',
      source: 'air',
      description: `AQI ${env.airQuality.aqi} - significant respiratory risk`,
      descriptionVi: `AQI ${env.airQuality.aqi} - nguy cơ hô hấp đáng kể`
    });
  } else if (env.airQuality.aqi > 100) {
    airwayIrritation += 30;
    oxygenEfficiency -= 10;
    breathingEffort += 15;
    triggers.respiratory.push({
      factor: 'Moderate air pollution',
      severity: 'moderate',
      source: 'air',
      description: `AQI ${env.airQuality.aqi} - sensitive groups at risk`,
      descriptionVi: `AQI ${env.airQuality.aqi} - nhóm nhạy cảm có nguy cơ`
    });
  } else if (env.airQuality.aqi > 50) {
    airwayIrritation += 10;
    triggers.respiratory.push({
      factor: 'Mild air pollution',
      severity: 'low',
      source: 'air',
      description: `AQI ${env.airQuality.aqi} - acceptable for most people`,
      descriptionVi: `AQI ${env.airQuality.aqi} - chấp nhận được cho hầu hết mọi người`
    });
  }

  // PM2.5 specific
  if (env.airQuality.pm25 > 35) {
    airwayIrritation += 25;
    triggers.respiratory.push({
      factor: 'Elevated PM2.5',
      severity: env.airQuality.pm25 > 55 ? 'high' : 'moderate',
      source: 'air',
      description: `PM2.5 at ${env.airQuality.pm25} µg/m³ - deep lung penetration`,
      descriptionVi: `PM2.5 ở mức ${env.airQuality.pm25} µg/m³ - xâm nhập phổi sâu`
    });
  }

  // High humidity affects breathing
  if (env.weather.humidity > 90) {
    breathingEffort += 15;
    triggers.respiratory.push({
      factor: 'Very high humidity',
      severity: 'moderate',
      source: 'weather',
      description: `Humidity ${env.weather.humidity}% increases breathing effort`,
      descriptionVi: `Độ ẩm ${env.weather.humidity}% tăng nỗ lực thở`
    });
  }

  // =========== NEUROLOGICAL STRESS ===========
  let cognitiveLoad = 20;
  let sleepPressure = 0;
  let moodImpact = 0;
  let headacheTrigger = 10;

  // Pressure-induced headache
  if (Math.abs(env.weather.pressureChange24h) > 8) {
    headacheTrigger += 40;
    triggers.nervous.push({
      factor: 'Significant pressure change',
      severity: 'high',
      source: 'weather',
      description: '24h pressure change may trigger migraine',
      descriptionVi: 'Thay đổi áp suất 24h có thể kích hoạt đau nửa đầu'
    });
  }

  // Circadian rhythm impacts
  if (env.timeContext.dayPhase === 'late_night' && env.sensors?.light?.lux && env.sensors.light.lux > 100) {
    sleepPressure += 30;
    moodImpact -= 10;
    triggers.nervous.push({
      factor: 'Light exposure at night',
      severity: 'moderate',
      source: 'sensor',
      description: 'Bright light suppressing melatonin production',
      descriptionVi: 'Ánh sáng mạnh ức chế sản xuất melatonin'
    });
  }

  // Noise impacts
  if (env.sensors?.noise?.level && env.sensors.noise.level > 65) {
    cognitiveLoad += 25;
    triggers.nervous.push({
      factor: 'High ambient noise',
      severity: env.sensors.noise.level > 80 ? 'high' : 'moderate',
      source: 'sensor',
      description: `Noise level ${env.sensors.noise.level} dB affecting concentration`,
      descriptionVi: `Mức ồn ${env.sensors.noise.level} dB ảnh hưởng tập trung`
    });
  }

  // Low daylight hours (seasonal)
  if (env.timeContext.daylightHours < 10) {
    moodImpact -= 15;
    triggers.nervous.push({
      factor: 'Short daylight',
      severity: 'low',
      source: 'time',
      description: `Only ${env.timeContext.daylightHours}h of daylight - may affect mood`,
      descriptionVi: `Chỉ ${env.timeContext.daylightHours}h ánh sáng - có thể ảnh hưởng tâm trạng`
    });
  }

  // =========== METABOLIC STRESS ===========
  let thermoLoad = 20;
  let hydrationDemand = 30;
  let glucoseFlux = 15;

  // Heat stress on metabolism
  if (env.weather.temperature > 32) {
    thermoLoad += 40;
    hydrationDemand += 50;
    triggers.metabolic.push({
      factor: 'High temperature',
      severity: env.weather.temperature > 38 ? 'critical' : 'high',
      source: 'weather',
      description: `${env.weather.temperature}°C - increased metabolic demand`,
      descriptionVi: `${env.weather.temperature}°C - tăng nhu cầu chuyển hóa`
    });
  }

  // Cold increases metabolic rate
  if (env.weather.temperature < 10) {
    thermoLoad += 25;
    glucoseFlux += 20;
    triggers.metabolic.push({
      factor: 'Cold stress',
      severity: 'moderate',
      source: 'weather',
      description: `Cold temperature increases glucose consumption`,
      descriptionVi: `Nhiệt độ lạnh tăng tiêu thụ glucose`
    });
  }

  // UV and vitamin D
  if (env.weather.uvIndex > 8) {
    triggers.metabolic.push({
      factor: 'High UV exposure',
      severity: 'moderate',
      source: 'weather',
      description: `UV Index ${env.weather.uvIndex} - sun protection needed`,
      descriptionVi: `Chỉ số UV ${env.weather.uvIndex} - cần bảo vệ da`
    });
  }

  // =========== IMMUNE STRESS ===========
  let inflammatoryLoad = 15;
  let pathogenRisk = 20;
  let allergenLoad = 10;

  // Air pollution inflammatory effects
  if (env.airQuality.aqi > 75) {
    inflammatoryLoad += 25;
    triggers.immune.push({
      factor: 'Air pollution inflammation',
      severity: 'moderate',
      source: 'air',
      description: 'Pollutants triggering systemic inflammation',
      descriptionVi: 'Chất ô nhiễm kích hoạt viêm hệ thống'
    });
  }

  // Weather conditions affecting pathogens
  if (env.weather.conditions === 'rain' || env.weather.humidity > 85) {
    pathogenRisk += 15;
  }

  // Temperature extremes affect immunity
  if (env.weather.temperature < 5 || env.weather.temperature > 35) {
    inflammatoryLoad += 15;
    triggers.immune.push({
      factor: 'Temperature stress on immunity',
      severity: 'low',
      source: 'weather',
      description: 'Extreme temperatures may suppress immune function',
      descriptionVi: 'Nhiệt độ cực đoan có thể ức chế chức năng miễn dịch'
    });
  }

  // =========== MUSCULOSKELETAL STRESS ===========
  let jointPressure = 15;
  let muscleStiffness = 20;
  let activityCapacity = 85;

  // Pressure affects joints
  if (env.weather.pressure < 1010) {
    jointPressure += 30;
    triggers.musculoskeletal.push({
      factor: 'Low pressure joint stress',
      severity: 'moderate',
      source: 'weather',
      description: 'Low pressure may increase joint pain',
      descriptionVi: 'Áp suất thấp có thể tăng đau khớp'
    });
  }

  // Cold stiffens muscles
  if (env.weather.temperature < 15) {
    muscleStiffness += 25;
    triggers.musculoskeletal.push({
      factor: 'Cold-induced stiffness',
      severity: 'low',
      source: 'weather',
      description: 'Cold temperatures increase muscle stiffness',
      descriptionVi: 'Nhiệt độ lạnh tăng độ cứng cơ'
    });
  }

  // Heat reduces activity capacity
  if (env.weather.temperature > 33 && env.weather.humidity > 70) {
    activityCapacity -= 30;
    triggers.musculoskeletal.push({
      factor: 'Heat limits activity',
      severity: 'moderate',
      source: 'weather',
      description: 'Hot humid conditions reduce exercise capacity',
      descriptionVi: 'Điều kiện nóng ẩm giảm khả năng tập luyện'
    });
  }

  // =========== CALCULATE OVERALL ===========
  const systemScores = {
    cardiovascular: Math.min(100, bpLoad),
    respiratory: Math.min(100, airwayIrritation + (100 - oxygenEfficiency)),
    nervous: Math.min(100, cognitiveLoad + headacheTrigger / 2),
    metabolic: Math.min(100, thermoLoad + hydrationDemand / 2),
    immune: Math.min(100, inflammatoryLoad + pathogenRisk / 2 + allergenLoad / 2),
    musculoskeletal: Math.min(100, jointPressure + muscleStiffness / 2)
  };

  const overallStress = Object.values(systemScores).reduce((a, b) => a + b, 0) / 6;
  
  let riskLevel: RiskLevel;
  if (overallStress < 25) riskLevel = 'optimal';
  else if (overallStress < 40) riskLevel = 'normal';
  else if (overallStress < 55) riskLevel = 'elevated';
  else if (overallStress < 75) riskLevel = 'high';
  else riskLevel = 'critical';

  // Primary concerns
  const primaryConcerns: string[] = [];
  const sortedSystems = Object.entries(systemScores).sort((a, b) => b[1] - a[1]);
  if (sortedSystems[0][1] > 50) {
    primaryConcerns.push(`${sortedSystems[0][0]} stress elevated`);
  }
  if (sortedSystems[1][1] > 50) {
    primaryConcerns.push(`${sortedSystems[1][0]} stress elevated`);
  }

  // Recommended actions
  const recommendedActions: string[] = [];
  if (bpLoad > 50) recommendedActions.push('Monitor blood pressure');
  if (airwayIrritation > 50) recommendedActions.push('Limit outdoor exposure');
  if (hydrationDemand > 60) recommendedActions.push('Increase fluid intake');
  if (headacheTrigger > 50) recommendedActions.push('Have migraine medication ready');
  if (jointPressure > 50) recommendedActions.push('Gentle stretching recommended');

  return {
    cardiovascular: {
      bloodPressureLoad: bpLoad,
      heartRateVariability: hrvImpact,
      vasodilation,
      triggers: triggers.cardiovascular
    },
    respiratory: {
      airwayIrritation,
      oxygenationEfficiency: oxygenEfficiency,
      breathingEffort,
      triggers: triggers.respiratory
    },
    neurological: {
      cognitiveLoad,
      sleepPressure,
      moodImpact,
      headacheTrigger,
      triggers: triggers.nervous
    },
    metabolic: {
      thermoregulationLoad: thermoLoad,
      hydrationDemand,
      glucoseFluctuation: glucoseFlux,
      triggers: triggers.metabolic
    },
    immune: {
      inflammatoryLoad,
      pathogenExposure: pathogenRisk,
      allergenLoad,
      triggers: triggers.immune
    },
    musculoskeletal: {
      jointPressure,
      muscleStiffness,
      activityCapacity,
      triggers: triggers.musculoskeletal
    },
    overall: {
      stressIndex: Math.round(overallStress),
      riskLevel,
      primaryConcerns,
      recommendedActions
    }
  };
}

/**
 * Get time context from current time
 */
export function getTimeContext(date: Date = new Date(), lat: number = 10.8): {
  localHour: number;
  dayPhase: DayPhase;
  season: Season;
  isWeekend: boolean;
  daylightHours: number;
} {
  const hour = date.getHours();
  const day = date.getDay();
  const month = date.getMonth();

  // Determine day phase
  let dayPhase: DayPhase;
  if (hour >= 5 && hour < 7) dayPhase = 'dawn';
  else if (hour >= 7 && hour < 11) dayPhase = 'morning';
  else if (hour >= 11 && hour < 14) dayPhase = 'midday';
  else if (hour >= 14 && hour < 17) dayPhase = 'afternoon';
  else if (hour >= 17 && hour < 20) dayPhase = 'evening';
  else if (hour >= 20 && hour < 24) dayPhase = 'night';
  else dayPhase = 'late_night';

  // Determine season (Vietnam tropical)
  let season: Season;
  if (lat > 16) {
    // Northern Vietnam - 4 seasons
    if (month >= 2 && month < 5) season = 'spring';
    else if (month >= 5 && month < 8) season = 'summer';
    else if (month >= 8 && month < 11) season = 'autumn';
    else season = 'winter';
  } else {
    // Southern Vietnam - dry/wet
    if (month >= 4 && month < 11) season = 'wet';
    else season = 'dry';
  }

  // Approximate daylight hours
  const daylightHours = 12 + 2 * Math.cos((month - 6) * Math.PI / 6);

  return {
    localHour: hour,
    dayPhase,
    season,
    isWeekend: day === 0 || day === 6,
    daylightHours: Math.round(daylightHours * 10) / 10
  };
}

/**
 * Classify AQI into categories
 */
export function classifyAQI(aqi: number): AQICategory {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'unhealthy_sensitive';
  if (aqi <= 200) return 'unhealthy';
  if (aqi <= 300) return 'very_unhealthy';
  return 'hazardous';
}

/**
 * Privacy-preserving location coarsening
 */
export function coarsenLocation(lat: number, lon: number): { lat: number; lon: number } {
  // Round to ~1km precision (0.01 degree ≈ 1.1km)
  return {
    lat: Math.round(lat * 100) / 100,
    lon: Math.round(lon * 100) / 100
  };
}
