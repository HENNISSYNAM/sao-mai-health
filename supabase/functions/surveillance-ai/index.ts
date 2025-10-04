import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch real-time disease data
    const { data: caseEvents, error: caseError } = await supabase
      .from('case_events')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(100);

    if (caseError) throw caseError;

    // Fetch alert data
    const { data: alerts, error: alertError } = await supabase
      .from('alerts')
      .select('*')
      .eq('status', 'open')
      .order('day', { ascending: false })
      .limit(20);

    if (alertError) throw alertError;

    // Calculate statistics
    const totalCases = caseEvents?.length || 0;
    const todayCases = caseEvents?.filter(c => {
      const today = new Date().toISOString().split('T')[0];
      return c.occurred_at?.startsWith(today);
    }).length || 0;

    // Group by disease
    const diseaseStats: Record<string, number> = {};
    caseEvents?.forEach(c => {
      if (c.disease_code) {
        diseaseStats[c.disease_code] = (diseaseStats[c.disease_code] || 0) + 1;
      }
    });

    // Group by district
    const districtStats: Record<string, number> = {};
    caseEvents?.forEach(c => {
      if (c.district_id) {
        districtStats[c.district_id] = (districtStats[c.district_id] || 0) + 1;
      }
    });

    // Build context for AI
    const context = `
Dữ liệu giám sát dịch bệnh TP.HCM (Real-time):

TỔNG QUAN:
- Tổng ca bệnh ghi nhận: ${totalCases}
- Ca bệnh hôm nay: ${todayCases}
- Số cảnh báo đang mở: ${alerts?.length || 0}

PHÂN LOẠI THEO BỆNH:
${Object.entries(diseaseStats)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 5)
  .map(([disease, count]) => `- ${disease}: ${count} ca`)
  .join('\n')}

PHÂN BỐ THEO QUẬN/HUYỆN:
${Object.entries(districtStats)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 5)
  .map(([district, count]) => `- ${district}: ${count} ca`)
  .join('\n')}

CẢN BÁO MỚI NHẤT:
${alerts?.slice(0, 3).map(a => 
  `- ${a.disease_code} tại ${a.district_id || a.ward_id}: ${a.cases} ca (${a.day})`
).join('\n') || 'Không có cảnh báo'}
`;

    // Call Lovable AI API
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Bạn là trợ lý AI chuyên về giám sát dịch bệnh tại TP.HCM. 
            
Nhiệm vụ:
- Phân tích dữ liệu dịch bệnh real-time
- Đưa ra khuyến nghị dựa trên số liệu thực tế
- Trả lời câu hỏi một cách chính xác, ngắn gọn
- Sử dụng emoji phù hợp để dễ hiểu
- Luôn dựa vào dữ liệu được cung cấp

Lưu ý:
- Trả lời bằng tiếng Việt
- Tập trung vào những con số quan trọng
- Đưa ra khuyến nghị cụ thể khi được hỏi
- Giải thích rõ ràng, dễ hiểu`
          },
          {
            role: 'user',
            content: `${context}\n\nCâu hỏi: ${query}`
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            response: '⚠️ Hệ thống đang quá tải. Vui lòng thử lại sau ít phút.' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            response: '⚠️ Hệ thống cần nạp thêm credits. Vui lòng liên hệ quản trị viên.' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('AI service unavailable');
    }

    const aiData = await response.json();
    const aiResponse = aiData.choices[0]?.message?.content || 'Xin lỗi, tôi không thể xử lý câu hỏi này.';

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in surveillance-ai:', error);
    return new Response(
      JSON.stringify({ 
        response: '❌ Đã xảy ra lỗi. Vui lòng thử lại sau.' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
