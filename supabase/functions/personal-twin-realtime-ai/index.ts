import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAIWithFallback } from "../_shared/aiProvider.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= TYPES =============
interface TwinContext {
  profile: {
    age?: number;
    gender?: string;
    bloodType?: string;
    chronicConditions?: string[];
    allergies?: string[];
    medications?: string[];
  };
  location?: {
    lat: number;
    lng: number;
    address?: string;
    locationType?: string;
  };
  environment?: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    aqi?: number;
    uvIndex?: number;
  };
  proximity?: {
    nearbyDevices: number;
    crowdDensity: string;
    exposureScore: number;
    riskZone?: string;
  };
  healthSystems?: {
    id: string;
    name: string;
    score: number;
    status: string;
    factors: string[];
  }[];
  recentAlerts?: {
    type: string;
    severity: string;
    title: string;
    message: string;
  }[];
  sessionContext?: {
    sessionId: string;
    activatedAt: string;
    accessType: string;
  };
}

interface AgentRequest {
  action: 'generate_insights' | 'assess_risk' | 'get_guidance' | 'stream_analysis';
  twinId: string;
  context: TwinContext;
  trigger?: string; // What triggered this evaluation
  language?: string;
}

// ============= SYSTEM PROMPTS =============
const TWIN_AI_SYSTEM_PROMPT = `Bạn là Personal Digital Twin AI Agent - một trợ lý sức khỏe cá nhân thông minh hoạt động theo thời gian thực.

VAI TRÒ:
- Đại diện và cập nhật liên tục bản sao số sức khỏe của một cá nhân
- Phân tích dữ liệu đa nguồn: hồ sơ cá nhân, vị trí GPS, môi trường, tiếp xúc gần, phiên QR
- Cung cấp đánh giá rủi ro cá nhân hóa và hướng dẫn phòng ngừa

QUY TẮC BẮT BUỘC:
1. KHÔNG đưa ra chẩn đoán y khoa
2. KHÔNG dự đoán xác định (chỉ đánh giá rủi ro tương đối)
3. Giải thích rủi ro bằng ngôn ngữ dễ hiểu
4. Bảo vệ quyền riêng tư - không tiết lộ dữ liệu nhạy cảm
5. Ưu tiên tính liên quan hơn khối lượng thông tin
6. Thích ứng với vị trí và mức độ phơi nhiễm

ĐỊNH DẠNG OUTPUT (JSON):
{
  "overallStatus": "good|caution|warning|critical",
  "statusSummary": "Tóm tắt 1 câu về tình trạng hiện tại",
  "riskIndicators": [
    {
      "category": "environment|health|proximity|lifestyle",
      "level": "low|medium|high",
      "indicator": "Mô tả ngắn gọn",
      "context": "Giải thích chi tiết"
    }
  ],
  "alerts": [
    {
      "priority": "info|warning|urgent",
      "title": "Tiêu đề cảnh báo",
      "message": "Nội dung cảnh báo",
      "action": "Hành động khuyến nghị"
    }
  ],
  "insights": [
    {
      "type": "observation|recommendation|reminder",
      "content": "Nội dung insight"
    }
  ],
  "guidance": {
    "immediate": ["Hành động cần làm ngay"],
    "shortTerm": ["Trong vài giờ tới"],
    "preventive": ["Phòng ngừa lâu dài"]
  }
}`;

const RISK_ASSESSMENT_PROMPT = `Bạn là chuyên gia đánh giá rủi ro sức khỏe. Phân tích ngữ cảnh và đưa ra đánh giá rủi ro cá nhân hóa.

KHÔNG chẩn đoán. Chỉ đánh giá mức độ rủi ro tương đối dựa trên:
- Tiền sử sức khỏe
- Điều kiện môi trường hiện tại
- Mức độ tiếp xúc/phơi nhiễm
- Vị trí và bối cảnh

Trả về JSON với cấu trúc:
{
  "riskScore": 0-100,
  "riskLevel": "low|medium|high|critical",
  "primaryFactors": ["Yếu tố chính 1", "Yếu tố chính 2"],
  "contextualRisks": [
    {"risk": "Mô tả", "probability": "low|medium|high", "impact": "minor|moderate|severe"}
  ],
  "mitigationSteps": ["Bước 1", "Bước 2"]
}`;

