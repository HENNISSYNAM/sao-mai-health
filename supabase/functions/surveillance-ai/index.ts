import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, context } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Get surveillance data context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: cases } = await supabase
      .from('surveillance_cases')
      .select('*')
      .order('report_date', { ascending: false })
      .limit(50);

    const systemPrompt = `Bạn là trợ lý AI chuyên về giám sát dịch bệnh tại TP.HCM. 
    
Nhiệm vụ:
- Phân tích dữ liệu giám sát bệnh truyền nhiễm
- Đưa ra khuyến nghị về phòng chống dịch
- Giải thích xu hướng và pattern trong dữ liệu
- Trả lời câu hỏi về các ca bệnh

Dữ liệu hiện tại:
${JSON.stringify(cases?.slice(0, 10), null, 2)}

Hãy trả lời bằng tiếng Việt, ngắn gọn và chuyên nghiệp.`;

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
          { role: 'user', content: query }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Đã vượt quá giới hạn sử dụng. Vui lòng thử lại sau.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Cần nạp thêm credits. Vui lòng liên hệ quản trị viên.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI response generated successfully');

    return new Response(JSON.stringify({ 
      response: aiResponse,
      casesAnalyzed: cases?.length || 0 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in surveillance-ai function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Đã xảy ra lỗi khi xử lý yêu cầu',
      response: 'Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
