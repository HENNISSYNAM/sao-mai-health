/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ObservedDataPoint {
  date: string;
  disease: string;
  location: string;
  cases: number;
  source: string;
}

interface PredictedDataPoint {
  date: string;
  disease: string;
  location: string;
  scenario: 'best-case' | 'most-likely' | 'worst-case';
  cases: number;
  confidence: 'high' | 'medium' | 'low';
  horizon: '7-day' | '14-day';
  dataType: 'predicted';
  factors: string[];
}

interface ScenarioConfig {
  name: 'best-case' | 'most-likely' | 'worst-case';
  description: string;
  growthModifier: number;
  confidenceDecay: number;
  assumptions: string[];
}

interface PredictionResult {
  success: boolean;
  observedSummary: {
    totalPoints: number;
    diseases: string[];
    locations: string[];
    dateRange: { start: string; end: string };
    avgDailyCases: Record<string, number>;
    trends: Record<string, 'increasing' | 'decreasing' | 'stable'>;
  };
  predictions: PredictedDataPoint[];
  scenarios: {
    'best-case': { description: string; assumptions: string[]; totalPredictedCases: number };
    'most-likely': { description: string; assumptions: string[]; totalPredictedCases: number };
    'worst-case': { description: string; assumptions: string[]; totalPredictedCases: number };
  };
  chartData: {
    timeSeriesWithScenarios: any[];
    scenarioComparison: any[];
    confidenceBands: any[];
  };
  generatedAt: string;
  modelVersion: string;
}

const SCENARIO_CONFIGS: ScenarioConfig[] = [
  {
    name: 'best-case',
    description: 'Effective interventions, favorable conditions',
    growthModifier: -0.15, // 15% reduction per week
    confidenceDecay: 0.12, // Faster confidence decay
    assumptions: [
      'Immediate public health interventions',
      'High community compliance',
      'Favorable weather conditions',
      'No new disease variants'
    ]
  },
  {
    name: 'most-likely',
    description: 'Current trends continue with minor variations',
    growthModifier: 0.02, // 2% growth per week
    confidenceDecay: 0.08, // Moderate confidence decay
    assumptions: [
      'Current intervention levels maintained',
      'Average community response',
      'Normal seasonal patterns',
      'No major disruptions'
    ]
  },
  {
    name: 'worst-case',
    description: 'Escalation without effective control',
    growthModifier: 0.25, // 25% growth per week
    confidenceDecay: 0.15, // Fastest confidence decay
    assumptions: [
      'Delayed or ineffective interventions',
      'Low community compliance',
      'Unfavorable environmental conditions',
      'Potential new variants or strains'
    ]
  }
];

const DISEASE_CONFIG: Record<string, { 
  seasonalFactor: number; 
  volatility: number;
  incubationDays: number;
}> = {
  'A90': { seasonalFactor: 1.2, volatility: 0.15, incubationDays: 5 }, // Dengue - monsoon peak
  'U07.1': { seasonalFactor: 0.9, volatility: 0.20, incubationDays: 5 }, // COVID-19
  'B08.4': { seasonalFactor: 1.1, volatility: 0.12, incubationDays: 4 }, // HFMD
  'J10': { seasonalFactor: 1.3, volatility: 0.18, incubationDays: 2 }, // Influenza
  'J06.9': { seasonalFactor: 1.0, volatility: 0.10, incubationDays: 3 }, // ARI
};

function calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 3) return 'stable';
  
  const recentAvg = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const earlierAvg = values.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, values.slice(0, 3).length);
  
  const changePercent = ((recentAvg - earlierAvg) / earlierAvg) * 100;
  
  if (changePercent > 10) return 'increasing';
  if (changePercent < -10) return 'decreasing';
  return 'stable';
}

function calculateConfidence(daysAhead: number, scenario: ScenarioConfig): 'high' | 'medium' | 'low' {
  const confidenceScore = 1 - (daysAhead * scenario.confidenceDecay / 7);
  
  if (confidenceScore > 0.7) return 'high';
  if (confidenceScore > 0.4) return 'medium';
  return 'low';
}

