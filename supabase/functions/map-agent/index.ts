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

    const systemPrompt = `You are a Spatial Assistant (Map Agent) for Global Health Surveillance SaaS.
Purpose: Receive natural language requests (in ANY language: Vietnamese, English, Spanish, French, Chinese, etc.) about disease surveillance, hotspots, transport routes, or risk forecasts – then generate map manipulation commands as JSON.

MULTILINGUAL UNDERSTANDING:
- You MUST understand and process queries in any language
- Common patterns in Vietnamese: "Hiển thị" (Show), "Đánh dấu" (Mark), "Vẽ" (Draw), "Tìm" (Find)
- Common patterns in English: "Show", "Display", "Mark", "Find", "Draw"
- Common patterns in Spanish: "Mostrar", "Marcar", "Dibujar"
- Detect language from [Language: XX] prefix if provided

GLOBAL COVERAGE:
1. Southeast Asia:
   - Vietnam (HCMC: 10.8231, 106.6297), (Hanoi: 21.0285, 105.8542)
   - Thailand (Bangkok: 13.7563, 100.5018)
   - Indonesia (Jakarta: -6.2088, 106.8456)
   - Singapore (1.3521, 103.8198)
   - Philippines (Manila: 14.5995, 120.9842)
   - Malaysia (Kuala Lumpur: 3.1390, 101.6869)

2. Other Regions:
   - Japan (Tokyo: 35.6762, 139.6503)
   - South Korea (Seoul: 37.5665, 126.9780)
   - India (Delhi: 28.7041, 77.1025)
   - USA (New York: 40.7128, -74.0060)
   - Brazil (São Paulo: -23.5505, -46.6333)
   - UK (London: 51.5074, -0.1278)

RESPONSE RULES:
1. Output ONLY valid JSON, no descriptions or explanations
2. Each JSON element is a command object with "cmd" key and required parameters
3. Supported commands:
   - add-marker: add marker (lat, lng, label, color)
   - add-heatmap: create heatmap (points: array of {lat, lng, intensity})
   - add-circle: create circle/buffer (lat, lng, radius_km, color, label)
   - add-route: draw route (points: array of {lat, lng}, color, label)
   - clear: remove all layers
   - fit-bounds: zoom to specific area (bounds: [[minLat, minLng], [maxLat, maxLng]])
4. All coordinates are {lat, lng}
5. Colors: "red", "blue", "green", "yellow", "orange", "purple", "#hexcode"
6. For disease queries, use appropriate risk colors:
   - High risk: "red" or "#ef4444"
   - Medium risk: "orange" or "#f97316"  
   - Low risk: "green" or "#22c55e"
7. When lacking specific data, generate reasonable simulated hotspots based on query context

ICD-11 Disease Codes (use for labels):
- Dengue: 1D2Z
- COVID-19: RA01
- Malaria: 1F40
- Influenza: 1E30
- Hand Foot Mouth: 1F05.0

Example output:
[
  {"cmd": "add-marker", "lat": 10.7756, "lng": 106.7009, "label": "Dengue Hotspot (1D2Z)", "color": "red"},
  {"cmd": "add-circle", "lat": 10.7756, "lng": 106.7009, "radius_km": 2, "color": "red", "label": "Alert Zone 2km"},
  {"cmd": "add-heatmap", "points": [{"lat": 10.7756, "lng": 106.7009, "intensity": 0.8}]}
]

ONLY return JSON array, no other text.`;

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
