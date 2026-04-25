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
    const { description, lat, lng } = await req.json();
    console.log('Classify alert:', { description, lat, lng });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a health surveillance alert classifier. Given a user's description of a health concern or disease sighting, classify it into one of these categories and assign an appropriate icon and severity.

CATEGORIES (use exact values):
- dengue: Sốt xuất huyết / Dengue
- covid: COVID-19 / Respiratory illness
- food_poisoning: Ngộ độc thực phẩm / Food poisoning
- flood: Ngập lụt / Flooding health risk
- pollution: Ô nhiễm / Air/water pollution
- animal_bite: Động vật cắn / Animal bite (rabies risk)
- hand_foot_mouth: Tay chân miệng / Hand foot mouth disease
- measles: Sởi / Measles
- unknown: Không xác định / Unknown

ICONS (use exact values):
- 🦟 for dengue (mosquito-related)
- 🫁 for covid/respiratory
- 🤮 for food_poisoning
- 🌊 for flood
- 💨 for pollution
- 🐕 for animal_bite
- 🤒 for hand_foot_mouth, measles, or fever
- ⚠️ for unknown

SEVERITY (use exact values):
- critical: Life-threatening, immediate danger
- high: Serious health risk, needs attention
- medium: Moderate concern
- low: Minor issue, informational

Respond ONLY with valid JSON:
{"category": "...", "icon": "...", "severity": "...", "summary": "brief 1-line summary in Vietnamese"}`;

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
          { role: 'user', content: `User alert description: "${description}"\nLocation: lat=${lat}, lng=${lng}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      // Return default classification
      return new Response(
        JSON.stringify({ 
          category: 'unknown', 
          icon: '⚠️', 
          severity: 'medium',
          summary: description.slice(0, 100)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    console.log('AI classification:', aiResponse);

    let classification;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      classification = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse);
    } catch (e) {
      console.error('Failed to parse classification:', e);
      classification = { 
        category: 'unknown', 
        icon: '⚠️', 
        severity: 'medium',
        summary: description.slice(0, 100)
      };
    }

    return new Response(
      JSON.stringify(classification),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Classify alert error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
