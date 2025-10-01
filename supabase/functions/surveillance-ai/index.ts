import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Search function
async function searchGoogle(query: string): Promise<string> {
  try {
    console.log('Searching Google for:', query);
    const response = await fetch(`https://www.googleapis.com/customsearch/v1?key=${Deno.env.get('GOOGLE_API_KEY')}&cx=${Deno.env.get('GOOGLE_SEARCH_ENGINE_ID')}&q=${encodeURIComponent(query)}&num=5`);
    
    if (!response.ok) {
      return "Không thể tìm kiếm Google lúc này.";
    }

    const data = await response.json();
    const results = data.items?.slice(0, 3).map((item: any) => 
      `📌 ${item.title}\n${item.snippet}\n🔗 ${item.link}`
    ).join('\n\n') || "Không tìm thấy kết quả.";
    
    return results;
  } catch (error) {
    console.error('Google search error:', error);
    return "Lỗi khi tìm kiếm.";
  }
}

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

    const systemPrompt = `Bạn là trợ lý AI chuyên về giám sát dịch bệnh tại TP.HCM với khả năng tìm kiếm thông tin mới nhất.
    
Nhiệm vụ:
- Phân tích dữ liệu giám sát bệnh truyền nhiễm
- Đưa ra khuyến nghị về phòng chống dịch dựa trên thông tin mới nhất
- Giải thích xu hướng và pattern trong dữ liệu
- Trả lời câu hỏi về các ca bệnh
- TỰ ĐỘNG tìm kiếm Google khi cần thông tin mới nhất về:
  * Tình hình dịch bệnh hiện tại
  * Khuyến cáo y tế mới
  * Biện pháp phòng chống cập nhật
  * Tin tức y tế quan trọng

Dữ liệu hiện tại trong hệ thống:
${JSON.stringify(cases?.slice(0, 10), null, 2)}

Khi cần thông tin mới, hãy gọi tool search_google.
Hãy trả lời bằng tiếng Việt, ngắn gọn, chuyên nghiệp và dựa trên nguồn tin đáng tin cậy.`;

    // Gọi AI với tool calling để search Google khi cần
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
        tools: [
          {
            type: 'function',
            function: {
              name: 'search_google',
              description: 'Tìm kiếm thông tin mới nhất trên Google về y tế, dịch bệnh, tin tức sức khỏe. Sử dụng khi cần thông tin cập nhật hoặc xác minh dữ liệu.',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Từ khóa tìm kiếm (tiếng Việt hoặc tiếng Anh)'
                  }
                },
                required: ['query']
              }
            }
          }
        ],
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1500,
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
    let aiMessage = data.choices[0].message;

    // Kiểm tra xem AI có muốn gọi tool không
    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      console.log('AI requested tool calls:', aiMessage.tool_calls);
      
      // Xử lý các tool calls
      const toolResults = [];
      for (const toolCall of aiMessage.tool_calls) {
        if (toolCall.function.name === 'search_google') {
          const args = JSON.parse(toolCall.function.arguments);
          const searchResults = await searchGoogle(args.query);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: 'search_google',
            content: searchResults
          });
        }
      }

      // Gọi AI lại với kết quả search
      const secondResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query },
            aiMessage,
            ...toolResults
          ],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });

      const secondData = await secondResponse.json();
      aiMessage = secondData.choices[0].message;
    }

    const aiResponse = aiMessage.content;
    console.log('AI response generated successfully');

    return new Response(JSON.stringify({ 
      response: aiResponse,
      casesAnalyzed: cases?.length || 0,
      searchUsed: aiMessage.tool_calls ? true : false
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
