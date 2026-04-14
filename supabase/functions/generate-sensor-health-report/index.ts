import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { callAIWithFallback } from "../_shared/aiProvider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId, period = 7 } = await req.json();
    if (!userId) throw new Error("userId is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - period);
    const since = daysAgo.toISOString().split('T')[0];

    // Fetch sensor daily summaries
    const { data: summaries } = await supabase
      .from("sensor_daily_summary")
      .select("*")
      .eq("user_id", userId)
      .gte("date", since)
      .order("date", { ascending: true });

    // Fetch detailed sensor readings
    const { data: readings } = await supabase
      .from("user_health_data")
      .select("value, recorded_at")
      .eq("user_id", userId)
      .eq("data_type", "sensor_reading")
      .gte("recorded_at", daysAgo.toISOString())
      .order("recorded_at", { ascending: true })
      .limit(200);

    // Fetch environment context
    const { data: hotspots } = await supabase
      .from("disease_hotspots")
      .select("disease_name, severity, case_count, radius_km, detected_at")
      .order("detected_at", { ascending: false })
      .limit(5);

    const { data: news } = await supabase
      .from("health_news_articles")
      .select("title, ai_summary, severity, disease_type")
      .order("published_at", { ascending: false })
      .limit(5);

    // Fetch user profile for context
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("date_of_birth, gender, blood_type, medical_conditions, height_cm, weight_kg")
      .eq("user_id", userId)
      .maybeSingle();

    // Build data context
    const summaryText = summaries?.length
      ? summaries.map((s: any) =>
          `${s.date}: ${s.total_steps} bước, ${s.avg_activity_level}, run=${s.tremor_events}, thăng bằng=${s.balance_avg_score}, té=${s.fall_events}, AQI=${s.environment_snapshot?.aqi ?? 'N/A'}, T=${s.environment_snapshot?.temperature ?? 'N/A'}°C`
        ).join("\n")
      : "Chưa có dữ liệu tóm tắt ngày.";

    const chartData = {
      steps: summaries?.map((s: any) => ({ date: s.date, value: s.total_steps || 0 })) || [],
      balance: summaries?.map((s: any) => ({ date: s.date, value: s.balance_avg_score || 100 })) || [],
      activity: summaries?.map((s: any) => ({
        date: s.date,
        value: s.avg_activity_level === 'vigorous' ? 4 : s.avg_activity_level === 'moderate' ? 3 : s.avg_activity_level === 'light' ? 2 : 1,
        label: s.avg_activity_level || 'sedentary'
      })) || [],
      environment: summaries?.map((s: any) => ({
        date: s.date,
        aqi: s.environment_snapshot?.aqi ?? null,
        temperature: s.environment_snapshot?.temperature ?? null,
        humidity: s.environment_snapshot?.humidity ?? null,
      })) || [],
      tremor: summaries?.map((s: any) => ({ date: s.date, events: s.tremor_events || 0, intensity: s.avg_tremor_intensity || 0 })) || [],
    };

    const profileText = profile
      ? `Ngày sinh: ${profile.date_of_birth || 'N/A'}, Giới: ${profile.gender || 'N/A'}, Máu: ${profile.blood_type || 'N/A'}, Cao: ${profile.height_cm || 'N/A'}cm, Nặng: ${profile.weight_kg || 'N/A'}kg, Tiền sử: ${profile.medical_conditions || 'Không'}`
      : "Chưa có hồ sơ cá nhân.";

    const envContext = [
      hotspots?.length ? `Hotspot: ${hotspots.map((h: any) => `${h.disease_name}(${h.severity})`).join(', ')}` : '',
      news?.length ? `Tin tức: ${news.map((n: any) => n.title).join('; ')}` : '',
    ].filter(Boolean).join('\n');

    const now = new Date().toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });

    const systemPrompt = `Bạn là chuyên gia phân tích sức khỏe cá nhân dựa trên dữ liệu cảm biến thiết bị. Viết báo cáo tiếng Việt, văn phong y khoa chuyên nghiệp.

QUY TẮC:
- KHÔNG dùng emoji
- KHÔNG dùng heading Markdown (#). Dùng **IN HOA ĐẬM** cho tiêu đề
- Đánh số La Mã I, II, III, IV, V
- Khi có số liệu, dùng bảng Markdown
- Phân tích THỰC CHẤT dựa trên dữ liệu

CẤU TRÚC:
**I. DỮ LIỆU THU THẬP** - Nguồn, kỳ báo cáo, số lượng mẫu
**II. PHÂN TÍCH VẬN ĐỘNG** - Xu hướng bước chân, mức hoạt động theo ngày
**III. PHÂN TÍCH THẦN KINH** - Run tay, thăng bằng, phát hiện bất thường
**IV. TƯƠNG QUAN MÔI TRƯỜNG - SỨC KHỎE** - AQI + hoạt động, nhiệt độ + vận động
**V. ĐÁNH GIÁ RỦI RO** - Phân loại Cao/Trung bình/Thấp
**VI. KHUYẾN NGHỊ** - Hành động cụ thể, khả thi

Ngày: ${now} | Kỳ: ${period} ngày`;

    const userContent = `
HỒ SƠ: ${profileText}

DỮ LIỆU CẢM BIẾN (${period} ngày):
${summaryText}

MÔI TRƯỜNG:
${envContext || 'Không có dữ liệu đặc biệt'}

Số bản ghi chi tiết: ${readings?.length || 0}`;

    const result = await callAIWithFallback({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      temperature: 0.3,
      maxTokens: 3000,
      functionName: "generate-sensor-health-report",
    });

    return new Response(JSON.stringify({
      markdown: result.content,
      chart_data: chartData,
      generatedAt: new Date().toISOString(),
      period,
      dataPoints: summaries?.length || 0,
      provider: result.providerUsed,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Sensor report error:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
