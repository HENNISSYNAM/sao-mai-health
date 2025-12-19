import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { context, type = 'recommendations' }: { context: HealthContext; type?: string } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

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
      if (context.temperature !== null) {
        envDescription.push(`Nhiệt độ: ${context.temperature}°C`);
      }
      if (context.humidity !== null) {
        envDescription.push(`Độ ẩm: ${context.humidity}%`);
      }
      if (context.pressure !== null || context.devicePressure !== null) {
        const pressure = context.devicePressure || context.pressure;
        envDescription.push(`Áp suất: ${pressure?.toFixed(0)} hPa${context.devicePressure ? ' (từ thiết bị)' : ''}`);
      }
      if (context.pressureChange1h !== null) {
        envDescription.push(`Thay đổi áp suất 1h: ${context.pressureChange1h > 0 ? '+' : ''}${context.pressureChange1h.toFixed(1)} hPa`);
      }
      if (context.aqi !== null) {
        envDescription.push(`AQI: ${context.aqi}`);
      }
      if (context.pm25 !== null) {
        envDescription.push(`PM2.5: ${context.pm25} µg/m³`);
      }
      if (context.uvIndex !== null) {
        envDescription.push(`UV Index: ${context.uvIndex}`);
      }

      userPrompt = `Dữ liệu môi trường hiện tại:
${envDescription.join('\n')}

Thông tin người dùng:
- Nhóm tuổi: ${context.ageGroup}
- Điểm nguy cơ: ${context.riskScore}/100 (${context.riskLevel})
- Yếu tố chính: ${context.primaryFactors.join(', ') || 'Không có'}

Hãy phân tích và đưa ra khuyến nghị cá nhân hóa.`;
    }

    console.log("Calling Lovable AI for health recommendations");
    console.log("Context:", JSON.stringify(context, null, 2));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Quá nhiều yêu cầu, vui lòng thử lại sau." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Dịch vụ AI tạm ngưng, vui lòng thử lại sau." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", status, errorText);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    console.log("AI response:", content);

    // Try to parse JSON from response
    let parsedContent;
    try {
      // Extract JSON if wrapped in markdown code blocks
      const jsonMatch = content?.match(/```json\s*([\s\S]*?)\s*```/) || content?.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      parsedContent = JSON.parse(jsonStr);
    } catch {
      // If not JSON, return as text
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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
