import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    console.log('Map Agent received prompt:', prompt);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Bạn là Trợ lý không gian (Map Agent) cho HCMC Health Hub.
Mục tiêu: nhận yêu cầu tự nhiên (tiếng Việt hoặc tiếng Anh) từ người dùng về giám sát dịch bệnh, điểm nóng, tuyến vận chuyển, hoặc dự báo nguy cơ – sau đó sinh các lệnh thao tác bản đồ dưới dạng JSON.

Quy tắc phản hồi:
1. Chỉ xuất JSON hợp lệ, không mô tả, không giải thích.
2. Mỗi phần tử JSON là một lệnh (object) với key "cmd" và các tham số cần thiết.
3. Các lệnh được hỗ trợ:
   - add-marker: thêm điểm đánh dấu (lat, lng, label, color)
   - add-heatmap: tạo heatmap từ dữ liệu (points: array of {lat, lng, intensity})
   - add-circle: tạo vòng tròn/buffer (lat, lng, radius_km, color, label)
   - add-route: vẽ tuyến đường (points: array of {lat, lng}, color, label)
   - clear: xóa tất cả layers
   - fit-bounds: zoom tới vùng cụ thể (bounds: [[minLat, minLng], [maxLat, maxLng]])
4. Tất cả toạ độ là {lat, lng} hoặc [lat, lng].
5. Màu sắc: "red", "blue", "green", "yellow", "orange", "purple"
6. Toạ độ trung tâm HCMC: lat: 10.7756, lng: 106.7009
7. Các quận chính:
   - Quận 1: 10.7756, 106.7009
   - Quận Bình Thạnh: 10.8056, 106.7109
   - Quận Tân Bình: 10.7991, 106.6544
   - Quận Gò Vấp: 10.8373, 106.6676
   - Thủ Đức: 10.8509, 106.7718
   - Quận Bình Tân: 10.7401, 106.6137
   - Bình Chánh: 10.6917, 106.5835
8. Khi thiếu dữ liệu cụ thể, tạo marker "Cần dữ liệu" tại trung tâm HCMC.

Ví dụ JSON đầu ra:
[
  {"cmd": "add-marker", "lat": 10.7756, "lng": 106.7009, "label": "Điểm nóng Quận 1", "color": "red"},
  {"cmd": "add-circle", "lat": 10.7756, "lng": 106.7009, "radius_km": 2, "color": "red", "label": "Vùng cảnh báo 2km"},
  {"cmd": "add-heatmap", "points": [{"lat": 10.7756, "lng": 106.7009, "intensity": 0.8}, {"lat": 10.8056, "lng": 106.7109, "intensity": 0.6}]}
]

Chỉ trả về JSON array, không có text nào khác.`;

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
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.error('Payment required');
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    console.log('AI response:', aiResponse);

    // Parse JSON from AI response
    let commands;
    try {
      // Try to extract JSON if AI added extra text
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        commands = JSON.parse(jsonMatch[0]);
      } else {
        commands = JSON.parse(aiResponse);
      }
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      // Fallback: create a marker indicating error
      commands = [{
        cmd: 'add-marker',
        lat: 10.7756,
        lng: 106.7009,
        label: 'Không thể xử lý yêu cầu',
        color: 'red'
      }];
    }

    return new Response(
      JSON.stringify({ commands }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Map agent error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