function generatePrediction(
  baseValue: number,
  daysAhead: number,
  scenario: ScenarioConfig,
  trend: 'increasing' | 'decreasing' | 'stable',
  diseaseCode: string
): number {
  const diseaseConfig = DISEASE_CONFIG[diseaseCode] || { 
    seasonalFactor: 1.0, 
    volatility: 0.15,
    incubationDays: 4 
  };
  
  // Base growth from scenario
  const weeklyGrowth = scenario.growthModifier;
  const dailyGrowth = Math.pow(1 + weeklyGrowth, 1/7) - 1;
  
  // Trend adjustment
  let trendMultiplier = 1.0;
  if (trend === 'increasing') trendMultiplier = 1.05;
  if (trend === 'decreasing') trendMultiplier = 0.95;
  
  // Seasonal adjustment (simplified - would use actual calendar in production)
  const seasonalAdjustment = diseaseConfig.seasonalFactor;
  
  // Calculate prediction with compounding
  let prediction = baseValue;
  for (let day = 1; day <= daysAhead; day++) {
    // Apply daily growth
    prediction *= (1 + dailyGrowth);
    
    // Apply trend influence (decays over time)
    prediction *= Math.pow(trendMultiplier, 1 / (day + 1));
    
    // Add some controlled randomness based on disease volatility
    const randomFactor = 1 + (Math.random() - 0.5) * diseaseConfig.volatility * 0.5;
    prediction *= randomFactor;
  }
  
  // Apply seasonal adjustment
  prediction *= seasonalAdjustment;
  
  // Ensure non-negative integer
  return Math.max(0, Math.round(prediction));
}

