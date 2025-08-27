import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AppointmentData {
  patient_name: string;
  facility: string;
  appointment_date: string;
  appointment_time: string;
  doctor?: string;
  phone?: string;
  status?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointment, historical_data } = await req.json() as {
      appointment: AppointmentData;
      historical_data?: any[];
    };

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Simple logistic regression features
    const features = extractFeatures(appointment);
    
    // Use OpenAI to analyze no-show risk
    const prompt = `
Analyze the no-show risk for this medical appointment based on these factors:
- Patient: ${appointment.patient_name}
- Facility: ${appointment.facility}
- Date: ${appointment.appointment_date}
- Time: ${appointment.appointment_time}
- Doctor: ${appointment.doctor || 'Not specified'}
- Phone: ${appointment.phone ? 'Provided' : 'Not provided'}

Risk factors to consider:
1. Day of week (Monday = higher risk)
2. Time of day (early morning and late afternoon = higher risk)
3. Phone number provided (reduces risk)
4. Facility type (specialist clinics = higher risk)

Return a JSON response with:
- probability: number between 0 and 1
- risk_level: "High" (>0.7), "Medium" (0.3-0.7), or "Low" (<0.3)
- factors: array of risk factors identified
- overbook_suggestion: percentage (0-30) to overbook for this facility type

Example response:
{
  "probability": 0.35,
  "risk_level": "Medium",
  "factors": ["Early morning appointment", "Monday appointment"],
  "overbook_suggestion": 15
}
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an AI that predicts medical appointment no-show risk. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Parse the AI response
    let prediction;
    try {
      prediction = JSON.parse(aiResponse);
    } catch (e) {
      // Fallback if AI doesn't return valid JSON
      console.error('Failed to parse AI response:', aiResponse);
      prediction = {
        probability: features.baseRisk,
        risk_level: features.baseRisk > 0.7 ? 'High' : features.baseRisk > 0.3 ? 'Medium' : 'Low',
        factors: ['Analysis unavailable'],
        overbook_suggestion: 10
      };
    }

    console.log('No-show prediction generated:', prediction);

    return new Response(JSON.stringify(prediction), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai_no_show function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      probability: 0.3,
      risk_level: 'Medium',
      factors: ['Error in prediction'],
      overbook_suggestion: 10
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractFeatures(appointment: AppointmentData) {
  const appointmentDate = new Date(appointment.appointment_date);
  const dayOfWeek = appointmentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const time = appointment.appointment_time;
  const hour = parseInt(time.split(':')[0]);
  
  let baseRisk = 0.2; // Base 20% no-show rate
  
  // Day of week factor (Monday = higher risk)
  if (dayOfWeek === 1) baseRisk += 0.1;
  if (dayOfWeek === 0 || dayOfWeek === 6) baseRisk += 0.05; // Weekend
  
  // Time of day factor
  if (hour < 9 || hour > 16) baseRisk += 0.1; // Early morning or late afternoon
  
  // Phone number factor
  if (!appointment.phone) baseRisk += 0.15;
  
  // Facility type factor
  if (appointment.facility.includes('chuyên khoa') || appointment.facility.includes('Tim mạch')) {
    baseRisk += 0.1; // Specialist clinics
  }
  
  return {
    baseRisk: Math.min(baseRisk, 0.9), // Cap at 90%
    dayOfWeek,
    hour,
    hasPhone: !!appointment.phone
  };
}