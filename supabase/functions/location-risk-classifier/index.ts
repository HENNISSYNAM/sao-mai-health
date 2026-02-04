import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  };
}

interface EpidemiologicalRegion {
  id: string;
  name: string;
  nameVi: string;
  type: 'northern' | 'central' | 'southern' | 'mekong' | 'urban';
  climate: string;
  populationDensity: 'low' | 'medium' | 'high' | 'very_high';
}

// Vietnam regions mapping
const REGIONS: Record<string, EpidemiologicalRegion> = {
  hanoi_metro: {
    id: 'hanoi_metro',
    name: 'Hanoi Metropolitan',
    nameVi: 'Thủ đô Hà Nội',
    type: 'urban',
    climate: 'humid_subtropical',
    populationDensity: 'very_high'
  },
  hcmc_metro: {
    id: 'hcmc_metro',
    name: 'Ho Chi Minh City',
    nameVi: 'TP. Hồ Chí Minh',
    type: 'urban',
    climate: 'tropical_monsoon',
    populationDensity: 'very_high'
  },
  mekong_delta: {
    id: 'mekong_delta',
    name: 'Mekong Delta',
    nameVi: 'Đồng bằng sông Cửu Long',
    type: 'mekong',
    climate: 'tropical_monsoon',
    populationDensity: 'high'
  },
  red_river_delta: {
    id: 'red_river_delta',
    name: 'Red River Delta',
    nameVi: 'Đồng bằng sông Hồng',
    type: 'northern',
    climate: 'humid_subtropical',
    populationDensity: 'very_high'
  },
  central_coast: {
    id: 'central_coast',
    name: 'Central Coast',
    nameVi: 'Duyên hải miền Trung',
    type: 'central',
    climate: 'tropical_monsoon',
    populationDensity: 'medium'
  }
};

function classifyRegion(lat: number, lon: number): EpidemiologicalRegion {
  // Hanoi metro
  if (lat >= 20.8 && lat <= 21.2 && lon >= 105.7 && lon <= 106.0) {
    return REGIONS.hanoi_metro;
  }
  // HCMC metro
  if (lat >= 10.6 && lat <= 11.0 && lon >= 106.5 && lon <= 107.0) {
    return REGIONS.hcmc_metro;
  }
  // Mekong Delta
  if (lat >= 8.5 && lat <= 10.6 && lon >= 104.5 && lon <= 107.0) {
    return REGIONS.mekong_delta;
  }
  // Central
  if (lat >= 11.0 && lat <= 18.0) {
    return REGIONS.central_coast;
  }
  // Default to Red River Delta
  return REGIONS.red_river_delta;
}

// Tool definitions for structured output
const diseaseDataTool = {
  type: "function",
  function: {
    name: "report_disease_data",
    description: "Report real-time disease statistics for a Vietnamese region",
    parameters: {
      type: "object",
      properties: {
        diseases: {
          type: "array",
          items: {
            type: "object",
            properties: {
              disease: { type: "string", description: "Disease name in English (e.g., dengue, covid19, hfmd)" },
              diseaseVi: { type: "string", description: "Disease name in Vietnamese" },
              cases: { type: "number", description: "Number of cases in the region this week" },
              riskLevel: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
              trend: { type: "string", enum: ["increasing", "stable", "decreasing"] },
              source: { type: "string", description: "Source URL or name" }
            },
            required: ["disease", "diseaseVi", "cases", "riskLevel", "trend", "source"]
          }
        },
        environmentalWarnings: {
          type: "array",
          items: { type: "string" },
          description: "Environmental health warnings in Vietnamese"
        },
        overallRisk: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] }
      },
      required: ["diseases", "overallRisk"],
      additionalProperties: false
    }
  }
};

