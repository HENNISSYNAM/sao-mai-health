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
  locationInfo: {
    city: string;
    address: string;
    coordinates: { lat: number; lng: number } | null;
  };
  lastUpdated: string;
}

// Location-specific data configurations
const LOCATION_CONFIG: Record<string, {
  districts: string[];
  hospitals: { name: string; capacity: number }[];
  hotspots: { lat: number; lng: number; name: string }[];
  baseTemp: number;
  baseAqi: number;
}> = {
  'Hà Nội': {
    districts: ['Hoàn Kiếm', 'Ba Đình', 'Đống Đa', 'Hai Bà Trưng', 'Cầu Giấy', 'Thanh Xuân', 'Long Biên', 'Nam Từ Liêm'],
    hospitals: [
      { name: 'Bệnh viện Bạch Mai', capacity: 250 },
      { name: 'Bệnh viện Việt Đức', capacity: 200 },
      { name: 'Bệnh viện 108', capacity: 180 },
      { name: 'Bệnh viện E', capacity: 150 },
      { name: 'Bệnh viện Xanh Pôn', capacity: 120 }
    ],
    hotspots: [
      { lat: 21.0285, lng: 105.8542, name: 'Hoàn Kiếm - Hồ Gươm' },
      { lat: 21.0227, lng: 105.8019, name: 'Ba Đình - Lăng Bác' },
      { lat: 21.0031, lng: 105.8201, name: 'Đống Đa - Ô Chợ Dừa' },
      { lat: 21.0503, lng: 105.7829, name: 'Cầu Giấy - Duy Tân' }
    ],
    baseTemp: 25,
    baseAqi: 120
  },
  'TP. Hồ Chí Minh': {
    districts: ['Quận 1', 'Quận 3', 'Quận 7', 'Bình Thạnh', 'Thủ Đức', 'Gò Vấp', 'Phú Nhuận', 'Tân Bình'],
    hospitals: [
      { name: 'Bệnh viện Chợ Rẫy', capacity: 220 },
      { name: 'Bệnh viện 115', capacity: 180 },
      { name: 'Bệnh viện Nhân dân 115', capacity: 150 },
      { name: 'Bệnh viện Đại học Y Dược', capacity: 200 },
      { name: 'Bệnh viện Thống Nhất', capacity: 160 }
    ],
    hotspots: [
      { lat: 10.7769, lng: 106.7009, name: 'Quận 1 - Trung tâm' },
      { lat: 10.8231, lng: 106.6297, name: 'Tân Bình - Sân bay' },
      { lat: 10.7628, lng: 106.6413, name: 'Quận 5 - Chợ Lớn' },
      { lat: 10.8507, lng: 106.7719, name: 'Thủ Đức - ĐHQG' }
    ],
    baseTemp: 30,
    baseAqi: 90
  },
  'Đà Nẵng': {
    districts: ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ'],
    hospitals: [
      { name: 'Bệnh viện Đà Nẵng', capacity: 180 },
      { name: 'Bệnh viện C Đà Nẵng', capacity: 120 },
      { name: 'Bệnh viện Hoàn Mỹ', capacity: 100 },
      { name: 'Bệnh viện Ung bướu', capacity: 80 }
    ],
    hotspots: [
      { lat: 16.0544, lng: 108.2022, name: 'Hải Châu - Trung tâm' },
      { lat: 16.0678, lng: 108.2208, name: 'Sơn Trà - Bãi biển' },
      { lat: 16.0395, lng: 108.2252, name: 'Ngũ Hành Sơn' }
    ],
    baseTemp: 28,
    baseAqi: 60
  }
};

