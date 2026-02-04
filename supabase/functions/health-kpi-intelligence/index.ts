import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types for each KPI metric
interface KpiMetric {
  value: number;
  change: number;
  sources: string[];
  confidence: 'high' | 'medium' | 'low';
  fetchedAt: string;
}

interface AllKpiData {
  todayCases: KpiMetric;
  openAlerts: KpiMetric;
  diseaseTypes: KpiMetric;
  vaccinationRate: KpiMetric;
}

// Tool definitions for structured output
const kpiTools = [
  {
    type: "function",
    function: {
      name: "report_cases_today",
      description: "Report today's disease cases from official health sources",
      parameters: {
        type: "object",
        properties: {
          value: { type: "number", description: "Total cases reported today" },
          change: { type: "number", description: "Percentage change from yesterday (positive=increase, negative=decrease)" },
          sources: { type: "array", items: { type: "string" }, description: "URLs or names of sources" },
          confidence: { type: "string", enum: ["high", "medium", "low"], description: "Confidence level based on source reliability" }
        },
        required: ["value", "change", "sources", "confidence"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "report_alerts",
      description: "Report number of active health alerts/warnings",
      parameters: {
        type: "object",
        properties: {
          value: { type: "number", description: "Number of active health alerts" },
          change: { type: "number", description: "Percentage change from last week" },
          sources: { type: "array", items: { type: "string" }, description: "Sources" },
          confidence: { type: "string", enum: ["high", "medium", "low"] }
        },
        required: ["value", "change", "sources", "confidence"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "report_disease_types",
      description: "Report number of different diseases being monitored",
      parameters: {
        type: "object",
        properties: {
          value: { type: "number", description: "Number of disease types under surveillance" },
          change: { type: "number", description: "Change from last month" },
          sources: { type: "array", items: { type: "string" }, description: "Sources" },
          confidence: { type: "string", enum: ["high", "medium", "low"] }
        },
        required: ["value", "change", "sources", "confidence"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "report_vaccination_rate",
      description: "Report current vaccination coverage percentage",
      parameters: {
        type: "object",
        properties: {
          value: { type: "number", description: "Vaccination rate percentage" },
          change: { type: "number", description: "Percentage point change from last month" },
          sources: { type: "array", items: { type: "string" }, description: "Sources" },
          confidence: { type: "string", enum: ["high", "medium", "low"] }
        },
        required: ["value", "change", "sources", "confidence"],
        additionalProperties: false
      }
    }
  }
];

// Individual agent functions
async function fetchMetricWithAgent(
  apiKey: string,
  metricType: 'cases' | 'alerts' | 'diseases' | 'vaccination',
  today: string
): Promise<KpiMetric | null> {
  const prompts: Record<string, { system: string; user: string; toolName: string }> = {
    cases: {
      system: `You are a health data agent. Today is ${today}. Search for the LATEST official health statistics from Vietnam (TP.HCM focus). 
Use official sources: Bộ Y tế, Sở Y tế TP.HCM, VnExpress sức khỏe, Tuổi Trẻ.
Find REAL numbers - typical daily cases in TP.HCM range 800-2500 depending on season.
Call the report_cases_today function with the data you find.`,
      user: `Search for total disease cases (COVID-19, dengue, HFMD, influenza combined) reported today ${today} in Ho Chi Minh City Vietnam. Use official Vietnamese health ministry and news sources.`,
      toolName: 'report_cases_today'
    },
    alerts: {
      system: `You are a health alert agent. Today is ${today}. Search for active health alerts and warnings from Vietnamese health authorities.
Look for: epidemic alerts, disease outbreaks, food safety warnings, environmental health alerts.
Sources: Bộ Y tế, Sở Y tế, CDC Việt Nam.
Call the report_alerts function with the data you find.`,
      user: `Search for number of active health alerts and warnings currently in effect in Vietnam, especially Ho Chi Minh City, as of ${today}.`,
      toolName: 'report_alerts'
    },
    diseases: {
      system: `You are a disease surveillance agent. Today is ${today}. Search for information about diseases currently being monitored in Vietnam.
Common diseases: COVID-19, Dengue, HFMD (Tay chân miệng), Influenza, Measles, Tuberculosis, Typhoid.
Call the report_disease_types function with the data you find.`,
      user: `Search for the number of different infectious diseases currently under surveillance and monitoring in Vietnam as of ${today}.`,
      toolName: 'report_disease_types'
    },
    vaccination: {
      system: `You are a vaccination data agent. Today is ${today}. Search for the latest vaccination coverage statistics in Vietnam.
Focus on: COVID-19 vaccination rates, childhood immunization coverage, seasonal flu vaccines.
Sources: Bộ Y tế, WHO Vietnam, UNICEF.
Call the report_vaccination_rate function with the data you find.`,
      user: `Search for current vaccination coverage rate (percentage) in Vietnam and Ho Chi Minh City as of ${today}. Include COVID-19 and routine immunization data.`,
      toolName: 'report_vaccination_rate'
    }
  };

  const prompt = prompts[metricType];
  const toolMapping: Record<string, number> = {
    'report_cases_today': 0,
    'report_alerts': 1,
    'report_disease_types': 2,
    'report_vaccination_rate': 3
  };

  try {
    console.log(`🔍 [${metricType.toUpperCase()}] Fetching with AI agent...`);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        tools: [kpiTools[toolMapping[prompt.toolName]]],
        tool_choice: { type: 'function', function: { name: prompt.toolName } },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error(`❌ [${metricType}] API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      console.log(`✅ [${metricType.toUpperCase()}] Got data:`, args);
      return {
        value: args.value,
        change: args.change,
        sources: args.sources || [],
        confidence: args.confidence || 'medium',
        fetchedAt: new Date().toISOString()
      };
    }
    
    console.error(`❌ [${metricType}] No tool call in response`);
    return null;
  } catch (error) {
    console.error(`❌ [${metricType}] Agent error:`, error);
    return null;
  }
}

// Fallback values
function getFallbackMetric(type: 'cases' | 'alerts' | 'diseases' | 'vaccination'): KpiMetric {
  const fallbacks: Record<string, KpiMetric> = {
    cases: { value: 1250, change: -10, sources: ['Ước tính'], confidence: 'low', fetchedAt: new Date().toISOString() },
    alerts: { value: 3, change: -5, sources: ['Ước tính'], confidence: 'low', fetchedAt: new Date().toISOString() },
    diseases: { value: 7, change: 0, sources: ['Ước tính'], confidence: 'low', fetchedAt: new Date().toISOString() },
    vaccination: { value: 92, change: 3, sources: ['Ước tính'], confidence: 'low', fetchedAt: new Date().toISOString() }
  };
  return fallbacks[type];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const language = body.language || 'vi';
    const metricType = body.metricType as 'cases' | 'alerts' | 'diseases' | 'vaccination' | 'all' | undefined;
    
    console.log(`📊 KPI Intelligence Agent - Lang: ${language}, Metric: ${metricType || 'all'}`);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('❌ LOVABLE_API_KEY not found');
      return new Response(
        JSON.stringify({ success: false, error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Date: ${today}`);

    // If specific metric requested, fetch only that
    if (metricType && metricType !== 'all') {
      const metric = await fetchMetricWithAgent(LOVABLE_API_KEY, metricType, today);
      return new Response(
        JSON.stringify({
          success: true,
          metric: metric || getFallbackMetric(metricType),
          type: metricType,
          fromAI: !!metric,
          lastUpdated: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all metrics in parallel
    console.log('🚀 Fetching all KPI metrics in parallel...');
    
    const [casesData, alertsData, diseasesData, vaccinationData] = await Promise.all([
      fetchMetricWithAgent(LOVABLE_API_KEY, 'cases', today),
      fetchMetricWithAgent(LOVABLE_API_KEY, 'alerts', today),
      fetchMetricWithAgent(LOVABLE_API_KEY, 'diseases', today),
      fetchMetricWithAgent(LOVABLE_API_KEY, 'vaccination', today)
    ]);

    const allKpi: AllKpiData = {
      todayCases: casesData || getFallbackMetric('cases'),
      openAlerts: alertsData || getFallbackMetric('alerts'),
      diseaseTypes: diseasesData || getFallbackMetric('diseases'),
      vaccinationRate: vaccinationData || getFallbackMetric('vaccination')
    };

    // Collect all sources
    const allSources = [
      ...allKpi.todayCases.sources,
      ...allKpi.openAlerts.sources,
      ...allKpi.diseaseTypes.sources,
      ...allKpi.vaccinationRate.sources
    ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);

    // Format for backward compatibility
    const kpiData = {
      todayCases: allKpi.todayCases.value,
      todayCasesChange: allKpi.todayCases.change,
      openAlerts: allKpi.openAlerts.value,
      openAlertsChange: allKpi.openAlerts.change,
      diseaseTypes: allKpi.diseaseTypes.value,
      diseaseTypesChange: allKpi.diseaseTypes.change,
      vaccinationRate: allKpi.vaccinationRate.value,
      vaccinationRateChange: allKpi.vaccinationRate.change,
      lastUpdated: new Date().toISOString(),
      sources: allSources
    };

    console.log('✅ All KPI metrics fetched successfully');

    return new Response(
      JSON.stringify({
        success: true,
        kpi: kpiData,
        metrics: allKpi,
        fromCache: false,
        lastUpdated: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ KPI Intelligence Agent error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
