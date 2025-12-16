import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Vietnam districts with coordinates for HCMC
const HCMC_DISTRICTS = [
  { id: "quan-1", name: "Quận 1", lat: 10.7769, lon: 106.7009 },
  { id: "quan-3", name: "Quận 3", lat: 10.7849, lon: 106.6849 },
  { id: "quan-5", name: "Quận 5", lat: 10.7549, lon: 106.6649 },
  { id: "quan-7", name: "Quận 7", lat: 10.7349, lon: 106.7219 },
  { id: "quan-10", name: "Quận 10", lat: 10.7729, lon: 106.6669 },
  { id: "binh-thanh", name: "Bình Thạnh", lat: 10.8049, lon: 106.7109 },
  { id: "go-vap", name: "Gò Vấp", lat: 10.8389, lon: 106.6499 },
  { id: "tan-binh", name: "Tân Bình", lat: 10.8019, lon: 106.6529 },
  { id: "phu-nhuan", name: "Phú Nhuận", lat: 10.7999, lon: 106.6809 },
  { id: "binh-tan", name: "Bình Tân", lat: 10.7659, lon: 106.6039 },
  { id: "thu-duc", name: "Thủ Đức", lat: 10.8519, lon: 106.7539 },
  { id: "tan-phu", name: "Tân Phú", lat: 10.7909, lon: 106.6279 },
];

// Fetch air quality data from OpenAQ API (free, no key required)
async function fetchAirQuality(lat: number, lon: number): Promise<any> {
  try {
    // Using AQICN API (free tier)
    const response = await fetch(
      `https://api.waqi.info/feed/geo:${lat};${lon}/?token=demo`
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === "ok" && data.data) {
        return {
          aqi: data.data.aqi,
          pm25: data.data.iaqi?.pm25?.v || null,
          pm10: data.data.iaqi?.pm10?.v || null,
          no2: data.data.iaqi?.no2?.v || null,
          o3: data.data.iaqi?.o3?.v || null,
          source: "waqi"
        };
      }
    }
    
    // Fallback: Generate realistic mock data for Vietnam
    const baseAQI = 50 + Math.random() * 100; // AQI typically 50-150 in HCMC
    return {
      aqi: Math.round(baseAQI),
      pm25: Math.round(20 + Math.random() * 60),
      pm10: Math.round(30 + Math.random() * 80),
      no2: Math.round(10 + Math.random() * 40),
      o3: Math.round(20 + Math.random() * 50),
      source: "simulated"
    };
  } catch (error) {
    console.error("Error fetching air quality:", error);
    // Return simulated data on error
    return {
      aqi: Math.round(50 + Math.random() * 100),
      pm25: Math.round(20 + Math.random() * 60),
      pm10: Math.round(30 + Math.random() * 80),
      source: "simulated"
    };
  }
}

// Fetch weather data from Open-Meteo (free, no key required)
async function fetchWeather(lat: number, lon: number): Promise<any> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,weather_code&timezone=Asia/Ho_Chi_Minh`
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.current) {
        return {
          temperature: data.current.temperature_2m,
          humidity: data.current.relative_humidity_2m,
          pressure: data.current.surface_pressure,
          weatherCode: data.current.weather_code,
          source: "open-meteo"
        };
      }
    }
    
    // Fallback data
    return {
      temperature: 28 + Math.random() * 8,
      humidity: 60 + Math.random() * 30,
      pressure: 1008 + Math.random() * 15,
      source: "simulated"
    };
  } catch (error) {
    console.error("Error fetching weather:", error);
    return {
      temperature: 28 + Math.random() * 8,
      humidity: 60 + Math.random() * 30,
      pressure: 1008 + Math.random() * 15,
      source: "simulated"
    };
  }
}

// Get weather condition from code
function getWeatherCondition(code: number): string {
  if (code === 0) return "Trời quang";
  if (code <= 3) return "Nhiều mây";
  if (code <= 49) return "Sương mù";
  if (code <= 69) return "Mưa";
  if (code <= 79) return "Tuyết";
  if (code <= 99) return "Giông bão";
  return "Không xác định";
}

// Call Lovable AI for stroke risk analysis
async function analyzeStrokeRisk(envData: any): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    console.log("No Lovable API key, using rule-based analysis");
    return ruleBasedAnalysis(envData);
  }

  const prompt = `Bạn là AI chuyên gia y tế dự phòng đột quỵ. Phân tích dữ liệu môi trường sau và đánh giá nguy cơ đột quỵ:

Dữ liệu môi trường khu vực ${envData.districtName}:
- Chỉ số AQI: ${envData.aqi}
- PM2.5: ${envData.pm25} µg/m³
- PM10: ${envData.pm10} µg/m³
- Nhiệt độ: ${envData.temperature}°C
- Độ ẩm: ${envData.humidity}%
- Áp suất khí quyển: ${envData.pressure} hPa
- Thời tiết: ${envData.weatherCondition}

Hãy phân tích và trả về JSON với format:
{
  "risk_score": <số từ 0-100>,
  "risk_level": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "analysis": "<phân tích ngắn gọn bằng tiếng Việt, 2-3 câu>",
  "risk_factors": ["<yếu tố nguy cơ 1>", "<yếu tố nguy cơ 2>"],
  "recommendations": ["<khuyến nghị 1>", "<khuyến nghị 2>"]
}

