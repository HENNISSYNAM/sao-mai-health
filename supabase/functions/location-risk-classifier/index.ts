import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationInput {
  lat: number;
  lon: number;
  environmentalFactors?: {
    temperature?: number;
    humidity?: number;
    aqi?: number;
    pressure?: number;
  };
}

interface EpidemiologicalRegion {
  id: string;
  name: string;
  nameVi: string;
  type: 'northern' | 'central' | 'southern' | 'mekong' | 'urban';
  riskFactors: string[];
  endemicDiseases: string[];
  climate: string;
  populationDensity: 'low' | 'medium' | 'high' | 'very_high';
}

interface RiskAlert {
  disease: string;
  diseaseVi: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  explanation: string;
  explanationVi: string;
  recommendations: string[];
  recommendationsVi: string[];
  source: string;
  timestamp: string;
}

// Vietnam epidemiological regions with risk profiles
const EPIDEMIOLOGICAL_REGIONS: Record<string, EpidemiologicalRegion> = {
  northern_highlands: {
    id: 'northern_highlands',
    name: 'Northern Highlands',
    nameVi: 'Vùng núi phía Bắc',
    type: 'northern',
    riskFactors: ['cold_weather', 'limited_healthcare', 'ethnic_minorities'],
    endemicDiseases: ['malaria', 'tuberculosis', 'ari'],
    climate: 'subtropical_highland',
    populationDensity: 'low'
  },
  red_river_delta: {
    id: 'red_river_delta',
    name: 'Red River Delta',
    nameVi: 'Đồng bằng sông Hồng',
    type: 'northern',
    riskFactors: ['high_density', 'flooding', 'industrial_pollution'],
    endemicDiseases: ['dengue', 'hfmd', 'influenza', 'covid19'],
    climate: 'humid_subtropical',
    populationDensity: 'very_high'
  },
  hanoi_metro: {
    id: 'hanoi_metro',
    name: 'Hanoi Metropolitan',
    nameVi: 'Thủ đô Hà Nội',
    type: 'urban',
    riskFactors: ['air_pollution', 'overcrowding', 'traffic', 'rapid_transmission'],
    endemicDiseases: ['covid19', 'influenza', 'dengue', 'hfmd', 'ari'],
    climate: 'humid_subtropical',
    populationDensity: 'very_high'
  },
  north_central: {
    id: 'north_central',
    name: 'North Central Coast',
    nameVi: 'Bắc Trung Bộ',
    type: 'central',
    riskFactors: ['typhoons', 'flooding', 'poverty'],
    endemicDiseases: ['dengue', 'cholera', 'typhoid'],
    climate: 'tropical_monsoon',
    populationDensity: 'medium'
  },
  south_central: {
    id: 'south_central',
    name: 'South Central Coast',
    nameVi: 'Nam Trung Bộ',
    type: 'central',
    riskFactors: ['drought', 'heat_waves', 'tourism'],
    endemicDiseases: ['dengue', 'hfmd', 'food_poisoning'],
    climate: 'tropical_savanna',
    populationDensity: 'medium'
  },
  central_highlands: {
    id: 'central_highlands',
    name: 'Central Highlands',
    nameVi: 'Tây Nguyên',
    type: 'central',
    riskFactors: ['malaria_endemic', 'ethnic_minorities', 'deforestation'],
    endemicDiseases: ['malaria', 'dengue', 'tuberculosis'],
    climate: 'tropical_highland',
    populationDensity: 'low'
  },
  hcmc_metro: {
    id: 'hcmc_metro',
    name: 'Ho Chi Minh City Metropolitan',
    nameVi: 'TP. Hồ Chí Minh',
    type: 'urban',
    riskFactors: ['extreme_density', 'flooding', 'air_pollution', 'industrial'],
    endemicDiseases: ['dengue', 'covid19', 'hfmd', 'influenza', 'ari'],
    climate: 'tropical_monsoon',
    populationDensity: 'very_high'
  },
  mekong_delta: {
    id: 'mekong_delta',
    name: 'Mekong Delta',
    nameVi: 'Đồng bằng sông Cửu Long',
    type: 'mekong',
    riskFactors: ['flooding', 'waterborne_diseases', 'agriculture', 'climate_change'],
    endemicDiseases: ['dengue', 'cholera', 'typhoid', 'leptospirosis'],
    climate: 'tropical_monsoon',
    populationDensity: 'high'
  },
  southeast: {
    id: 'southeast',
    name: 'Southeast Region',
    nameVi: 'Đông Nam Bộ',
    type: 'southern',
    riskFactors: ['industrial_zones', 'migrant_workers', 'urban_sprawl'],
    endemicDiseases: ['dengue', 'hfmd', 'covid19', 'ari'],
    climate: 'tropical_monsoon',
    populationDensity: 'high'
  }
};

