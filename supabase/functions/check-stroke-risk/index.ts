import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Format phone number to Vietnamese format
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (cleaned.startsWith('84')) {
    cleaned = '0' + cleaned.slice(2);
  } else if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (!cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  
  return cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, lat, lon, subscribe = false } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Vui lòng nhập số điện thoại" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (lat === undefined || lon === undefined) {
      return new Response(
        JSON.stringify({ error: "Vui lòng cho phép truy cập vị trí GPS" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedPhone = formatPhoneNumber(phone);
    console.log(`Checking stroke risk for phone: ${formattedPhone}, location: ${lat}, ${lon}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get latest predictions
    const { data: predictions, error: predictionsError } = await supabase
      .from("stroke_risk_predictions")
      .select("*")
      .gte("valid_until", new Date().toISOString())
      .order("predicted_at", { ascending: false });

    if (predictionsError) {
      console.error("Error fetching predictions:", predictionsError);
      throw predictionsError;
    }

    if (!predictions || predictions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          has_risk_data: false,
          message: "Chưa có dữ liệu dự báo. Vui lòng thử lại sau.",
          phone: formattedPhone
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find nearest prediction to user's location
    let nearestPrediction = predictions[0];
    let minDistance = Infinity;

    for (const prediction of predictions) {
      if (prediction.lat && prediction.lon) {
        const distance = calculateDistance(lat, lon, prediction.lat, prediction.lon);
        if (distance < minDistance) {
          minDistance = distance;
          nearestPrediction = prediction;
        }
      }
    }

    // Subscribe user if requested
    if (subscribe) {
      const { error: subscribeError } = await supabase
        .from("stroke_alert_subscribers")
        .upsert({
          phone: formattedPhone,
          lat,
          lon,
          district_id: nearestPrediction.district_id,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'phone'
        });

      if (subscribeError) {
        console.error("Subscribe error:", subscribeError);
      } else {
        console.log(`User ${formattedPhone} subscribed to alerts`);
      }
    }

    // Generate personalized message
    const riskLevelVi = {
      LOW: "THẤP",
      MEDIUM: "TRUNG BÌNH", 
      HIGH: "CAO",
      CRITICAL: "RẤT CAO"
    };

    const alertMessage = generateAlertMessage(nearestPrediction, formattedPhone, minDistance);

    return new Response(
      JSON.stringify({
        success: true,
        has_risk_data: true,
        phone: formattedPhone,
        user_location: { lat, lon },
        nearest_district: nearestPrediction.district_id,
        distance_km: Math.round(minDistance * 10) / 10,
        risk_level: nearestPrediction.risk_level,
        risk_level_vi: riskLevelVi[nearestPrediction.risk_level as keyof typeof riskLevelVi],
        risk_score: nearestPrediction.risk_score,
        environmental_data: {
          aqi: nearestPrediction.aqi,
          pm25: nearestPrediction.pm25,
          pm10: nearestPrediction.pm10,
          temperature: nearestPrediction.temperature,
          humidity: nearestPrediction.humidity,
          pressure: nearestPrediction.pressure,
          weather: nearestPrediction.weather_condition
        },
        ai_analysis: nearestPrediction.ai_analysis,
        risk_factors: nearestPrediction.risk_factors,
        recommendations: nearestPrediction.recommendations,
        alert_message: alertMessage,
        predicted_at: nearestPrediction.predicted_at,
        valid_until: nearestPrediction.valid_until,
        subscribed: subscribe
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Check stroke risk error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Lỗi hệ thống",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateAlertMessage(prediction: any, phone: string, distance: number): string {
  const riskEmoji = {
    LOW: "🟢",
    MEDIUM: "🟡",
    HIGH: "🟠",
    CRITICAL: "🔴"
  };

  const riskVi = {
    LOW: "THẤP",
    MEDIUM: "TRUNG BÌNH",
    HIGH: "CAO", 
    CRITICAL: "RẤT CAO"
  };

  const emoji = riskEmoji[prediction.risk_level as keyof typeof riskEmoji] || "⚪";
  const level = riskVi[prediction.risk_level as keyof typeof riskVi] || prediction.risk_level;

  let message = `${emoji} CẢNH BÁO NGUY CƠ ĐỘT QUỴ\n\n`;
  message += `📍 Khu vực: ${prediction.district_id}\n`;
  message += `📊 Mức nguy cơ: ${level} (${prediction.risk_score}/100)\n\n`;
  
  message += `🌡️ Thời tiết:\n`;
  message += `• Nhiệt độ: ${prediction.temperature}°C\n`;
  message += `• Độ ẩm: ${prediction.humidity}%\n`;
  message += `• AQI: ${prediction.aqi}\n`;
  message += `• PM2.5: ${prediction.pm25} µg/m³\n\n`;

  if (prediction.risk_factors && prediction.risk_factors.length > 0) {
    message += `⚠️ Yếu tố nguy cơ:\n`;
    prediction.risk_factors.forEach((factor: string) => {
      message += `• ${factor}\n`;
    });
    message += `\n`;
  }

  if (prediction.recommendations && prediction.recommendations.length > 0) {
    message += `💡 Khuyến nghị:\n`;
    prediction.recommendations.forEach((rec: string) => {
      message += `• ${rec}\n`;
    });
  }

  message += `\n⏰ Dữ liệu cập nhật: ${new Date(prediction.predicted_at).toLocaleString('vi-VN')}`;

  return message;
}
