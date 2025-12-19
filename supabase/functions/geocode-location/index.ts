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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const { lat, lon } = await req.json();
    
    if (!lat || !lon) {
      return new Response(
        JSON.stringify({ error: 'Missing coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Geocoding coordinates: ${lat}, ${lon}`);

    // Use AI to determine address from GPS
    if (LOVABLE_API_KEY) {
      try {
        const prompt = `Tọa độ GPS: ${lat}, ${lon}
        
Hãy xác định địa chỉ chính xác nhất có thể tại Việt Nam dựa trên tọa độ này.

Trả về JSON với format sau (chỉ JSON, không markdown):
{
  "address": "<địa chỉ chi tiết: số nhà, đường, phường/xã>",
  "district": "<quận/huyện>",
  "city": "<thành phố>",
  "full_address": "<địa chỉ đầy đủ>",
  "area_type": "<loại khu vực: khu dân cư, khu công nghiệp, trung tâm thương mại, bệnh viện, trường học, công viên, khu vực nông thôn, etc>",
  "nearby_landmarks": ["<các địa điểm gần đó nếu biết>"]
}`;

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
                content: 'Bạn là chuyên gia địa lý Việt Nam. Dựa vào tọa độ GPS, hãy xác định địa chỉ chính xác nhất có thể. Nếu không chắc chắn về địa chỉ cụ thể, hãy đưa ra khu vực gần nhất. Chỉ trả về JSON.' 
              },
              { role: 'user', content: prompt }
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('Geocoded result:', JSON.stringify(parsed));
            
            return new Response(
              JSON.stringify({
                success: true,
                coordinates: { lat, lon },
                ...parsed
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (aiError) {
        console.error('AI geocoding error:', aiError);
      }
    }

    // Fallback - basic city detection
    let city = 'TP. Hồ Chí Minh';
    let district = '';
    
    if (lat >= 20.8 && lat <= 21.3 && lon >= 105.5 && lon <= 106.1) {
      city = 'Hà Nội';
    } else if (lat >= 15.8 && lat <= 16.3 && lon >= 107.9 && lon <= 108.5) {
      city = 'Đà Nẵng';
    }

    return new Response(
      JSON.stringify({
        success: true,
        coordinates: { lat, lon },
        address: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        district,
        city,
        full_address: `${city}, Việt Nam`,
        area_type: 'Không xác định',
        nearby_landmarks: []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in geocode-location:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