// Quick evolution prediction mode for Living AI - now uses DB news data + AI deep analysis
async function handleEvolutionPrediction(body: any) {
  const { lat, lng, region, currentMonth } = body;
  const month = currentMonth || new Date().getMonth() + 1;
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Regional modifier based on location
  const regionModifiers: Record<string, number> = {
    'hcmc_metro': 1.3,
    'hanoi_metro': 1.25,
    'mekong_delta': 1.4,
    'southeast': 1.2,
    'south_central': 1.15,
    'central_highlands': 0.9
  };
  const modifier = regionModifiers[region || 'hcmc_metro'] || 1.0;

  // ===== STEP 1: Query real data from health_news_articles =====
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const { data: newsArticles } = await supabase
    .from('health_news_articles')
    .select('title, content_summary, disease_type, severity, published_at, crawled_at')
    .gte('crawled_at', sevenDaysAgo)
    .order('crawled_at', { ascending: false })
    .limit(50);

  // Also get daily_counts from DB
  const { data: dailyCounts } = await supabase
    .from('daily_counts')
    .select('day, disease_code, cases')
    .gte('day', sevenDaysAgo)
    .order('day', { ascending: false });

  // ===== STEP 2: Extract real case numbers per disease from news =====
  const diseaseDataFromNews: Record<string, { cases: number[]; severities: string[]; articles: string[] }> = {};
  
  const diseaseKeywords: Record<string, string[]> = {
    dengue: ['dengue', 'sốt xuất huyết', 'sxh'],
    hfmd: ['hfmd', 'tay chân miệng', 'tcm', 'hand foot mouth'],
    measles: ['measles', 'sởi'],
    influenza: ['influenza', 'cúm', 'flu'],
    covid19: ['covid', 'sars-cov', 'corona'],
    rabies: ['rabies', 'dại', 'chó cắn'],
  };

  for (const article of (newsArticles || [])) {
    const text = `${article.title} ${article.content_summary || ''} ${article.disease_type || ''}`.toLowerCase();
    
    for (const [disease, keywords] of Object.entries(diseaseKeywords)) {
      if (keywords.some(kw => text.includes(kw))) {
        if (!diseaseDataFromNews[disease]) {
          diseaseDataFromNews[disease] = { cases: [], severities: [], articles: [] };
        }
        // Extract case numbers
        const casePatterns = [
          /(\d{1,3}(?:[.,]\d{3})*)\s*ca\b/gi,
          /(\d{1,3}(?:[.,]\d{3})*)\s*cases?\b/gi,
          /(\d{1,3}(?:[.,]\d{3})*)\s*ca\s*mắc/gi,
          /(\d{1,3}(?:[.,]\d{3})*)\s*người\s*mắc/gi,
        ];
        for (const pattern of casePatterns) {
          let match;
          while ((match = pattern.exec(text)) !== null) {
            const num = parseInt(match[1].replace(/\./g, '').replace(/,/g, ''));
            if (num > 0 && num < 100000) diseaseDataFromNews[disease].cases.push(num);
          }
        }
        if (article.severity) diseaseDataFromNews[disease].severities.push(article.severity);
        diseaseDataFromNews[disease].articles.push(article.title);
      }
    }
  }

  // Merge with daily_counts DB data
  const diseaseFromDB: Record<string, number> = {};
  const diseaseCodeMap: Record<string, string> = {
    'A90': 'dengue', 'dengue': 'dengue',
    'U07.1': 'covid19', 'covid19': 'covid19', 'covid': 'covid19',
    'B08.4': 'hfmd', 'hfmd': 'hfmd',
    'J10': 'influenza', 'influenza': 'influenza',
    'B05': 'measles', 'measles': 'measles',
  };
  
  for (const row of (dailyCounts || [])) {
    const mapped = diseaseCodeMap[row.disease_code] || row.disease_code;
    diseaseFromDB[mapped] = (diseaseFromDB[mapped] || 0) + row.cases;
  }

  console.log(`📰 News data: ${Object.keys(diseaseDataFromNews).length} diseases found`);
  console.log(`📊 DB counts: ${Object.keys(diseaseFromDB).length} diseases found`);

  // ===== STEP 3: Use AI to generate deep predictions from real data =====
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  let aiPredictions: Record<string, any> = {};

  if (LOVABLE_API_KEY && (Object.keys(diseaseDataFromNews).length > 0 || Object.keys(diseaseFromDB).length > 0)) {
    // Build context from real data
    const dataContext = Object.entries(diseaseDataFromNews).map(([disease, data]) => {
      const avgCases = data.cases.length > 0 ? Math.round(data.cases.reduce((a, b) => a + b, 0) / data.cases.length) : 0;
      const maxCases = data.cases.length > 0 ? Math.max(...data.cases) : 0;
      const hasCritical = data.severities.includes('critical') || data.severities.includes('high');
      return `- ${disease}: ${data.cases.length} reports, avg=${avgCases}, max=${maxCases}, severity=${hasCritical ? 'HIGH' : 'normal'}, headlines: ${data.articles.slice(0, 2).join('; ')}`;
    }).join('\n');

    const dbContext = Object.entries(diseaseFromDB).map(([d, c]) => `- ${d}: ${c} total cases (7d DB)`).join('\n');

    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: `You are an epidemiological deep learning prediction engine for Vietnam (${region || 'hcmc_metro'}). Month: ${month}. Use the REAL data below to generate 7-day and 14-day forecasts. Apply epidemiological models (SIR/SEIR-inspired trends). Be realistic.` },
            { role: 'user', content: `Real data from health news (last 7 days):\n${dataContext || 'No news data'}\n\nDB verified counts:\n${dbContext || 'No DB data'}\n\nGenerate predictions for each disease. Call the function.` }
          ],
          tools: [{
            type: "function",
            function: {
              name: "predict_diseases",
              description: "Return predictions for each disease",
              parameters: {
                type: "object",
                properties: {
                  diseases: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Disease code: dengue, hfmd, measles, influenza, covid19, rabies" },
                        currentCases: { type: "number" },
                        predicted7d: { type: "number" },
                        predicted14d: { type: "number" },
                        confidence: { type: "number", description: "0-1" },
                        trend: { type: "string", enum: ["accelerating", "emerging", "stable", "declining"] },
                        insight: { type: "string", description: "Brief English insight" },
                        insightVi: { type: "string", description: "Brief Vietnamese insight" },
                        peakDate: { type: "string", description: "Expected peak in Vietnamese" }
                      },
                      required: ["name", "currentCases", "predicted7d", "predicted14d", "confidence", "trend", "insight", "insightVi"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["diseases"],
                additionalProperties: false
              }
            }
          }],
          tool_choice: { type: 'function', function: { name: 'predict_diseases' } },
          temperature: 0.2,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          const args = JSON.parse(toolCall.function.arguments);
          for (const d of (args.diseases || [])) {
            aiPredictions[d.name] = {
              currentCases: d.currentCases,
              predicted7d: d.predicted7d,
              predicted14d: d.predicted14d,
              confidence: d.confidence || 0.75,
              spreadAreas: getSpreadAreas(region || 'hcmc_metro'),
              insight: d.insight,
              insightVi: d.insightVi,
              peakDate: d.peakDate,
              trend: d.trend || 'stable'
            };
          }
          console.log(`🤖 AI predictions generated for ${args.diseases?.length || 0} diseases`);
        }
      } else {
        console.error('AI prediction error:', response.status);
      }
    } catch (aiErr) {
      console.error('AI prediction call failed:', aiErr);
    }
  }

  // ===== STEP 4: Merge all data sources → final predictions =====
  const diseases: Record<string, { peakMonths: number[]; baseline: number }> = {
    dengue: { peakMonths: [5,6,7,8,9,10,11], baseline: 80 },
    hfmd: { peakMonths: [3,4,5,9,10,11], baseline: 50 },
    measles: { peakMonths: [1,2,3,4], baseline: 5 },
    rabies: { peakMonths: [], baseline: 2 },
    influenza: { peakMonths: [11,12,1,2,3], baseline: 100 },
    covid19: { peakMonths: [], baseline: 50 }
  };

  const predictions: Record<string, any> = {};
  
  for (const [disease, config] of Object.entries(diseases)) {
    const inPeak = config.peakMonths.includes(month);
    
    // Priority: AI prediction > News data > DB data > Seasonal fallback
    if (aiPredictions[disease]) {
      predictions[disease] = aiPredictions[disease];
    } else {
      const newsData = diseaseDataFromNews[disease];
      const dbCases = diseaseFromDB[disease];
      
      let currentCases: number;
      if (newsData && newsData.cases.length > 0) {
        currentCases = Math.round(newsData.cases.reduce((a, b) => a + b, 0) / newsData.cases.length);
      } else if (dbCases) {
        currentCases = Math.round(dbCases / 7); // daily avg
      } else {
        const variance = 0.85 + Math.random() * 0.3;
        currentCases = Math.round(config.baseline * modifier * variance * (inPeak ? 1.3 : 0.7));
      }
      
      const growth = inPeak ? 1.15 : 0.98;
      predictions[disease] = {
        currentCases,
        predicted7d: Math.round(currentCases * growth),
        predicted14d: Math.round(currentCases * growth * growth),
        confidence: newsData ? 0.8 : dbCases ? 0.75 : 0.6,
        spreadAreas: getSpreadAreas(region || 'hcmc_metro'),
        insight: `${disease} is ${inPeak ? 'in peak season' : 'at baseline'}`,
        insightVi: `${disease} ${inPeak ? 'đang vào mùa cao điểm' : 'ở mức nền'}`,
        trend: growth > 1.1 ? 'accelerating' : growth > 1.02 ? 'emerging' : growth < 0.9 ? 'declining' : 'stable'
      };
    }
  }
  
  return predictions;
}