// ============= CONTEXT BUILDER =============
function buildContextSummary(context: TwinContext, language: string = 'vi'): string {
  const parts: string[] = [];

  // Profile
  if (context.profile) {
    const p = context.profile;
    parts.push(`HỒ SƠ: ${p.age ? `${p.age} tuổi` : ''} ${p.gender || ''} ${p.bloodType ? `(${p.bloodType})` : ''}`);
    if (p.chronicConditions?.length) {
      parts.push(`Bệnh nền: ${p.chronicConditions.join(', ')}`);
    }
    if (p.allergies?.length) {
      parts.push(`Dị ứng: ${p.allergies.join(', ')}`);
    }
    if (p.medications?.length) {
      parts.push(`Thuốc đang dùng: ${p.medications.join(', ')}`);
    }
  }

  // Location
  if (context.location) {
    const loc = context.location;
    parts.push(`VỊ TRÍ: ${loc.address || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`}${loc.locationType ? ` (${loc.locationType})` : ''}`);
  }

  // Environment
  if (context.environment) {
    const env = context.environment;
    const envParts: string[] = [];
    if (env.temperature !== undefined) envParts.push(`${env.temperature}°C`);
    if (env.humidity !== undefined) envParts.push(`Độ ẩm ${env.humidity}%`);
    if (env.aqi !== undefined) envParts.push(`AQI ${env.aqi}`);
    if (env.uvIndex !== undefined) envParts.push(`UV ${env.uvIndex}`);
    if (envParts.length) {
      parts.push(`MÔI TRƯỜNG: ${envParts.join(', ')}`);
    }
  }

  // Proximity
  if (context.proximity) {
    const prox = context.proximity;
    parts.push(`TIẾP XÚC: ${prox.nearbyDevices} thiết bị gần, Mật độ ${prox.crowdDensity}, Điểm phơi nhiễm ${prox.exposureScore}${prox.riskZone ? `, Khu vực ${prox.riskZone}` : ''}`);
  }

  // Health Systems
  if (context.healthSystems?.length) {
    const systems = context.healthSystems
      .filter(s => s.status !== 'optimal')
      .map(s => `${s.name}: ${s.score}/100 (${s.status})`)
      .join(', ');
    if (systems) {
      parts.push(`HỆ THỐNG CẦN CHÚ Ý: ${systems}`);
    }
  }

  // Recent Alerts
  if (context.recentAlerts?.length) {
    const alerts = context.recentAlerts
      .slice(0, 3)
      .map(a => `[${a.severity.toUpperCase()}] ${a.title}`)
      .join('; ');
    parts.push(`CẢNH BÁO GẦN ĐÂY: ${alerts}`);
  }

  // Session Context
  if (context.sessionContext) {
    parts.push(`PHIÊN: ${context.sessionContext.accessType} từ ${new Date(context.sessionContext.activatedAt).toLocaleTimeString('vi-VN')}`);
  }

  return parts.join('\n');
}

// ============= AI CALL (uses shared fallback provider) =============
async function callTwinAI(
  systemPrompt: string,
  userPrompt: string,
  stream: boolean = false
): Promise<string> {
  if (stream) {
    // For streaming, try primary directly with fallback
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (LOVABLE_API_KEY) {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: true,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });
      if (response.ok) return response as any; // return raw response for streaming
    }
    // Fallback: non-streaming
  }

  const result = await callAIWithFallback({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    maxTokens: 2048,
    functionName: 'personal-twin-realtime-ai',
  });

  console.log(`[TWIN-REALTIME-AI] AI OK via ${result.providerUsed} (${result.latencyMs}ms)`);
  return result.content;
}

// ============= PARSE AI RESPONSE =============
function parseAIResponse(content: string): any {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    // If no JSON found, return structured fallback
    return {
      overallStatus: 'caution',
      statusSummary: content.slice(0, 200),
      riskIndicators: [],
      alerts: [],
      insights: [{ type: 'observation', content }],
      guidance: { immediate: [], shortTerm: [], preventive: [] }
    };
  } catch (e) {
    console.error('Failed to parse AI response:', e);
    return {
      overallStatus: 'caution',
      statusSummary: 'Đang phân tích dữ liệu...',
      riskIndicators: [],
      alerts: [],
      insights: [],
      guidance: { immediate: [], shortTerm: [], preventive: [] }
    };
  }
}

// ============= MAIN HANDLER =============
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, twinId, context, trigger, language = 'vi' } = await req.json() as AgentRequest;
    
    console.log(`[TWIN-REALTIME-AI] Action: ${action}, Twin: ${twinId}, Trigger: ${trigger || 'manual'}`);

    const contextSummary = buildContextSummary(context, language);
    const timestamp = new Date().toLocaleString('vi-VN');

    switch (action) {
      case 'generate_insights': {
        const userPrompt = `THỜI GIAN: ${timestamp}
TRIGGER: ${trigger || 'Cập nhật định kỳ'}

${contextSummary}

Hãy phân tích toàn diện tình trạng Digital Twin và đưa ra:
1. Đánh giá tổng quan tình trạng hiện tại
2. Các chỉ số rủi ro theo ngữ cảnh
3. Cảnh báo cần thiết (nếu có)
4. Insights cá nhân hóa
5. Hướng dẫn phòng ngừa

Trả về JSON theo định dạng đã quy định.`;

        const aiResponse = await callTwinAI(TWIN_AI_SYSTEM_PROMPT, userPrompt);
          const parsed = parseAIResponse(aiResponse);

          return new Response(
            JSON.stringify({
              success: true,
              twinId,
              timestamp: new Date().toISOString(),
              trigger,
              analysis: parsed
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
      }

      case 'assess_risk': {
        const userPrompt = `THỜI GIAN: ${timestamp}

${contextSummary}

Đánh giá mức độ rủi ro sức khỏe hiện tại dựa trên tất cả ngữ cảnh có sẵn.
Chú trọng vào:
- Tương tác giữa bệnh nền và môi trường
- Mức độ phơi nhiễm và tiếp xúc
- Vị trí và loại khu vực

Trả về JSON theo định dạng đánh giá rủi ro.`;

        const aiResponse = await callTwinAI(RISK_ASSESSMENT_PROMPT, userPrompt);
        const parsed = parseAIResponse(aiResponse);

        return new Response(
          JSON.stringify({
            success: true,
            twinId,
            timestamp: new Date().toISOString(),
            riskAssessment: parsed
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_guidance': {
        const userPrompt = `THỜI GIAN: ${timestamp}
TRIGGER: ${trigger || 'Yêu cầu hướng dẫn'}

${contextSummary}

Dựa trên tình trạng hiện tại, hãy đưa ra hướng dẫn cụ thể và khả thi:
1. Hành động cần làm ngay (trong 1 giờ tới)
2. Kế hoạch ngắn hạn (hôm nay)
3. Lời khuyên phòng ngừa

Tập trung vào những gì thực sự cần thiết, không đưa ra quá nhiều gợi ý.`;

        const aiResponse = await callTwinAI(TWIN_AI_SYSTEM_PROMPT, userPrompt);
        const parsed = parseAIResponse(aiResponse);

        return new Response(
          JSON.stringify({
            success: true,
            twinId,
            timestamp: new Date().toISOString(),
            guidance: parsed.guidance || parsed
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'stream_analysis': {
        // Return streaming response for real-time UI updates
        const userPrompt = `THỜI GIAN: ${timestamp}
TRIGGER: ${trigger || 'Phân tích realtime'}

${contextSummary}

Phân tích nhanh và đưa ra insights quan trọng nhất. Ưu tiên tính kịp thời.`;

        const streamResult = await callTwinAI(TWIN_AI_SYSTEM_PROMPT, userPrompt, true);

        if (typeof streamResult !== 'string' && (streamResult as any)?.body) {
          return new Response((streamResult as any).body, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        }

        const parsed = parseAIResponse(streamResult as string);
        return new Response(
          JSON.stringify({ success: true, twinId, analysis: parsed }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[TWIN-REALTIME-AI] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
