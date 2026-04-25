import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Vietnamese voice IDs from ElevenLabs
const VOICES = {
  north: 'EXAVITQu4vr4xnSDxMaL', // Sarah - clear voice for official announcements
  south: 'FGY2WhTYpPnrIDTdsKH5', // Laura
  default: 'onwK4e9ZLuTAKqWW03F9', // Daniel
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    const { text, type, region } = await req.json();
    
    if (!text) {
      throw new Error('Text is required');
    }

    // Select voice based on region
    let voiceId = VOICES.default;
    if (region === 'north') voiceId = VOICES.north;
    else if (region === 'south') voiceId = VOICES.south;

    // Choose model based on type
    const model = type === 'briefing' ? 'eleven_multilingual_v2' : 'eleven_turbo_v2_5';

    console.log(`🎙️ Generating voice: type=${type}, region=${region}, text=${text.substring(0, 50)}...`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: model,
          voice_settings: {
            stability: type === 'alert' ? 0.8 : 0.5,
            similarity_boost: 0.75,
            style: type === 'alert' ? 0.3 : 0.5,
            use_speaker_boost: true,
            speed: type === 'alert' ? 0.9 : 1.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('❌ ElevenLabs error:', response.status, errText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = base64Encode(audioBuffer);

    console.log('✅ Voice generated successfully');

    return new Response(JSON.stringify({
      success: true,
      audioContent: audioBase64,
      format: 'mp3',
      voiceId,
      model,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Voice error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
