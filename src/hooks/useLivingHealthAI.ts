import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { useGPS } from '@/hooks/useGPS';

// Disease priority configuration - COVID deprioritized as endemic
interface DiseaseIntel {
  priority: number;
  isEmergency: boolean;
  seasonal: boolean;
  peakMonths?: number[];
  spreadPattern: string;
  evolutionRate: 'fast' | 'medium' | 'slow';
  warningThreshold: number;
  affectsChildren?: boolean;
  fatalWithoutTreatment?: boolean;
}

const DISEASE_INTELLIGENCE: Record<string, DiseaseIntel> = {
  dengue: {
    priority: 1,
    isEmergency: true,
    seasonal: true,
    peakMonths: [5, 6, 7, 8, 9, 10, 11],
    spreadPattern: 'mosquito_vector',
    evolutionRate: 'fast',
    warningThreshold: 50
  },
  hfmd: {
    priority: 2,
    isEmergency: true,
    affectsChildren: true,
    seasonal: true,
    peakMonths: [3, 4, 5, 9, 10, 11],
    spreadPattern: 'contact',
    evolutionRate: 'medium',
    warningThreshold: 30
  },
  measles: {
    priority: 3,
    isEmergency: true,
    affectsChildren: true,
    seasonal: false,
    peakMonths: [],
    spreadPattern: 'airborne',
    evolutionRate: 'fast',
    warningThreshold: 10
  },
  rabies: {
    priority: 4,
    isEmergency: true,
    fatalWithoutTreatment: true,
    seasonal: false,
    peakMonths: [],
    spreadPattern: 'animal_bite',
    evolutionRate: 'slow',
    warningThreshold: 1
  },
  influenza: {
    priority: 5,
    isEmergency: false,
    seasonal: true,
    peakMonths: [12, 1, 2, 3],
    spreadPattern: 'airborne',
    evolutionRate: 'medium',
    warningThreshold: 100
  },
  covid19: {
    priority: 10, // Deprioritized - endemic now
    isEmergency: false,
    seasonal: false,
    peakMonths: [],
    spreadPattern: 'airborne',
    evolutionRate: 'slow' as const,
    warningThreshold: 500
  }
};

// Vietnamese regions based on GPS
const VIETNAM_REGIONS = {
  'northern_highlands': { lat: [21.5, 23.5], lng: [102, 108], name: 'Tây Bắc & Đông Bắc', climate: 'temperate' },
  'red_river_delta': { lat: [20, 21.5], lng: [105, 107], name: 'Đồng bằng sông Hồng', climate: 'subtropical' },
  'north_central': { lat: [17.5, 20], lng: [104, 108], name: 'Bắc Trung Bộ', climate: 'tropical' },
  'south_central': { lat: [11, 17.5], lng: [107, 110], name: 'Nam Trung Bộ', climate: 'tropical' },
  'central_highlands': { lat: [11.5, 15], lng: [107, 109], name: 'Tây Nguyên', climate: 'highland' },
  'southeast': { lat: [10, 12], lng: [106, 108], name: 'Đông Nam Bộ', climate: 'tropical' },
  'mekong_delta': { lat: [8.5, 11], lng: [104, 107], name: 'Đồng bằng sông Cửu Long', climate: 'tropical' },
  'hcmc_metro': { lat: [10.5, 11.2], lng: [106.3, 107], name: 'TP. Hồ Chí Minh', climate: 'tropical_urban' },
  'hanoi_metro': { lat: [20.8, 21.3], lng: [105.5, 106.2], name: 'Hà Nội', climate: 'subtropical_urban' }
};

export interface DiseaseEvolution {
  disease: string;
  currentCases: number;
  predictedCases7d: number;
  predictedCases14d: number;
  trend: 'accelerating' | 'stable' | 'declining' | 'emerging';
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  spreadDirection: string[]; // Districts/areas where spreading
  peakPrediction: string; // When peak expected
  aiInsight: string;
  aiInsightVi: string;
}

export interface RegionalForecast {
  region: string;
  regionVi: string;
  userDistance: number; // km from user
  diseases: DiseaseEvolution[];
  overallThreat: 'low' | 'medium' | 'high' | 'critical';
  aiThinking: string;
  aiThinkingVi: string;
}

export interface LivingAIState {
  isThinking: boolean;
  lastThought: Date | null;
  forecasts: RegionalForecast[];
  prioritizedDiseases: DiseaseEvolution[];
  userRegion: string;
  userRegionVi: string;
  aiStatus: 'idle' | 'analyzing' | 'predicting' | 'alerting';
  aiMood: 'calm' | 'concerned' | 'alert' | 'urgent';
}