// Disease risk profiles with seasonal and environmental factors
const DISEASE_PROFILES: Record<string, {
  nameVi: string;
  seasonalPeak: number[]; // months 1-12
  temperatureRange: [number, number];
  humidityThreshold: number;
  aqiImpact: boolean;
  baseRisk: number;
  transmissionRate: number;
}> = {
  dengue: {
    nameVi: 'Sốt xuất huyết',
    seasonalPeak: [5, 6, 7, 8, 9, 10, 11],
    temperatureRange: [25, 35],
    humidityThreshold: 60,
    aqiImpact: false,
    baseRisk: 0.4,
    transmissionRate: 0.7
  },
  covid19: {
    nameVi: 'COVID-19',
    seasonalPeak: [1, 2, 3, 11, 12],
    temperatureRange: [15, 25],
    humidityThreshold: 40,
    aqiImpact: true,
    baseRisk: 0.3,
    transmissionRate: 0.85
  },
  influenza: {
    nameVi: 'Cúm mùa',
    seasonalPeak: [1, 2, 3, 11, 12],
    temperatureRange: [10, 22],
    humidityThreshold: 50,
    aqiImpact: true,
    baseRisk: 0.35,
    transmissionRate: 0.6
  },
  hfmd: {
    nameVi: 'Tay chân miệng',
    seasonalPeak: [3, 4, 5, 9, 10, 11],
    temperatureRange: [25, 35],
    humidityThreshold: 70,
    aqiImpact: false,
    baseRisk: 0.3,
    transmissionRate: 0.5
  },
  ari: {
    nameVi: 'Viêm hô hấp cấp',
    seasonalPeak: [1, 2, 3, 10, 11, 12],
    temperatureRange: [15, 25],
    humidityThreshold: 60,
    aqiImpact: true,
    baseRisk: 0.4,
    transmissionRate: 0.65
  },
  malaria: {
    nameVi: 'Sốt rét',
    seasonalPeak: [5, 6, 7, 8, 9, 10],
    temperatureRange: [20, 32],
    humidityThreshold: 70,
    aqiImpact: false,
    baseRisk: 0.15,
    transmissionRate: 0.4
  },
  cholera: {
    nameVi: 'Tả',
    seasonalPeak: [5, 6, 7, 8, 9],
    temperatureRange: [25, 37],
    humidityThreshold: 80,
    aqiImpact: false,
    baseRisk: 0.1,
    transmissionRate: 0.6
  },
  typhoid: {
    nameVi: 'Thương hàn',
    seasonalPeak: [6, 7, 8, 9],
    temperatureRange: [25, 35],
    humidityThreshold: 75,
    aqiImpact: false,
    baseRisk: 0.1,
    transmissionRate: 0.4
  }
};

function classifyRegion(lat: number, lon: number): EpidemiologicalRegion {
  // Hanoi metro area
  if (lat >= 20.8 && lat <= 21.2 && lon >= 105.7 && lon <= 106.0) {
    return EPIDEMIOLOGICAL_REGIONS.hanoi_metro;
  }
  
  // HCMC metro area
  if (lat >= 10.6 && lat <= 11.0 && lon >= 106.5 && lon <= 107.0) {
    return EPIDEMIOLOGICAL_REGIONS.hcmc_metro;
  }
  
  // Mekong Delta
  if (lat >= 8.5 && lat <= 11.0 && lon >= 104.5 && lon <= 107.0 && lat < 10.6) {
    return EPIDEMIOLOGICAL_REGIONS.mekong_delta;
  }
  
  // Southeast region
  if (lat >= 10.5 && lat <= 12.5 && lon >= 106.5 && lon <= 108.0) {
    return EPIDEMIOLOGICAL_REGIONS.southeast;
  }
  
  // Central Highlands
  if (lat >= 11.5 && lat <= 15.0 && lon >= 107.0 && lon <= 109.0) {
    return EPIDEMIOLOGICAL_REGIONS.central_highlands;
  }
  
  // South Central Coast
  if (lat >= 11.0 && lat <= 14.5 && lon >= 108.5 && lon <= 110.0) {
    return EPIDEMIOLOGICAL_REGIONS.south_central;
  }
  
  // North Central Coast
  if (lat >= 16.0 && lat <= 20.0 && lon >= 104.5 && lon <= 108.5) {
    return EPIDEMIOLOGICAL_REGIONS.north_central;
  }
  
  // Red River Delta
  if (lat >= 20.0 && lat <= 21.5 && lon >= 105.5 && lon <= 107.0) {
    return EPIDEMIOLOGICAL_REGIONS.red_river_delta;
  }
  
  // Northern Highlands
  if (lat >= 21.0 && lat <= 23.5 && lon >= 102.0 && lon <= 108.0) {
    return EPIDEMIOLOGICAL_REGIONS.northern_highlands;
  }
  
  // Default to nearest major region based on latitude
  if (lat > 18) return EPIDEMIOLOGICAL_REGIONS.red_river_delta;
  if (lat > 14) return EPIDEMIOLOGICAL_REGIONS.south_central;
  if (lat > 11) return EPIDEMIOLOGICAL_REGIONS.southeast;
  return EPIDEMIOLOGICAL_REGIONS.mekong_delta;
}

