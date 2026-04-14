import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAIWithFallback } from "../_shared/aiProvider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HealthContext {
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  pressureChange1h: number | null;
  aqi: number | null;
  pm25: number | null;
  uvIndex: number | null;
  ageGroup: string;
  riskScore: number;
  riskLevel: string;
  primaryFactors: string[];
  lat: number;
  lon: number;
  devicePressure: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    // Handle profile analysis (from registration modal)
    if (body.analysisType === 'profile_analysis') {
      const { userProfile, lat, lon, ageGroup } = body;
      
      systemPrompt = `Bạn là trợ lý y tế AI chuyên về đột quỵ và sức khỏe tim mạch tại Việt Nam.
Nhiệm vụ: Phân tích hồ sơ sức khỏe người dùng và đưa ra đánh giá ban đầu.
Trả lời bằng tiếng Việt, ngắn gọn, tích cực và động viên.

Format trả lời JSON:
{
  "summary": "Tóm tắt 1 câu về hồ sơ",
  "riskFactors": ["yếu tố 1", "yếu tố 2"],
  "recommendations": ["khuyến nghị 1", "khuyến nghị 2"],
  "urgency": "low|medium|high"
}`;

      userPrompt = `Thông tin người dùng đăng ký nhận cảnh báo đột quỵ:
- Nhóm tuổi: ${ageGroup}
- Giới tính: ${userProfile?.gender || 'Không rõ'}
- Có cảm biến khí áp: ${userProfile?.hasBarometer ? 'Có' : 'Không'}
- Vị trí: ${lat}, ${lon}

Hãy phân tích ngắn gọn hồ sơ và đưa ra đánh giá ban đầu.`;

    } else {
      const { context, type = 'recommendations' }: { context: HealthContext; type?: string } = body;
      
      if (!context) {
        console.error("Missing context in request body:", JSON.stringify(body));
        throw new Error("Missing context in request body");
      }

      if (type === 'emergency') {
        systemPrompt = `Bạn là trợ lý y tế AI chuyên về đột quỵ và sức khỏe tim mạch tại Việt Nam. 
Nhiệm vụ: Cung cấp thông tin các cơ sở y tế cấp cứu gần nhất dựa trên vị trí.
Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng.
Luôn nhắc nhở gọi 115 trong trường hợp khẩn cấp.`;

        userPrompt = `Vị trí người dùng: ${context.lat}, ${context.lon}
Mức độ nguy cơ: ${context.riskLevel} (${context.riskScore}/100)

Hãy cung cấp:
1. Số điện thoại cấp cứu quan trọng
2. Gợi ý các bệnh viện có khoa cấp cứu/đột quỵ gần khu vực Hà Nội hoặc TP.HCM (tùy vào tọa độ)
3. Hướng dẫn nhận biết dấu hiệu đột quỵ FAST`;

      } else {
        systemPrompt = `Bạn là AI tư vấn sức khỏe môi trường, chuyên về đánh giá nguy cơ đột quỵ dựa trên yếu tố môi trường.

Vai trò:
- Phân tích dữ liệu môi trường và đưa ra lời khuyên cá nhân hóa
- Cung cấp cảnh báo sớm dựa trên các yếu tố nguy cơ
- Đề xuất hành động cụ thể, thực tế
- Trả lời bằng tiếng Việt, ngắn gọn, thân thiện

Quy tắc:
- KHÔNG chẩn đoán y tế, chỉ cảnh báo dựa trên môi trường
- Nhắc nhở khám bác sĩ khi nguy cơ cao
- Tập trung vào hành động có thể thực hiện ngay

Format trả lời JSON:
{
  "summary": "Tóm tắt 1 câu",
  "warnings": ["cảnh báo 1", "cảnh báo 2"],
  "recommendations": {
    "do": ["làm 1", "làm 2", "làm 3"],
    "avoid": ["tránh 1", "tránh 2"]
  },
  "healthTip": "Mẹo sức khỏe hữu ích",
  "urgency": "low|medium|high"
}`;

        const envDescription = [];
        if (context.temperature !== null) envDescription.push(`Nhiệt độ: ${context.temperature}°C`);
        if (context.humidity !== null) envDescription.push(`Độ ẩm: ${context.humidity}%`);
        if (context.pressure !== null || context.devicePressure !== null) {
          const pressure = context.devicePressure || context.pressure;
          envDescription.push(`Áp suất: ${pressure?.toFixed(0)} hPa${context.devicePressure ? ' (từ thiết bị)' : ''}`);
        }
        if (context.pressureChange1h !== null) envDescription.push(`Thay đổi áp suất 1h: ${context.pressureChange1h > 0 ? '+' : ''}${context.pressureChange1h.toFixed(1)} hPa`);
        if (context.aqi !== null) envDescription.push(`AQI: ${context.aqi}`);
        if (context.pm25 !== null) envDescription.push(`PM2.5: ${context.pm25} µg/m³`);
        if (context.uvIndex !== null) envDescription.push(`UV Index: ${context.uvIndex}`);

        userPrompt = `Dữ liệu môi trường hiện tại:
${envDescription.join('\n')}

Thông tin người dùng:
- Nhóm tuổi: ${context.ageGroup}
- Điểm nguy cơ: ${context.riskScore}/100 (${context.riskLevel})
- Yếu tố chính: ${context.primaryFactors.join(', ') || 'Không có'}

Hãy phân tích và đưa ra khuyến nghị cá nhân hóa.`;
      }

      console.log("Context:", JSON.stringify(context, null, 2));
    }

    console.log("Calling AI with fallback for health analysis");

    const result = await callAIWithFallback({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 1000,
      functionName: "stroke-health-ai",
    });

    const content = result.content;
    console.log("AI response:", content);

    // Try to parse JSON from response
    let parsedContent;
    try {
      const jsonMatch = content?.match(/```json\s*([\s\S]*?)\s*```/) || content?.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      parsedContent = JSON.parse(jsonStr);
    } catch {
      parsedContent = { text: content, type: 'text' };
    }

    return new Response(JSON.stringify(parsedContent), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in stroke-health-ai:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        fallback: {
          summary: "Không thể kết nối AI. Vui lòng theo dõi các chỉ số môi trường.",
          warnings: [],
          recommendations: {
            do: ["Uống đủ nước", "Nghỉ ngơi điều độ"],
            avoid: ["Hoạt động ngoài trời khi AQI cao"]
          },
          healthTip: "Theo dõi sức khỏe định kỳ",
          urgency: "low"
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