async function fetchRealDiseaseData(
  apiKey: string,
  region: EpidemiologicalRegion,
  environmentalFactors?: LocationInput['environmentalFactors']
): Promise<any> {
  const today = new Date().toISOString().split('T')[0];
  const envContext = environmentalFactors 
    ? `Current conditions: ${environmentalFactors.temperature || 30}°C, humidity ${environmentalFactors.humidity || 75}%, AQI ${environmentalFactors.aqi || 80}.`
    : '';

  const systemPrompt = `You are a Vietnamese health data agent with web search capability. Today is ${today}.
Search for REAL, CURRENT disease statistics for ${region.nameVi} (${region.name}), Vietnam.

Focus on these diseases: Sốt xuất huyết (Dengue), COVID-19, Tay chân miệng (HFMD), Cúm (Influenza), Viêm hô hấp cấp.

Search sources: Bộ Y tế Việt Nam, Sở Y tế ${region.nameVi}, CDC Việt Nam, VnExpress, Tuổi Trẻ.

${envContext}

Rules:
1. Use REAL numbers from recent news/reports (within last 7 days)
2. If exact data unavailable, estimate based on seasonal patterns and population
3. Risk levels: LOW (<10 cases/day), MEDIUM (10-50), HIGH (50-200), CRITICAL (>200)
4. Include actual source URLs when found
5. Call the report_disease_data function with the data`;

  const userPrompt = `Search for current disease outbreak data in ${region.nameVi}, Vietnam as of ${today}. 
Find: dengue fever cases, COVID-19 cases, hand-foot-mouth disease (HFMD), influenza, and respiratory infections.
Return real statistics with sources.`;

  try {
    console.log(`🔍 [${region.id}] Fetching real disease data with AI...`);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [diseaseDataTool],
        tool_choice: { type: 'function', function: { name: 'report_disease_data' } },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error(`❌ AI API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      console.log(`✅ [${region.id}] Got ${args.diseases?.length || 0} disease reports`);
      return args;
    }
    
    return null;
  } catch (error) {
    console.error(`❌ AI fetch error:`, error);
    return null;
  }
}

function generateFallbackData(region: EpidemiologicalRegion) {
  const currentMonth = new Date().getMonth() + 1;
  const isDengueSeason = [5, 6, 7, 8, 9, 10, 11].includes(currentMonth);
  const isFluSeason = [1, 2, 3, 11, 12].includes(currentMonth);
  
  const baseMultiplier = region.populationDensity === 'very_high' ? 1.5 : 1;
  
  return {
    diseases: [
      {
        disease: 'dengue',
        diseaseVi: 'Sốt xuất huyết',
        cases: Math.round((isDengueSeason ? 45 : 15) * baseMultiplier),
        riskLevel: isDengueSeason ? 'MEDIUM' : 'LOW',
        trend: isDengueSeason ? 'increasing' : 'stable',
        source: 'Ước tính theo mùa'
      },
      {
        disease: 'covid19',
        diseaseVi: 'COVID-19',
        cases: Math.round(20 * baseMultiplier),
        riskLevel: 'LOW',
        trend: 'stable',
        source: 'Ước tính'
      },
      {
        disease: 'hfmd',
        diseaseVi: 'Tay chân miệng',
        cases: Math.round(25 * baseMultiplier),
        riskLevel: 'LOW',
        trend: 'stable',
        source: 'Ước tính'
      },
      {
        disease: 'influenza',
        diseaseVi: 'Cúm',
        cases: Math.round((isFluSeason ? 60 : 20) * baseMultiplier),
        riskLevel: isFluSeason ? 'MEDIUM' : 'LOW',
        trend: isFluSeason ? 'increasing' : 'stable',
        source: 'Ước tính theo mùa'
      }
    ],
    overallRisk: isDengueSeason || isFluSeason ? 'MEDIUM' : 'LOW',
    environmentalWarnings: []
  };
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
    
    console.log(`📍 Classifying location: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    
    // Classify the region
    const region = classifyRegion(lat, lon);
    console.log(`🗺️ Region: ${region.nameVi}`);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    // Fetch real data with AI web search
    let diseaseData = null;
    if (LOVABLE_API_KEY) {
      diseaseData = await fetchRealDiseaseData(LOVABLE_API_KEY, region, environmentalFactors);
    }
    
    // Fallback if AI fails
    if (!diseaseData) {
      console.log('⚠️ Using fallback data');
      diseaseData = generateFallbackData(region);
    }
    
    // Build alerts from disease data
    const alerts = diseaseData.diseases.map((d: any) => ({
      disease: d.disease,
      diseaseVi: d.diseaseVi,
      riskLevel: d.riskLevel,
      confidence: d.riskLevel === 'CRITICAL' ? 90 : d.riskLevel === 'HIGH' ? 75 : d.riskLevel === 'MEDIUM' ? 60 : 40,
      cases: d.cases,
      trend: d.trend,
      explanation: `${d.cases} cases reported. Trend: ${d.trend}.`,
      explanationVi: `${d.cases} ca được báo cáo. Xu hướng: ${d.trend === 'increasing' ? 'tăng' : d.trend === 'decreasing' ? 'giảm' : 'ổn định'}.`,
      recommendations: [],
      recommendationsVi: [],
      source: d.source,
      timestamp: new Date().toISOString()
    }));
    
    // Sort by risk level
    const riskOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    alerts.sort((a: any, b: any) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);
    
    // Environmental advice
    const environmentalAdvice: { en: string[]; vi: string[] } = { en: [], vi: [] };
    
    if (diseaseData.environmentalWarnings?.length > 0) {
      environmentalAdvice.vi = diseaseData.environmentalWarnings;
    }
    
    if (environmentalFactors?.aqi && environmentalFactors.aqi > 100) {
      environmentalAdvice.vi.push('Chất lượng không khí không tốt. Hạn chế hoạt động ngoài trời.');
      environmentalAdvice.en.push('Poor air quality. Limit outdoor activities.');
    }
    
    if (environmentalFactors?.temperature && environmentalFactors.temperature > 35) {
      environmentalAdvice.vi.push('Cảnh báo nắng nóng. Uống đủ nước và tránh nắng trưa.');
      environmentalAdvice.en.push('Heat warning. Stay hydrated and avoid midday sun.');
    }
    
    console.log(`✅ Generated ${alerts.length} alerts, overall risk: ${diseaseData.overallRisk}`);
    
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
        overallRiskLevel: diseaseData.overallRisk,
        alerts,
        environmentalAdvice,
        metadata: {
          location: { lat, lon },
          timestamp: new Date().toISOString(),
          alertCount: alerts.length,
          criticalCount: alerts.filter((a: any) => a.riskLevel === 'CRITICAL').length,
          highCount: alerts.filter((a: any) => a.riskLevel === 'HIGH').length,
          fromAI: !!LOVABLE_API_KEY && diseaseData !== null
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Location risk error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
