import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsData {
  pollution: {
    current: { aqi: number; pm25: number; pm10: number; o3: number; no2: number };
    forecast: { time: string; aqi: number; pm25: number }[];
    byDistrict: { district: string; aqi: number; risk: string }[];
  };
  weather: {
    current: { temp: number; humidity: number; pressure: number; wind: number };
    forecast: { time: string; temp: number; pressure: number }[];
  };
  strokeCases: {
    today: number;
    week: number;
    month: number;
    trend: number;
    byDistrict: { district: string; cases: number; change: number }[];
    byAge: { ageGroup: string; cases: number; percentage: number }[];
    hourly: { hour: string; cases: number }[];
  };
  mlPredictions: {
    riskByDistrict: { district: string; riskScore: number; predicted: number; factors: string[] }[];
    timeSeries: { date: string; actual: number; predicted: number }[];
    hotspots: { lat: number; lng: number; risk: number; name: string }[];
  };
  commercialInsights: {
    hospitalCapacity: { name: string; capacity: number; current: number }[];
    ambulanceAvailability: number;
    emergencyResponseTime: number;
    marketTrends: { metric: string; value: number; change: number }[];
  };
  lastUpdated: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const { location = 'Ho Chi Minh City' } = await req.json().catch(() => ({}));

    console.log(`Fetching analytics data for: ${location}`);

    // Generate comprehensive prompt for Gemini
    const systemPrompt = `You are a health data analytics AI. Return ONLY valid JSON with real-time estimated data for ${location}, Vietnam.
    
Return data in this exact format without any markdown or explanation:
{
  "pollution": {
    "current": { "aqi": <number 0-500>, "pm25": <number>, "pm10": <number>, "o3": <number>, "no2": <number> },
    "forecast": [{"time": "<ISO string>", "aqi": <number>, "pm25": <number>}],
    "byDistrict": [{"district": "<name>", "aqi": <number>, "risk": "<LOW|MEDIUM|HIGH|CRITICAL>"}]
  },
  "weather": {
    "current": { "temp": <number celsius>, "humidity": <number %>, "pressure": <number hPa>, "wind": <number km/h> },
    "forecast": [{"time": "<ISO string>", "temp": <number>, "pressure": <number>}]
  },
  "strokeCases": {
    "today": <number>,
    "week": <number>,
    "month": <number>,
    "trend": <percentage change number>,
    "byDistrict": [{"district": "<name>", "cases": <number>, "change": <percentage>}],
    "byAge": [{"ageGroup": "<range>", "cases": <number>, "percentage": <number>}],
    "hourly": [{"hour": "<HH:00>", "cases": <number>}]
  },
  "mlPredictions": {
    "riskByDistrict": [{"district": "<name>", "riskScore": <0-100>, "predicted": <cases>, "factors": ["<factor>"]}],
    "timeSeries": [{"date": "<YYYY-MM-DD>", "actual": <number>, "predicted": <number>}],
    "hotspots": [{"lat": <number>, "lng": <number>, "risk": <0-100>, "name": "<location>"}]
  },
  "commercialInsights": {
    "hospitalCapacity": [{"name": "<hospital>", "capacity": <number>, "current": <number>}],
    "ambulanceAvailability": <percentage>,
    "emergencyResponseTime": <minutes>,
    "marketTrends": [{"metric": "<name>", "value": <number>, "change": <percentage>}]
  }
}

Generate realistic data for HCMC with 5 districts, 24h forecast (6 points), 7-day predictions, and 5 hospitals.`;

    let analyticsData: AnalyticsData;

    if (LOVABLE_API_KEY) {
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
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Generate current real-time health analytics data for ${location}. Current time: ${new Date().toISOString()}. Include realistic pollution levels, weather, stroke statistics, ML predictions, and commercial insights.` }
            ],
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || '';
          
          // Parse JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analyticsData = JSON.parse(jsonMatch[0]);
            analyticsData.lastUpdated = new Date().toISOString();
            
            console.log('Successfully fetched data from Gemini');
            return new Response(JSON.stringify(analyticsData), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }
      } catch (aiError) {
        console.error('Gemini API error:', aiError);
      }
    }

    // Fallback: Generate realistic mock data
    console.log('Using fallback data generation');
    
    const districts = ['Quận 1', 'Quận 3', 'Quận 7', 'Bình Thạnh', 'Thủ Đức', 'Gò Vấp', 'Phú Nhuận', 'Tân Bình'];
    const now = new Date();
    
    analyticsData = {
      pollution: {
        current: {
          aqi: 85 + Math.floor(Math.random() * 60),
          pm25: 35 + Math.floor(Math.random() * 40),
          pm10: 50 + Math.floor(Math.random() * 50),
          o3: 40 + Math.floor(Math.random() * 30),
          no2: 25 + Math.floor(Math.random() * 25)
        },
        forecast: Array.from({ length: 6 }, (_, i) => ({
          time: new Date(now.getTime() + i * 4 * 3600000).toISOString(),
          aqi: 70 + Math.floor(Math.random() * 80),
          pm25: 30 + Math.floor(Math.random() * 50)
        })),
        byDistrict: districts.slice(0, 6).map(d => ({
          district: d,
          aqi: 50 + Math.floor(Math.random() * 100),
          risk: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)]
        }))
      },
      weather: {
        current: {
          temp: 28 + Math.floor(Math.random() * 8),
          humidity: 65 + Math.floor(Math.random() * 25),
          pressure: 1008 + Math.floor(Math.random() * 10),
          wind: 5 + Math.floor(Math.random() * 15)
        },
        forecast: Array.from({ length: 6 }, (_, i) => ({
          time: new Date(now.getTime() + i * 4 * 3600000).toISOString(),
          temp: 27 + Math.floor(Math.random() * 10),
          pressure: 1005 + Math.floor(Math.random() * 15)
        }))
      },
      strokeCases: {
        today: 45 + Math.floor(Math.random() * 30),
        week: 320 + Math.floor(Math.random() * 100),
        month: 1250 + Math.floor(Math.random() * 300),
        trend: -5 + Math.floor(Math.random() * 15),
        byDistrict: districts.slice(0, 6).map(d => ({
          district: d,
          cases: 10 + Math.floor(Math.random() * 40),
          change: -10 + Math.floor(Math.random() * 25)
        })),
        byAge: [
          { ageGroup: '18-40', cases: 15 + Math.floor(Math.random() * 10), percentage: 12 },
          { ageGroup: '41-55', cases: 35 + Math.floor(Math.random() * 15), percentage: 28 },
          { ageGroup: '56-70', cases: 45 + Math.floor(Math.random() * 20), percentage: 38 },
          { ageGroup: '70+', cases: 25 + Math.floor(Math.random() * 15), percentage: 22 }
        ],
        hourly: Array.from({ length: 24 }, (_, i) => ({
          hour: `${String(i).padStart(2, '0')}:00`,
          cases: Math.floor(3 + Math.sin(i / 4) * 5 + Math.random() * 3)
        }))
      },
      mlPredictions: {
        riskByDistrict: districts.slice(0, 6).map(d => ({
          district: d,
          riskScore: 30 + Math.floor(Math.random() * 60),
          predicted: 8 + Math.floor(Math.random() * 15),
          factors: ['Ô nhiễm cao', 'Nhiệt độ cao', 'Dân số đông'].slice(0, 1 + Math.floor(Math.random() * 3))
        })),
        timeSeries: Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now.getTime() - (6 - i) * 86400000);
          const actual = 40 + Math.floor(Math.random() * 30);
          return {
            date: date.toISOString().split('T')[0],
            actual,
            predicted: actual + Math.floor(Math.random() * 10) - 5
          };
        }),
        hotspots: [
          { lat: 10.7769, lng: 106.7009, risk: 75, name: 'Quận 1 - Trung tâm' },
          { lat: 10.8231, lng: 106.6297, risk: 68, name: 'Tân Bình - Sân bay' },
          { lat: 10.7628, lng: 106.6413, risk: 82, name: 'Quận 5 - Chợ Lớn' },
          { lat: 10.8507, lng: 106.7719, risk: 55, name: 'Thủ Đức - ĐHQG' }
        ]
      },
      commercialInsights: {
        hospitalCapacity: [
          { name: 'Chợ Rẫy', capacity: 200, current: 175 + Math.floor(Math.random() * 20) },
          { name: '115', capacity: 150, current: 120 + Math.floor(Math.random() * 25) },
          { name: 'Nhân dân 115', capacity: 120, current: 95 + Math.floor(Math.random() * 20) },
          { name: 'Đại học Y Dược', capacity: 180, current: 140 + Math.floor(Math.random() * 30) },
          { name: 'Thống Nhất', capacity: 160, current: 130 + Math.floor(Math.random() * 25) }
        ],
        ambulanceAvailability: 65 + Math.floor(Math.random() * 30),
        emergencyResponseTime: 8 + Math.floor(Math.random() * 7),
        marketTrends: [
          { metric: 'Thiết bị y tế', value: 2500, change: 12 },
          { metric: 'Dược phẩm', value: 1800, change: 8 },
          { metric: 'Bảo hiểm', value: 950, change: -3 },
          { metric: 'Telemedicine', value: 420, change: 35 }
        ]
      },
      lastUpdated: new Date().toISOString()
    };

    return new Response(JSON.stringify(analyticsData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
