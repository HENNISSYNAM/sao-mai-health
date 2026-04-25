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
    const { userId, reportType = "all" } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Gather data based on report type
    const sections: string[] = [];

    // --- News data ---
    if (reportType === "news" || reportType === "all") {
      const { data: news } = await supabase
        .from("health_news_articles")
        .select("title, ai_summary, severity, classification, disease_type, location, source, published_at")
        .order("published_at", { ascending: false })
        .limit(20);

      if (news?.length) {
        const newsText = news.map((n: any, i: number) =>
          `${i + 1}. [${n.severity?.toUpperCase() || 'N/A'}] ${n.title}\n   Nguồn: ${n.source || 'N/A'} | Địa điểm: ${n.location || 'N/A'} | Bệnh: ${n.disease_type || 'N/A'}\n   AI Summary: ${n.ai_summary || 'Chưa có'}`
        ).join("\n\n");
        sections.push(`## DỮ LIỆU TIN TỨC Y TẾ (${news.length} bài gần nhất)\n\n${newsText}`);
      } else {
        sections.push("## DỮ LIỆU TIN TỨC Y TẾ\nKhông có dữ liệu tin tức.");
      }
    }

    // --- Twin / BioVault data ---
    if (reportType === "twin" || reportType === "all") {
      let profileText = "Chưa có hồ sơ.";
      let biometricText = "Chưa có dữ liệu sinh trắc.";
      let sensorText = "Chưa có dữ liệu cảm biến.";

      if (userId) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (profile) {
          profileText = `Ngày sinh: ${profile.date_of_birth || 'N/A'}, Giới tính: ${profile.gender || 'N/A'}, Nhóm máu: ${profile.blood_type || 'N/A'}, Chiều cao: ${profile.height_cm || 'N/A'}cm, Cân nặng: ${profile.weight_kg || 'N/A'}kg, Tiền sử: ${profile.medical_conditions || 'Không'}`;
        }

        const { data: scans } = await supabase
          .from("user_biometric_scans")
          .select("scan_type, health_indicators, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (scans?.length) {
          biometricText = scans.map((s: any) =>
            `- ${s.scan_type} (${new Date(s.created_at).toLocaleDateString('vi-VN')}): ${JSON.stringify(s.health_indicators || {})}`
          ).join("\n");
        }

        // Fetch sensor daily summaries (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: sensorSummaries } = await supabase
          .from("sensor_daily_summary")
          .select("*")
          .eq("user_id", userId)
          .gte("date", thirtyDaysAgo.toISOString().split('T')[0])
          .order("date", { ascending: true });

        if (sensorSummaries?.length) {
          sensorText = sensorSummaries.map((s: any) =>
            `- ${s.date}: ${s.total_steps} bước, ${s.avg_activity_level || 'N/A'}, run=${s.tremor_events || 0}, thăng bằng=${s.balance_avg_score || 'N/A'}, té=${s.fall_events || 0}, AQI=${s.environment_snapshot?.aqi ?? 'N/A'}`
          ).join("\n");
        }
      }

      sections.push(`## DỮ LIỆU SONG SINH SỐ (Digital Twin)\n\n### Hồ sơ cá nhân\n${profileText}\n\n### Sinh trắc học gần đây\n${biometricText}\n\n### Dữ liệu cảm biến thiết bị (30 ngày)\n${sensorText}`);
    }

    // --- Stroke risk data ---
    if (reportType === "stroke" || reportType === "all") {
      const { data: hotspots } = await supabase
        .from("disease_hotspots")
        .select("disease_name, severity, case_count, center_lat, center_lng, radius_km, detected_at")
        .order("detected_at", { ascending: false })
        .limit(10);

      let strokeContext = "Không có dữ liệu hotspot.";
      if (hotspots?.length) {
        strokeContext = hotspots.map((h: any) =>
          `- ${h.disease_name || 'N/A'}: ${h.case_count || 0} ca, mức ${h.severity || 'N/A'}, bán kính ${h.radius_km || 0}km`
        ).join("\n");
      }

      // Get user risk if available
      let riskText = "Chưa có đánh giá rủi ro cá nhân.";
      if (userId) {
        const { data: alerts } = await supabase
          .from("user_alerts")
          .select("alert_type, severity, message, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5);

        if (alerts?.length) {
          riskText = alerts.map((a: any) =>
            `- [${a.severity}] ${a.alert_type}: ${a.message}`
          ).join("\n");
        }
      }

      sections.push(`## DỮ LIỆU NGUY CƠ ĐỘT QUỴ & DỊCH TỄ\n\n### Hotspot dịch bệnh\n${strokeContext}\n\n### Cảnh báo cá nhân\n${riskText}`);
    }

    const dataContext = sections.join("\n\n---\n\n");
    const now = new Date().toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
    const reportTypeLabel = {
      news: "Tin tức Y tế",
      twin: "Song sinh số (Digital Twin)",
      stroke: "Nguy cơ Đột quỵ & Dịch tễ",
      all: "Tổng hợp Sức khỏe Cá nhân"
    }[reportType] || "Sức khỏe";

    const systemPrompt = `Bạn là chuyên gia phân tích y tế công cộng cấp cao tại Việt Nam. Hãy viết NỘI DUNG BÁO CÁO bằng tiếng Việt theo văn phong hành chính trang trọng, chuẩn mực.

QUY TẮC BẮT BUỘC:
- KHÔNG dùng emoji
- KHÔNG dùng heading Markdown (#, ##, ###). Thay vào đó dùng **IN HOA ĐẬM** cho tiêu đề mục
- Đánh số La Mã cho các phần chính: I, II, III, IV, V
- Đánh số 1, 2, 3 cho các mục con
- Viết văn phong hành chính, trang trọng, súc tích
- Khi có dữ liệu định lượng, trình bày dưới dạng bảng Markdown (| cột | cột |)
- Mỗi phần phải có nội dung phân tích thực chất, không chung chung

CẤU TRÚC BÁO CÁO (bắt buộc theo thứ tự):

**I. CĂN CỨ LẬP BÁO CÁO**
Liệt kê các nguồn dữ liệu, thời gian thu thập, phạm vi phân tích.

**II. TÓM TẮT TÌNH HÌNH**
Tổng quan ngắn gọn về tình hình sức khỏe/dịch tễ dựa trên dữ liệu.

**III. PHÂN TÍCH CHI TIẾT**
Phân tích từng mảng dữ liệu. Dùng bảng số liệu khi phù hợp.

**IV. ĐÁNH GIÁ RỦI RO**
Xác định và phân loại các rủi ro theo mức độ: Cao, Trung bình, Thấp.

**V. KHUYẾN NGHỊ VÀ GIẢI PHÁP**
Đề xuất hành động cụ thể, khả thi, có thứ tự ưu tiên.

**VI. DỰ BÁO XU HƯỚNG**
Nhận định xu hướng trong 1-3 tháng tới dựa trên dữ liệu hiện có.

**VII. KẾT LUẬN**
Tóm tắt kết luận chính và lưu ý quan trọng.

Ngày lập báo cáo: ${now}
Loại báo cáo: ${reportTypeLabel}`;

    const result = await callAIWithFallback({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Dữ liệu để phân tích:\n\n${dataContext}` }
      ],
      temperature: 0.3,
      maxTokens: 4000,
      functionName: "generate-personal-report",
    });

    return new Response(JSON.stringify({
      markdown: result.content,
      generatedAt: new Date().toISOString(),
      reportType,
      provider: result.providerUsed,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Report generation error:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to generate report" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