function calculateDiseaseRisk(
  disease: string,
  region: EpidemiologicalRegion,
  environmentalFactors: LocationInput['environmentalFactors'],
  observedCases: number
): { risk: number; factors: string[] } {
  const profile = DISEASE_PROFILES[disease];
  if (!profile) return { risk: 0, factors: [] };
  
  let risk = profile.baseRisk;
  const factors: string[] = [];
  const currentMonth = new Date().getMonth() + 1;
  
  // Endemic disease bonus
  if (region.endemicDiseases.includes(disease)) {
    risk += 0.15;
    factors.push(`Endemic in ${region.name}`);
  }
  
  // Seasonal adjustment
  if (profile.seasonalPeak.includes(currentMonth)) {
    risk += 0.2;
    factors.push('Peak season');
  }
  
  // Population density impact
  const densityMultiplier = {
    low: 0.7,
    medium: 1.0,
    high: 1.3,
    very_high: 1.6
  }[region.populationDensity];
  risk *= densityMultiplier;
  if (densityMultiplier > 1) {
    factors.push('High population density');
  }
  
  // Environmental factors
  if (environmentalFactors) {
    const { temperature, humidity, aqi } = environmentalFactors;
    
    if (temperature !== undefined) {
      const [minTemp, maxTemp] = profile.temperatureRange;
      if (temperature >= minTemp && temperature <= maxTemp) {
        risk += 0.1;
        factors.push('Favorable temperature');
      }
    }
    
    if (humidity !== undefined && humidity >= profile.humidityThreshold) {
      risk += 0.1;
      factors.push('High humidity');
    }
    
    if (aqi !== undefined && profile.aqiImpact && aqi > 100) {
      risk += 0.15;
      factors.push('Poor air quality');
    }
  }
  
  // Observed cases boost
  if (observedCases > 0) {
    const caseBoost = Math.min(0.3, observedCases / 100 * 0.1);
    risk += caseBoost;
    factors.push(`${observedCases} recent cases reported`);
  }
  
  return { risk: Math.min(1, risk), factors };
}

function getRiskLevel(risk: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (risk >= 0.75) return 'CRITICAL';
  if (risk >= 0.5) return 'HIGH';
  if (risk >= 0.25) return 'MEDIUM';
  return 'LOW';
}

