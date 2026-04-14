import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { action, lat, lng, radiusKm = 50 } = await req.json();

    console.log(`[HOTSPOT-DETECTOR] Action: ${action}`);

    if (action === 'detect') {
      // Get user density in area
      const { data: users } = await supabase.rpc('get_nearby_users', {
        p_lat: lat,
        p_lng: lng,
        p_radius_km: radiusKm
      });

      const userDensity = users?.length || 0;

      // Get existing hotspots
      const { data: existingHotspots } = await supabase
        .from('disease_hotspots')
        .select('*')
        .gte('expires_at', new Date().toISOString());

      // Use AI to search for disease outbreaks in the area
      let aiSources: any[] = [];
      let detectedHotspots: any[] = [];

      if (lovableApiKey) {
        try {
          // Search for disease news in the area
          const searchResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content: `Bạn là hệ thống phát hiện dịch bệnh. Dựa trên vị trí GPS, xác định các vùng có nguy cơ dịch bệnh cao tại Việt Nam. 
Trả lời JSON với format:
{
  "hotspots": [
    {
      "lat": number,
      "lng": number,
      "disease_code": "string",
      "disease_name": "string",
      "severity": "low|medium|high|critical",
      "case_count": number,
      "source": "string (nguồn thông tin)"
    }
  ]
}`
                },
                {
                  role: 'user',
                  content: `Tìm các vùng dịch bệnh trong bán kính ${radiusKm}km từ tọa độ (${lat}, ${lng}). Ngày hiện tại: ${new Date().toISOString().split('T')[0]}`
                }
              ],
              max_tokens: 500,
            }),
          });

          if (searchResponse.ok) {
            const data = await searchResponse.json();
            const content = data.choices?.[0]?.message?.content;
            
            if (content) {
              try {
                const parsed = JSON.parse(content);
                if (parsed.hotspots && Array.isArray(parsed.hotspots)) {
                  detectedHotspots = parsed.hotspots;
                  aiSources = parsed.hotspots.map((h: any) => ({
                    disease: h.disease_name,
                    source: h.source,
                    detectedAt: new Date().toISOString(),
                  }));
                }
              } catch (e) {
                console.log('[HOTSPOT-DETECTOR] AI response not JSON');
              }
            }
          }
        } catch (aiError) {
          console.error('[HOTSPOT-DETECTOR] AI search error:', aiError);
        }
      }

      // Combine user density with AI-detected hotspots
      const combinedHotspots = detectedHotspots.map(h => ({
        ...h,
        user_density: userDensity,
        combined_score: calculateHotspotScore(h.case_count || 0, userDensity, h.severity),
      }));

      // Save new hotspots to database
      for (const hotspot of combinedHotspots) {
        if (hotspot.combined_score >= 50) {
          await supabase
            .from('disease_hotspots')
            .upsert({
              center_lat: hotspot.lat,
              center_lng: hotspot.lng,
              radius_km: 5,
              disease_code: hotspot.disease_code,
              disease_name: hotspot.disease_name,
              severity: hotspot.severity,
              case_count: hotspot.case_count,
              user_density: userDensity,
              ai_source: aiSources,
              detected_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h expiry
            }, { onConflict: 'id', ignoreDuplicates: true });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        hotspots: combinedHotspots,
        userDensity,
        existingHotspots: existingHotspots?.length || 0,
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'get_hotspots') {
      // Get all active hotspots
      const { data: hotspots, error } = await supabase
        .from('disease_hotspots')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .order('severity', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        hotspots: hotspots || [],
        count: hotspots?.length || 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'get_user_risks') {
      // Get risks for a specific user based on their location
      if (!lat || !lng) {
        return new Response(JSON.stringify({ error: 'lat and lng required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Find hotspots near user
      const { data: nearbyHotspots } = await supabase
        .from('disease_hotspots')
        .select('*')
        .gte('expires_at', new Date().toISOString());

      // Filter by distance
      const userRisks = (nearbyHotspots || [])
        .map(h => {
          const distance = haversineDistance(lat, lng, h.center_lat, h.center_lng);
          return {
            ...h,
            distanceKm: distance,
            inRange: distance <= (h.radius_km || 5) * 2,
          };
        })
        .filter(h => h.inRange)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      return new Response(JSON.stringify({
        success: true,
        risks: userRisks,
        count: userRisks.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[HOTSPOT-DETECTOR] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Calculate combined hotspot score
function calculateHotspotScore(caseCount: number, userDensity: number, severity: string): number {
  const severityWeight: Record<string, number> = {
    'critical': 1.5,
    'high': 1.2,
    'medium': 1.0,
    'low': 0.7,
  };

  const weight = severityWeight[severity] || 1.0;
  const baseScore = Math.min(100, (caseCount * 5) + (userDensity * 2));
  
  return Math.round(baseScore * weight);
}

// Haversine distance
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
