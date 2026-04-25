import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a friendly Vietnamese health awareness assistant integrated into an environmental health monitoring system. You are NOT a doctor and you do NOT provide medical diagnoses.

Your role:
1. Have natural, casual conversations with users in Vietnamese
2. Subtly collect their age group during conversation when appropriate
3. Provide general wellness tips based on environmental conditions
4. Give calm, non-alarmist information about environmental factors that may affect wellbeing
5. Never claim to diagnose or predict specific health events like strokes

Environmental context provided to you includes:
- Temperature, humidity, pressure, AQI, PM2.5 levels
- Current risk score (0-100 based on environmental stress factors only)
- User's age group if known

Guidelines:
- Be warm, supportive, and conversational
- Use Vietnamese language naturally
- If asked about health concerns, encourage consulting healthcare professionals
- Frame environmental risks as "factors that may cause stress on the body" not medical predictions
- Keep responses concise (2-4 sentences typically)
- If the user mentions their age or age group, acknowledge it and explain you'll factor it into environmental assessments

Age group detection:
- If user mentions age, respond with appropriate acknowledgment
- Age groups are: <18, 18-35, 36-55, >55
- Older age groups have higher environmental sensitivity

Remember: You are an early awareness system for environmental health factors, NOT a medical diagnostic tool.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, history = [] } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Stroke risk chat request:', { message, context });

    // Build context description
    let contextDescription = '';
    if (context) {
      contextDescription = `\n\nCurrent environmental data:
- Temperature: ${context.environment?.temperature ?? 'unknown'}°C
- Humidity: ${context.environment?.humidity ?? 'unknown'}%
- Pressure: ${context.environment?.pressure ?? 'unknown'} hPa
- AQI: ${context.environment?.aqi ?? 'unknown'}
- PM2.5: ${context.environment?.pm25 ?? 'unknown'}
- Environmental risk score: ${context.risk?.score ?? 0}/100 (${context.risk?.level ?? 'LOW'})
- Risk factors: ${context.risk?.factors?.join(', ') || 'none'}
- User age group: ${context.ageGroup || 'unknown'}
- GPS available: ${context.hasGPS ? 'yes' : 'no'}`;
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + contextDescription },
      ...history.slice(-6),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', response: 'Xin lỗi, hệ thống đang bận. Vui lòng thử lại sau.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices?.[0]?.message?.content || 'Xin lỗi, tôi không thể xử lý yêu cầu này.';

    console.log('AI response generated successfully');

    return new Response(
      JSON.stringify({ response: assistantResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Stroke risk chat error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: 'Xin lỗi, đã có lỗi xảy ra. Hệ thống vẫn đang theo dõi môi trường của bạn.'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