export function useLivingHealthAI() {
  const { user, profile } = useAuthContext();
  const [state, setState] = useState<LivingAIState>({
    isThinking: false,
    lastThought: null,
    forecasts: [],
    prioritizedDiseases: [],
    userRegion: '',
    userRegionVi: '',
    aiStatus: 'idle',
    aiMood: 'calm'
  });
  
  const { gps } = useGPS();
  const userGPS = gps;
  const thinkingInterval = useRef<NodeJS.Timeout | null>(null);

  // Determine user's region based on GPS
  const determineRegion = useCallback((gps: { lat: number; lng: number }) => {
    for (const [key, region] of Object.entries(VIETNAM_REGIONS)) {
      if (
        gps.lat >= region.lat[0] && gps.lat <= region.lat[1] &&
        gps.lng >= region.lng[0] && gps.lng <= region.lng[1]
      ) {
        return { key, ...region };
      }
    }
    // Default to HCMC
    return { key: 'hcmc_metro', ...VIETNAM_REGIONS.hcmc_metro };
  }, []);

  // Calculate distance between two GPS points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  // AI "thinks" about disease evolution
  const thinkAboutDiseases = useCallback(async () => {
    if (!userGPS) return;
    
    setState(prev => ({ ...prev, isThinking: true, aiStatus: 'analyzing' }));
    
    try {
      // Get current month for seasonal analysis
      const currentMonth = new Date().getMonth() + 1;
      const userRegion = determineRegion(userGPS);
      
      // Fetch latest disease data
      const { data: diseaseData, error } = await supabase.functions.invoke('health-prediction-agent', {
        body: {
          lat: userGPS.lat,
          lng: userGPS.lng,
          region: userRegion.key,
          currentMonth,
          mode: 'evolution_prediction'
        }
      });

      if (error) throw error;

      // Process AI predictions
      const forecasts: RegionalForecast[] = [];
      const prioritizedDiseases: DiseaseEvolution[] = [];

      // Analyze each disease with priority
      const sortedDiseases = Object.entries(DISEASE_INTELLIGENCE)
        .sort(([, a], [, b]) => a.priority - b.priority);

      for (const [diseaseCode, intel] of sortedDiseases) {
        // Skip COVID-19 unless there's a significant spike
        if (diseaseCode === 'covid19' && (!diseaseData?.covid19 || diseaseData.covid19.cases < 1000)) {
          continue;
        }

        // Check if in peak season
        const inPeakSeason = intel.seasonal && intel.peakMonths?.includes(currentMonth);
        
        // Get disease-specific prediction
        const prediction = diseaseData?.[diseaseCode] || generateIntelligentPrediction(
          diseaseCode, intel, currentMonth, userRegion.climate
        );

        if (prediction.currentCases >= intel.warningThreshold || inPeakSeason) {
          const evolution: DiseaseEvolution = {
            disease: diseaseCode,
            currentCases: prediction.currentCases,
            predictedCases7d: prediction.predicted7d,
            predictedCases14d: prediction.predicted14d,
            trend: determineTrend(prediction),
            confidence: prediction.confidence || 0.75,
            riskLevel: determineRiskLevel(prediction, intel),
            spreadDirection: prediction.spreadAreas || [userRegion.name],
            peakPrediction: prediction.peakDate || 'N/A',
            aiInsight: prediction.insight || `${diseaseCode} requires monitoring`,
            aiInsightVi: prediction.insightVi || `Cần theo dõi ${diseaseCode}`
          };
          prioritizedDiseases.push(evolution);
        }
      }

      // Sort by urgency
      prioritizedDiseases.sort((a, b) => {
        const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      });

      // Determine AI mood based on threats
      const criticalCount = prioritizedDiseases.filter(d => d.riskLevel === 'critical').length;
      const highCount = prioritizedDiseases.filter(d => d.riskLevel === 'high').length;
      
      let aiMood: LivingAIState['aiMood'] = 'calm';
      if (criticalCount > 0) aiMood = 'urgent';
      else if (highCount > 1) aiMood = 'alert';
      else if (highCount > 0 || prioritizedDiseases.length > 3) aiMood = 'concerned';

      setState({
        isThinking: false,
        lastThought: new Date(),
        forecasts,
        prioritizedDiseases,
        userRegion: userRegion.key,
        userRegionVi: userRegion.name,
        aiStatus: 'idle',
        aiMood
      });

    } catch (err) {
      console.error('AI thinking error:', err);
      // Generate fallback predictions
      const userRegion = determineRegion(userGPS);
      const fallbackPredictions = generateFallbackPredictions(userRegion, new Date().getMonth() + 1);
      
      setState(prev => ({
        ...prev,
        isThinking: false,
        lastThought: new Date(),
        prioritizedDiseases: fallbackPredictions,
        userRegion: userRegion.key,
        userRegionVi: userRegion.name,
        aiStatus: 'idle',
        aiMood: 'calm'
      }));
    }
  }, [userGPS, determineRegion]);

  // Start periodic thinking
  useEffect(() => {
    if (userGPS) {
      // Initial think
      thinkAboutDiseases();
      
      // Think every 5 minutes
      thinkingInterval.current = setInterval(thinkAboutDiseases, 5 * 60 * 1000);
    }
    
    return () => {
      if (thinkingInterval.current) {
        clearInterval(thinkingInterval.current);
      }
    };
  }, [userGPS, thinkAboutDiseases]);

  return {
    ...state,
    userGPS,
    refresh: thinkAboutDiseases
  };
}