function getSpreadAreas(region: string): string[] {
  const areaMap: Record<string, string[]> = {
    'hcmc_metro': ['Bình Thạnh', 'Thủ Đức', 'Quận 7', 'Gò Vấp'],
    'hanoi_metro': ['Hoàng Mai', 'Thanh Xuân', 'Cầu Giấy', 'Đống Đa'],
    'mekong_delta': ['Cần Thơ', 'Long An', 'Tiền Giang']
  };
  return areaMap[region] || ['Khu vực lân cận'];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for evolution prediction mode (fast path for Living AI)
    const body = await req.json();
    
    if (body.mode === 'evolution_prediction') {
      const predictions = await handleEvolutionPrediction(body);
      return new Response(JSON.stringify(predictions), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const vietnamTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    
    console.log(`🔮 Predictive Public Health Scenario Agent started at ${vietnamTime.toISOString()}`);

    // Step 1: Fetch observed data from last 14 days
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { data: observedData, error: fetchError } = await supabase
      .from('daily_counts')
      .select('*')
      .gte('day', fourteenDaysAgo)
      .order('day', { ascending: true });

    if (fetchError) {
      console.error('Error fetching observed data:', fetchError);
    }

    // Process observed data or use fallback
    let processedObserved: ObservedDataPoint[] = [];
    
    if (observedData && observedData.length > 0) {
      processedObserved = observedData.map(row => ({
        date: row.day,
        disease: row.disease_code,
        location: row.district_id || 'VN',
        cases: row.cases,
        source: 'database'
      }));
    } else {
      // Generate synthetic observed data for demo
      console.log('⚠️ No observed data found, generating synthetic baseline');
      const diseases = ['A90', 'U07.1', 'B08.4', 'J10', 'J06.9'];
      const baseCases = { 'A90': 2500, 'U07.1': 150, 'B08.4': 1200, 'J10': 800, 'J06.9': 3500 };
      
      for (let i = 13; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        diseases.forEach(disease => {
          const base = baseCases[disease as keyof typeof baseCases] || 1000;
          const trend = Math.sin(i * 0.3) * base * 0.1;
          const random = (Math.random() - 0.5) * base * 0.15;
          
          processedObserved.push({
            date: dateStr,
            disease,
            location: 'VN',
            cases: Math.max(0, Math.round(base + trend + random)),
            source: 'synthetic'
          });
        });
      }
    }

    // Step 2: Analyze observed data
    const diseases = [...new Set(processedObserved.map(d => d.disease))];
    const locations = [...new Set(processedObserved.map(d => d.location))];
    const dates = [...new Set(processedObserved.map(d => d.date))].sort();
    
    // Calculate average daily cases and trends per disease
    const avgDailyCases: Record<string, number> = {};
    const trends: Record<string, 'increasing' | 'decreasing' | 'stable'> = {};
    const latestValues: Record<string, number> = {};
    
    diseases.forEach(disease => {
      const diseaseData = processedObserved
        .filter(d => d.disease === disease)
        .sort((a, b) => a.date.localeCompare(b.date));
      
      const values = diseaseData.map(d => d.cases);
      avgDailyCases[disease] = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
      trends[disease] = calculateTrend(values);
      latestValues[disease] = values[values.length - 1] || avgDailyCases[disease];
    });

    console.log(`📊 Analyzed ${processedObserved.length} observed data points`);
    console.log(`📈 Trends: ${JSON.stringify(trends)}`);

    // Step 3: Generate predictions for each scenario
    const predictions: PredictedDataPoint[] = [];
    const today = vietnamTime.toISOString().split('T')[0];
    
    diseases.forEach(disease => {
      const baseValue = latestValues[disease];
      const trend = trends[disease];
      
      SCENARIO_CONFIGS.forEach(scenario => {
        // Generate 7-day and 14-day predictions
        for (let day = 1; day <= 14; day++) {
          const futureDate = new Date(vietnamTime.getTime() + day * 24 * 60 * 60 * 1000);
          const dateStr = futureDate.toISOString().split('T')[0];
          const horizon: '7-day' | '14-day' = day <= 7 ? '7-day' : '14-day';
          
          const predictedCases = generatePrediction(baseValue, day, scenario, trend, disease);
          const confidence = calculateConfidence(day, scenario);
          
          predictions.push({
            date: dateStr,
            disease,
            location: 'VN',
            scenario: scenario.name,
            cases: predictedCases,
            confidence,
            horizon,
            dataType: 'predicted',
            factors: scenario.assumptions.slice(0, 2)
          });
        }
      });
    });

    console.log(`🔮 Generated ${predictions.length} prediction data points`);

    // Step 4: Build scenario summaries
    const scenarioSummaries: PredictionResult['scenarios'] = {
      'best-case': {
        description: SCENARIO_CONFIGS[0].description,
        assumptions: SCENARIO_CONFIGS[0].assumptions,
        totalPredictedCases: predictions
          .filter(p => p.scenario === 'best-case')
          .reduce((sum, p) => sum + p.cases, 0)
      },
      'most-likely': {
        description: SCENARIO_CONFIGS[1].description,
        assumptions: SCENARIO_CONFIGS[1].assumptions,
        totalPredictedCases: predictions
          .filter(p => p.scenario === 'most-likely')
          .reduce((sum, p) => sum + p.cases, 0)
      },
      'worst-case': {
        description: SCENARIO_CONFIGS[2].description,
        assumptions: SCENARIO_CONFIGS[2].assumptions,
        totalPredictedCases: predictions
          .filter(p => p.scenario === 'worst-case')
          .reduce((sum, p) => sum + p.cases, 0)
      }
    };

    // Step 5: Build chart-ready data
    const allDates = [
      ...dates.slice(-7), // Last 7 days of observed
      ...Array.from({ length: 14 }, (_, i) => {
        const d = new Date(vietnamTime.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
        return d.toISOString().split('T')[0];
      })
    ];

    const timeSeriesWithScenarios = allDates.map(date => {
      const entry: any = {
        date,
        displayDate: new Date(date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' }),
        isObserved: dates.includes(date),
        isPredicted: !dates.includes(date)
      };

      // Add observed totals
      const observedForDate = processedObserved.filter(d => d.date === date);
      if (observedForDate.length > 0) {
        entry.observed = observedForDate.reduce((sum, d) => sum + d.cases, 0);
        
        // Add per-disease observed
        diseases.forEach(disease => {
          const diseaseData = observedForDate.find(d => d.disease === disease);
          entry[`observed_${disease}`] = diseaseData?.cases || null;
        });
      }

      // Add predicted scenarios
      const predictedForDate = predictions.filter(p => p.date === date);
      if (predictedForDate.length > 0) {
        SCENARIO_CONFIGS.forEach(scenario => {
          const scenarioPreds = predictedForDate.filter(p => p.scenario === scenario.name);
          entry[scenario.name] = scenarioPreds.reduce((sum, p) => sum + p.cases, 0);
          entry[`${scenario.name}_confidence`] = scenarioPreds[0]?.confidence || 'low';
          
          // Add per-disease predictions
          diseases.forEach(disease => {
            const diseaseData = scenarioPreds.find(p => p.disease === disease);
            entry[`${scenario.name}_${disease}`] = diseaseData?.cases || null;
          });
        });
      }

      return entry;
    });

    // Scenario comparison for bar chart
    const scenarioComparison = diseases.map(disease => {
      const entry: any = { disease };
      
      // Current (latest observed)
      entry.current = latestValues[disease];
      
      // 7-day predictions
      const sevenDayPreds = predictions.filter(p => 
        p.disease === disease && p.horizon === '7-day'
      );
      entry['7d_best'] = sevenDayPreds.find(p => p.scenario === 'best-case' && p.date === allDates[dates.length + 6])?.cases || 0;
      entry['7d_likely'] = sevenDayPreds.find(p => p.scenario === 'most-likely' && p.date === allDates[dates.length + 6])?.cases || 0;
      entry['7d_worst'] = sevenDayPreds.find(p => p.scenario === 'worst-case' && p.date === allDates[dates.length + 6])?.cases || 0;
      
      // 14-day predictions
      entry['14d_best'] = predictions.find(p => p.disease === disease && p.scenario === 'best-case' && p.horizon === '14-day')?.cases || 0;
      entry['14d_likely'] = predictions.find(p => p.disease === disease && p.scenario === 'most-likely' && p.horizon === '14-day')?.cases || 0;
      entry['14d_worst'] = predictions.find(p => p.disease === disease && p.scenario === 'worst-case' && p.horizon === '14-day')?.cases || 0;
      
      return entry;
    });

    // Confidence bands
    const confidenceBands = allDates.filter(d => !dates.includes(d)).map(date => {
      const predsForDate = predictions.filter(p => p.date === date);
      const bestCase = predsForDate.filter(p => p.scenario === 'best-case').reduce((s, p) => s + p.cases, 0);
      const worstCase = predsForDate.filter(p => p.scenario === 'worst-case').reduce((s, p) => s + p.cases, 0);
      const mostLikely = predsForDate.filter(p => p.scenario === 'most-likely').reduce((s, p) => s + p.cases, 0);
      
      return {
        date,
        displayDate: new Date(date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' }),
        lower: bestCase,
        upper: worstCase,
        mid: mostLikely,
        confidence: predsForDate[0]?.confidence || 'low'
      };
    });

    const result: PredictionResult = {
      success: true,
      observedSummary: {
        totalPoints: processedObserved.length,
        diseases,
        locations,
        dateRange: { start: dates[0], end: dates[dates.length - 1] },
        avgDailyCases,
        trends
      },
      predictions,
      scenarios: scenarioSummaries,
      chartData: {
        timeSeriesWithScenarios,
        scenarioComparison,
        confidenceBands
      },
      generatedAt: vietnamTime.toISOString(),
      modelVersion: '1.0.0-scenario'
    };

    console.log(`✅ Prediction Agent completed: ${predictions.length} predictions across 3 scenarios`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Prediction Agent error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      predictions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