// Detect city from GPS coordinates
function detectCityFromCoordinates(lat: number, lng: number): string {
  // Hanoi: ~21.0285, 105.8542
  if (lat >= 20.8 && lat <= 21.3 && lng >= 105.5 && lng <= 106.1) {
    return 'Hà Nội';
  }
  // HCMC: ~10.8231, 106.6297  
  if (lat >= 10.5 && lat <= 11.2 && lng >= 106.3 && lng <= 107.0) {
    return 'TP. Hồ Chí Minh';
  }
  // Da Nang: ~16.0544, 108.2022
  if (lat >= 15.8 && lat <= 16.3 && lng >= 107.9 && lng <= 108.5) {
    return 'Đà Nẵng';
  }
  // Default to HCMC
  return 'TP. Hồ Chí Minh';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const body = await req.json().catch(() => ({}));
    const { location, coordinates, userEnvironment, userRisk, ageGroup } = body;

    // Determine city from coordinates or location string
    let detectedCity = 'TP. Hồ Chí Minh';
    let userAddress = '';
    
    if (coordinates?.lat && coordinates?.lon) {
      detectedCity = detectCityFromCoordinates(coordinates.lat, coordinates.lon);
      console.log(`Detected city from GPS (${coordinates.lat}, ${coordinates.lon}): ${detectedCity}`);
    } else if (location) {
      // Check if location string matches known cities
      if (location.toLowerCase().includes('hà nội') || location.toLowerCase().includes('hanoi')) {
        detectedCity = 'Hà Nội';
      } else if (location.toLowerCase().includes('đà nẵng') || location.toLowerCase().includes('da nang')) {
        detectedCity = 'Đà Nẵng';
      }
    }

    const config = LOCATION_CONFIG[detectedCity] || LOCATION_CONFIG['TP. Hồ Chí Minh'];
    console.log(`Using config for: ${detectedCity}`);

    let analyticsData: AnalyticsData;

    // Try AI for address geocoding and enhanced data
    if (LOVABLE_API_KEY && coordinates?.lat && coordinates?.lon) {
      try {
        const addressPrompt = `Bạn là một AI chuyên về địa lý Việt Nam. Cho tọa độ GPS: ${coordinates.lat}, ${coordinates.lon}

Hãy trả về JSON với format sau (không có markdown):
{
  "address": "<địa chỉ chi tiết nhất có thể, bao gồm đường, phường/xã, quận/huyện>",
  "city": "<tên thành phố/tỉnh>",
  "district": "<tên quận/huyện>",
  "nearbyLandmarks": ["<địa điểm nổi bật gần đó>"]
}`;

        const addressResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'user', content: addressPrompt }
            ],
          }),
        });

        if (addressResponse.ok) {
          const addressData = await addressResponse.json();
          const content = addressData.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            userAddress = parsed.address || '';
            if (parsed.city) {
              // Update detected city based on AI analysis
              if (parsed.city.toLowerCase().includes('hà nội')) {
                detectedCity = 'Hà Nội';
              } else if (parsed.city.toLowerCase().includes('hồ chí minh')) {
                detectedCity = 'TP. Hồ Chí Minh';
              } else if (parsed.city.toLowerCase().includes('đà nẵng')) {
                detectedCity = 'Đà Nẵng';
              }
            }
            console.log(`AI detected address: ${userAddress}, city: ${detectedCity}`);
          }
        }
      } catch (aiError) {
        console.error('Address geocoding error:', aiError);
      }
    }

    // Update config based on final detected city
    const finalConfig = LOCATION_CONFIG[detectedCity] || LOCATION_CONFIG['TP. Hồ Chí Minh'];
    const now = new Date();

    // Generate location-specific data
    analyticsData = {
      pollution: {
        current: {
          aqi: userEnvironment?.aqi || (finalConfig.baseAqi + Math.floor(Math.random() * 40)),
          pm25: userEnvironment?.pm25 || (30 + Math.floor(Math.random() * 40)),
          pm10: userEnvironment?.pm10 || (45 + Math.floor(Math.random() * 50)),
          o3: 35 + Math.floor(Math.random() * 30),
          no2: userEnvironment?.no2 || (20 + Math.floor(Math.random() * 25))
        },
        forecast: Array.from({ length: 6 }, (_, i) => ({
          time: new Date(now.getTime() + i * 4 * 3600000).toISOString(),
          aqi: finalConfig.baseAqi + Math.floor(Math.random() * 50) - 10,
          pm25: 25 + Math.floor(Math.random() * 45)
        })),
        byDistrict: finalConfig.districts.slice(0, 6).map(d => ({
          district: d,
          aqi: finalConfig.baseAqi - 20 + Math.floor(Math.random() * 80),
          risk: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)]
        }))
      },
      weather: {
        current: {
          temp: userEnvironment?.temperature || (finalConfig.baseTemp + Math.floor(Math.random() * 6)),
          humidity: userEnvironment?.humidity || (65 + Math.floor(Math.random() * 25)),
          pressure: userEnvironment?.pressure || (1008 + Math.floor(Math.random() * 10)),
          wind: userEnvironment?.windSpeed || (5 + Math.floor(Math.random() * 15))
        },
        forecast: Array.from({ length: 6 }, (_, i) => ({
          time: new Date(now.getTime() + i * 4 * 3600000).toISOString(),
          temp: finalConfig.baseTemp - 2 + Math.floor(Math.random() * 8),
          pressure: 1005 + Math.floor(Math.random() * 15)
        }))
      },
      strokeCases: {
        today: 35 + Math.floor(Math.random() * 30),
        week: 280 + Math.floor(Math.random() * 100),
        month: 1100 + Math.floor(Math.random() * 300),
        trend: -8 + Math.floor(Math.random() * 20),
        byDistrict: finalConfig.districts.slice(0, 6).map(d => ({
          district: d,
          cases: 8 + Math.floor(Math.random() * 35),
          change: -12 + Math.floor(Math.random() * 28)
        })),
        byAge: [
          { ageGroup: '18-40', cases: 12 + Math.floor(Math.random() * 10), percentage: 12 },
          { ageGroup: '41-55', cases: 30 + Math.floor(Math.random() * 15), percentage: 28 },
          { ageGroup: '56-70', cases: 40 + Math.floor(Math.random() * 20), percentage: 38 },
          { ageGroup: '70+', cases: 22 + Math.floor(Math.random() * 15), percentage: 22 }
        ],
        hourly: Array.from({ length: 24 }, (_, i) => ({
          hour: `${String(i).padStart(2, '0')}:00`,
          cases: Math.floor(2 + Math.sin(i / 4) * 4 + Math.random() * 3)
        }))
      },
      mlPredictions: {
        riskByDistrict: finalConfig.districts.slice(0, 6).map(d => ({
          district: d,
          riskScore: 25 + Math.floor(Math.random() * 65),
          predicted: 6 + Math.floor(Math.random() * 15),
          factors: ['Ô nhiễm không khí', 'Nhiệt độ cao', 'Áp suất thay đổi', 'Mật độ dân số'].slice(0, 1 + Math.floor(Math.random() * 3))
        })),
        timeSeries: Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now.getTime() - (6 - i) * 86400000);
          const actual = 35 + Math.floor(Math.random() * 30);
          return {
            date: date.toISOString().split('T')[0],
            actual,
            predicted: actual + Math.floor(Math.random() * 12) - 6
          };
        }),
        hotspots: finalConfig.hotspots.map(h => ({
          ...h,
          risk: 45 + Math.floor(Math.random() * 45)
        }))
      },
      commercialInsights: {
        hospitalCapacity: finalConfig.hospitals.map(h => ({
          name: h.name,
          capacity: h.capacity,
          current: Math.floor(h.capacity * (0.65 + Math.random() * 0.3))
        })),
        ambulanceAvailability: 60 + Math.floor(Math.random() * 35),
        emergencyResponseTime: 7 + Math.floor(Math.random() * 8),
        marketTrends: [
          { metric: 'Thiết bị y tế', value: 2200 + Math.floor(Math.random() * 800), change: 8 + Math.floor(Math.random() * 10) },
          { metric: 'Dược phẩm', value: 1600 + Math.floor(Math.random() * 600), change: 5 + Math.floor(Math.random() * 8) },
          { metric: 'Bảo hiểm sức khỏe', value: 800 + Math.floor(Math.random() * 400), change: -5 + Math.floor(Math.random() * 12) },
          { metric: 'Telemedicine', value: 350 + Math.floor(Math.random() * 200), change: 25 + Math.floor(Math.random() * 20) }
        ]
      },
      locationInfo: {
        city: detectedCity,
        address: userAddress || `${detectedCity}, Việt Nam`,
        coordinates: coordinates ? { lat: coordinates.lat, lng: coordinates.lon } : null
      },
      lastUpdated: new Date().toISOString()
    };

    console.log(`Returning analytics for ${detectedCity} with ${finalConfig.districts.length} districts`);

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