Lưu ý các ngưỡng nguy cơ đột quỵ:
- AQI > 150: Nguy cơ cao
- Nhiệt độ > 35°C hoặc < 20°C: Nguy cơ tăng
- Độ ẩm > 85% hoặc < 30%: Nguy cơ tăng
- Áp suất thay đổi đột ngột: Nguy cơ tăng
- PM2.5 > 55 µg/m³: Nguy cơ cao`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Bạn là AI y tế chuyên phân tích nguy cơ đột quỵ dựa trên dữ liệu môi trường. Luôn trả về JSON hợp lệ." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        console.log("AI rate limited, using rule-based analysis");
        return ruleBasedAnalysis(envData);
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return ruleBasedAnalysis(envData);
  } catch (error) {
    console.error("AI analysis error:", error);
    return ruleBasedAnalysis(envData);
  }
}

// Rule-based fallback analysis
function ruleBasedAnalysis(envData: any): any {
  let riskScore = 0;
  const riskFactors: string[] = [];
  const recommendations: string[] = [];

  // AQI analysis
  if (envData.aqi > 200) {
    riskScore += 35;
    riskFactors.push("Chỉ số AQI rất cao (>200)");
    recommendations.push("Hạn chế ra ngoài, đeo khẩu trang N95");
  } else if (envData.aqi > 150) {
    riskScore += 25;
    riskFactors.push("Chỉ số AQI cao (>150)");
    recommendations.push("Đeo khẩu trang khi ra ngoài");
  } else if (envData.aqi > 100) {
    riskScore += 15;
    riskFactors.push("Chỉ số AQI trung bình cao");
  }

  // PM2.5 analysis
  if (envData.pm25 > 55) {
    riskScore += 20;
    riskFactors.push("Nồng độ PM2.5 cao");
    recommendations.push("Sử dụng máy lọc không khí trong nhà");
  }

  // Temperature analysis
  if (envData.temperature > 35) {
    riskScore += 20;
    riskFactors.push("Nhiệt độ cao (>35°C)");
    recommendations.push("Uống nhiều nước, tránh nắng giữa trưa");
  } else if (envData.temperature < 20) {
    riskScore += 15;
    riskFactors.push("Nhiệt độ thấp (<20°C)");
    recommendations.push("Giữ ấm cơ thể");
  }

  // Humidity analysis
  if (envData.humidity > 85) {
    riskScore += 15;
    riskFactors.push("Độ ẩm rất cao (>85%)");
  } else if (envData.humidity < 30) {
    riskScore += 10;
    riskFactors.push("Độ ẩm thấp (<30%)");
  }

  // Pressure analysis (sudden changes are risky)
  if (envData.pressure < 1005 || envData.pressure > 1020) {
    riskScore += 10;
    riskFactors.push("Áp suất khí quyển bất thường");
  }

  // Determine risk level
  let riskLevel: string;
  if (riskScore >= 70) {
    riskLevel = "CRITICAL";
  } else if (riskScore >= 50) {
    riskLevel = "HIGH";
  } else if (riskScore >= 30) {
    riskLevel = "MEDIUM";
  } else {
    riskLevel = "LOW";
  }

  // Default recommendations
  if (recommendations.length === 0) {
    recommendations.push("Duy trì lối sống lành mạnh");
    recommendations.push("Theo dõi sức khỏe định kỳ");
  }

  const analysis = `Khu vực ${envData.districtName} có mức nguy cơ đột quỵ ${riskLevel === 'LOW' ? 'THẤP' : riskLevel === 'MEDIUM' ? 'TRUNG BÌNH' : riskLevel === 'HIGH' ? 'CAO' : 'RẤT CAO'} với điểm ${riskScore}/100. ${riskFactors.length > 0 ? `Các yếu tố chính: ${riskFactors.slice(0, 2).join(', ')}.` : 'Điều kiện môi trường hiện tại thuận lợi.'}`;

  return {
    risk_score: Math.min(100, riskScore),
    risk_level: riskLevel,
    analysis,
    risk_factors: riskFactors,
    recommendations
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const predictions: any[] = [];

    console.log("Starting stroke risk prediction for", HCMC_DISTRICTS.length, "districts");

    // Process each district
    for (const district of HCMC_DISTRICTS) {
      console.log(`Processing district: ${district.name}`);

      // Fetch environmental data
      const [airQuality, weather] = await Promise.all([
        fetchAirQuality(district.lat, district.lon),
        fetchWeather(district.lat, district.lon)
      ]);

      const weatherCondition = weather.weatherCode 
        ? getWeatherCondition(weather.weatherCode) 
        : "Không xác định";

      const envData = {
        districtId: district.id,
        districtName: district.name,
        lat: district.lat,
        lon: district.lon,
        aqi: airQuality.aqi,
        pm25: airQuality.pm25,
        pm10: airQuality.pm10,
        temperature: weather.temperature,
        humidity: weather.humidity,
        pressure: weather.pressure,
        weatherCondition,
        dataSource: `${airQuality.source},${weather.source}`
      };

      // Analyze with AI
      const analysis = await analyzeStrokeRisk(envData);

      // Prepare prediction record
      const prediction = {
        district_id: district.id,
        lat: district.lat,
        lon: district.lon,
        risk_level: analysis.risk_level,
        risk_score: analysis.risk_score,
        aqi: airQuality.aqi,
        pm25: airQuality.pm25,
        pm10: airQuality.pm10,
        temperature: weather.temperature,
        humidity: weather.humidity,
        pressure: weather.pressure,
        weather_condition: weatherCondition,
        ai_analysis: analysis.analysis,
        risk_factors: analysis.risk_factors,
        recommendations: analysis.recommendations,
        data_source: envData.dataSource,
        valid_until: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // Valid for 6 hours
      };

      predictions.push(prediction);
    }

    // Insert all predictions
    const { data: insertedData, error: insertError } = await supabase
      .from("stroke_risk_predictions")
      .insert(predictions)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    console.log(`Successfully inserted ${predictions.length} predictions`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Đã tạo ${predictions.length} dự đoán nguy cơ đột quỵ`,
        predictions: insertedData,
        generated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Stroke risk agent error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