function generateRecommendations(disease: string, riskLevel: string, region: EpidemiologicalRegion): { en: string[]; vi: string[] } {
  const recommendations: { en: string[]; vi: string[] } = { en: [], vi: [] };
  
  const baseRecommendations: Record<string, { en: string[]; vi: string[] }> = {
    dengue: {
      en: [
        'Use mosquito repellent, especially during dawn and dusk',
        'Remove stagnant water sources around your home',
        'Wear long sleeves and pants when outdoors',
        'Sleep under mosquito nets or in air-conditioned rooms'
      ],
      vi: [
        'Sử dụng thuốc chống muỗi, đặc biệt vào sáng sớm và chiều tối',
        'Loại bỏ nước đọng xung quanh nhà',
        'Mặc áo dài tay và quần dài khi ra ngoài',
        'Ngủ màn hoặc trong phòng có điều hòa'
      ]
    },
    covid19: {
      en: [
        'Wear masks in crowded indoor spaces',
        'Maintain good hand hygiene',
        'Ensure good ventilation indoors',
        'Consider vaccination boosters if eligible'
      ],
      vi: [
        'Đeo khẩu trang ở nơi đông người trong nhà',
        'Rửa tay thường xuyên',
        'Đảm bảo thông gió tốt trong nhà',
        'Tiêm vaccine tăng cường nếu đủ điều kiện'
      ]
    },
    influenza: {
      en: [
        'Get annual flu vaccination',
        'Avoid close contact with sick individuals',
        'Cover coughs and sneezes',
        'Stay home if you feel unwell'
      ],
      vi: [
        'Tiêm vaccine cúm hàng năm',
        'Tránh tiếp xúc gần với người bệnh',
        'Che miệng khi ho và hắt hơi',
        'Ở nhà nếu không khỏe'
      ]
    },
    hfmd: {
      en: [
        'Wash hands frequently with soap',
        'Clean and disinfect frequently touched surfaces',
        'Avoid close contact with infected children',
        'Monitor children for symptoms: fever, mouth sores, rash'
      ],
      vi: [
        'Rửa tay thường xuyên bằng xà phòng',
        'Làm sạch và khử trùng bề mặt hay chạm vào',
        'Tránh tiếp xúc gần với trẻ bị bệnh',
        'Theo dõi triệu chứng ở trẻ: sốt, loét miệng, phát ban'
      ]
    },
    ari: {
      en: [
        'Avoid outdoor activities when air quality is poor',
        'Use air purifiers indoors',
        'Stay hydrated and rest well',
        'Seek medical attention if breathing difficulties occur'
      ],
      vi: [
        'Hạn chế hoạt động ngoài trời khi không khí ô nhiễm',
        'Sử dụng máy lọc không khí trong nhà',
        'Uống đủ nước và nghỉ ngơi',
        'Đến cơ sở y tế nếu khó thở'
      ]
    },
    malaria: {
      en: [
        'Take antimalarial medication if recommended',
        'Use insecticide-treated bed nets',
        'Avoid being outdoors at night in endemic areas',
        'Seek immediate treatment if fever develops'
      ],
      vi: [
        'Uống thuốc phòng sốt rét nếu được khuyến cáo',
        'Sử dụng màn tẩm hóa chất',
        'Tránh ra ngoài ban đêm ở vùng dịch',
        'Đến cơ sở y tế ngay nếu sốt'
      ]
    },
    cholera: {
      en: [
        'Drink only boiled or bottled water',
        'Avoid raw or undercooked seafood',
        'Wash hands before eating',
        'Seek immediate medical attention for severe diarrhea'
      ],
      vi: [
        'Chỉ uống nước đun sôi hoặc nước đóng chai',
        'Tránh ăn hải sản sống hoặc chưa chín',
        'Rửa tay trước khi ăn',
        'Đến cơ sở y tế ngay nếu tiêu chảy nặng'
      ]
    },
    typhoid: {
      en: [
        'Drink safe, clean water',
        'Eat thoroughly cooked food',
        'Avoid street food in outbreak areas',
        'Consider typhoid vaccination for travel'
      ],
      vi: [
        'Uống nước sạch, an toàn',
        'Ăn thức ăn nấu chín kỹ',
        'Tránh thức ăn đường phố ở vùng dịch',
        'Tiêm vaccine thương hàn nếu đi du lịch'
      ]
    }
  };
  
  const diseaseRecs = baseRecommendations[disease];
  if (diseaseRecs) {
    // Add more urgent recommendations for higher risk levels
    const count = riskLevel === 'CRITICAL' ? 4 : riskLevel === 'HIGH' ? 3 : 2;
    recommendations.en = diseaseRecs.en.slice(0, count);
    recommendations.vi = diseaseRecs.vi.slice(0, count);
  }
  
  // Add region-specific recommendations
  if (region.type === 'mekong' || region.riskFactors.includes('flooding')) {
    recommendations.en.push('Be cautious of waterborne diseases after flooding');
    recommendations.vi.push('Cẩn thận với bệnh lây qua đường nước sau lũ lụt');
  }
  
  if (region.riskFactors.includes('air_pollution')) {
    recommendations.en.push('Monitor air quality index daily');
    recommendations.vi.push('Theo dõi chỉ số chất lượng không khí hàng ngày');
  }
  
  return recommendations;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon, environmentalFactors }: LocationInput = await req.json();
    
    if (!lat || !lon) {
      throw new Error('Latitude and longitude are required');
    }
    
    console.log(`Classifying location: ${lat}, ${lon}`);
    
    // Classify the region
    const region = classifyRegion(lat, lon);
    console.log(`Region classified: ${region.name}`);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch recent observed cases for the region
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: recentCases } = await supabase
      .from('daily_counts')
      .select('disease_code, cases')
      .gte('day', sevenDaysAgo.toISOString().split('T')[0]);
    
    // Aggregate cases by disease
    const casesByDisease: Record<string, number> = {};
    if (recentCases) {
      for (const record of recentCases) {
        const disease = record.disease_code.toLowerCase();
        casesByDisease[disease] = (casesByDisease[disease] || 0) + record.cases;
      }
    }
    
    // Generate risk alerts for relevant diseases
    const alerts: RiskAlert[] = [];
    const relevantDiseases = [...new Set([...region.endemicDiseases, 'covid19', 'influenza', 'ari'])];
    
    for (const disease of relevantDiseases) {
      const profile = DISEASE_PROFILES[disease];
      if (!profile) continue;
      
      const observedCases = casesByDisease[disease] || 0;
      const { risk, factors } = calculateDiseaseRisk(disease, region, environmentalFactors, observedCases);
      
      // Only include diseases with at least LOW risk
      if (risk > 0.1) {
        const riskLevel = getRiskLevel(risk);
        const recommendations = generateRecommendations(disease, riskLevel, region);
        
        const explanation = factors.length > 0 
          ? `Risk factors: ${factors.join(', ')}.`
          : 'Based on regional baseline data.';
        
        const explanationVi = factors.length > 0
          ? `Yếu tố nguy cơ: ${factors.map(f => {
              const translations: Record<string, string> = {
                'Peak season': 'Mùa cao điểm',
                'High population density': 'Mật độ dân số cao',
                'Favorable temperature': 'Nhiệt độ thuận lợi',
                'High humidity': 'Độ ẩm cao',
                'Poor air quality': 'Chất lượng không khí kém'
              };
              return translations[f] || f;
            }).join(', ')}.`
          : 'Dựa trên dữ liệu cơ sở khu vực.';
        
        alerts.push({
          disease,
          diseaseVi: profile.nameVi,
          riskLevel,
          confidence: Math.round(risk * 100),
          explanation,
          explanationVi,
          recommendations: recommendations.en,
          recommendationsVi: recommendations.vi,
          source: 'location-risk-classifier',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Sort by risk level
    const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    alerts.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);
    
    // Calculate overall regional risk
    const maxRisk = alerts.length > 0 ? alerts[0].riskLevel : 'LOW';
    
    // Environmental health advice based on factors
    const environmentalAdvice: { en: string[]; vi: string[] } = { en: [], vi: [] };
    
    if (environmentalFactors?.aqi && environmentalFactors.aqi > 100) {
      if (environmentalFactors.aqi > 150) {
        environmentalAdvice.en.push('Air quality is unhealthy. Avoid outdoor activities.');
        environmentalAdvice.vi.push('Chất lượng không khí không tốt. Hạn chế hoạt động ngoài trời.');
      } else {
        environmentalAdvice.en.push('Air quality is moderate. Sensitive groups should limit outdoor exposure.');
        environmentalAdvice.vi.push('Chất lượng không khí trung bình. Nhóm nhạy cảm nên hạn chế ra ngoài.');
      }
    }
    
    if (environmentalFactors?.temperature && environmentalFactors.temperature > 35) {
      environmentalAdvice.en.push('High temperature warning. Stay hydrated and avoid midday sun.');
      environmentalAdvice.vi.push('Cảnh báo nắng nóng. Uống đủ nước và tránh nắng trưa.');
    }
    
    if (environmentalFactors?.humidity && environmentalFactors.humidity > 85) {
      environmentalAdvice.en.push('High humidity increases heat stress and disease transmission risk.');
      environmentalAdvice.vi.push('Độ ẩm cao làm tăng nguy cơ say nắng và lây truyền bệnh.');
    }
    
    console.log(`Generated ${alerts.length} risk alerts for ${region.name}`);
    
    return new Response(
      JSON.stringify({
        region: {
          id: region.id,
          name: region.name,
          nameVi: region.nameVi,
          type: region.type,
          populationDensity: region.populationDensity,
          climate: region.climate
        },
        overallRiskLevel: maxRisk,
        alerts,
        environmentalAdvice,
        metadata: {
          location: { lat, lon },
          timestamp: new Date().toISOString(),
          alertCount: alerts.length,
          criticalCount: alerts.filter(a => a.riskLevel === 'CRITICAL').length,
          highCount: alerts.filter(a => a.riskLevel === 'HIGH').length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Location risk classification error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