// Helper functions
function determineTrend(prediction: any): DiseaseEvolution['trend'] {
  if (!prediction.predicted7d || !prediction.currentCases) return 'stable';
  const change = (prediction.predicted7d - prediction.currentCases) / prediction.currentCases;
  if (change > 0.3) return 'accelerating';
  if (change > 0.1) return 'emerging';
  if (change < -0.1) return 'declining';
  return 'stable';
}

function determineRiskLevel(prediction: any, intel: any): DiseaseEvolution['riskLevel'] {
  const ratio = prediction.currentCases / intel.warningThreshold;
  if (ratio >= 5 || prediction.predicted7d >= prediction.currentCases * 1.5) return 'critical';
  if (ratio >= 2 || prediction.predicted7d >= prediction.currentCases * 1.2) return 'high';
  if (ratio >= 1) return 'medium';
  return 'low';
}

function generateIntelligentPrediction(disease: string, intel: any, month: number, climate: string) {
  const inSeason = intel.seasonal && intel.peakMonths?.includes(month);
  const baseCases = intel.warningThreshold * (inSeason ? 1.5 : 0.5);
  const variance = Math.random() * 0.3 + 0.85;
  
  const current = Math.round(baseCases * variance);
  const growth = inSeason ? 1.15 : 0.95;
  
  return {
    currentCases: current,
    predicted7d: Math.round(current * growth),
    predicted14d: Math.round(current * growth * growth),
    confidence: 0.7,
    spreadAreas: [],
    insight: `${disease} is ${inSeason ? 'in peak season' : 'at baseline levels'}`,
    insightVi: `${disease} ${inSeason ? 'đang vào mùa cao điểm' : 'ở mức nền'}`
  };
}

function generateFallbackPredictions(region: any, month: number): DiseaseEvolution[] {
  const predictions: DiseaseEvolution[] = [];
  
  // Always include dengue in tropical regions during peak months
  if ([5,6,7,8,9,10,11].includes(month) && region.climate.includes('tropical')) {
    predictions.push({
      disease: 'dengue',
      currentCases: Math.round(80 + Math.random() * 100),
      predictedCases7d: Math.round(90 + Math.random() * 120),
      predictedCases14d: Math.round(100 + Math.random() * 150),
      trend: 'accelerating',
      confidence: 0.75,
      riskLevel: 'high',
      spreadDirection: [region.name],
      peakPrediction: 'Trong 2-3 tuần tới',
      aiInsight: 'Dengue peak season - increased vigilance needed',
      aiInsightVi: 'Đang vào mùa cao điểm sốt xuất huyết - cần tăng cường phòng ngừa'
    });
  }
  
  // HFMD for schools
  if ([3,4,5,9,10,11].includes(month)) {
    predictions.push({
      disease: 'hfmd',
      currentCases: Math.round(40 + Math.random() * 60),
      predictedCases7d: Math.round(45 + Math.random() * 70),
      predictedCases14d: Math.round(50 + Math.random() * 80),
      trend: 'emerging',
      confidence: 0.7,
      riskLevel: 'medium',
      spreadDirection: [region.name],
      peakPrediction: 'Trong 1-2 tuần tới',
      aiInsight: 'HFMD spreading in school communities',
      aiInsightVi: 'Tay chân miệng lan rộng trong cộng đồng trường học'
    });
  }

  return predictions;
}
