import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, alertId, userId, lat, lng } = await req.json();

    // ===== ACTION: vote =====
    if (action === 'vote') {
      if (!alertId || !userId) {
        return new Response(JSON.stringify({ error: 'alertId and userId required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get alert location
      const { data: alert } = await supabase
        .from('community_alerts')
        .select('lat, lng, status, promoted_to_hotspot, category, description, severity, icon')
        .eq('id', alertId)
        .single();

      if (!alert) {
        return new Response(JSON.stringify({ error: 'Alert not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Calculate distance from voter to alert
      const distanceKm = (lat && lng) ? haversine(lat, lng, alert.lat, alert.lng) : null;

      // Insert vote
      const { error: voteError } = await supabase
        .from('community_alert_votes')
        .insert({
          alert_id: alertId,
          user_id: userId,
          vote_type: 'confirm',
          lat, lng,
          distance_km: distanceKm,
        });

      if (voteError) {
        if (voteError.code === '23505') {
          return new Response(JSON.stringify({ error: 'Already voted', alreadyVoted: true }), {
            status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        throw voteError;
      }

      // Count total confirms
      const { count } = await supabase
        .from('community_alert_votes')
        .select('*', { count: 'exact', head: true })
        .eq('alert_id', alertId)
        .eq('vote_type', 'confirm');

      const confirmCount = count || 0;

      // Update confirm_count on alert
      await supabase
        .from('community_alerts')
        .update({ confirm_count: confirmCount })
        .eq('id', alertId);

      // If >= 3 confirms AND not yet promoted → create hotspot
      let promoted = false;
      if (confirmCount >= 3 && !alert.promoted_to_hotspot) {
        // Map category to disease code
        const categoryToDisease: Record<string, string> = {
          dengue: 'dengue', covid: 'covid19', food_poisoning: 'food_poisoning',
          hand_foot_mouth: 'tcm', measles: 'measles',
        };
        const diseaseCode = categoryToDisease[alert.category] || alert.category;

        const { error: hotspotErr } = await supabase
          .from('disease_hotspots')
          .insert({
            center_lat: alert.lat,
            center_lng: alert.lng,
            disease_code: diseaseCode,
            disease_name: `${alert.icon} ${alert.category} (cộng đồng)`,
            severity: alert.severity === 'critical' ? 'high' : alert.severity || 'medium',
            case_count: confirmCount,
            radius_km: 2,
            expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
            ai_source: [{
              title: `Cảnh báo cộng đồng: ${alert.description?.substring(0, 100)}`,
              source: 'community_report',
              type: 'crowd_validated',
              confirmCount,
            }],
          });

        if (!hotspotErr) {
          await supabase
            .from('community_alerts')
            .update({ promoted_to_hotspot: true, status: 'verified' })
            .eq('id', alertId);
          promoted = true;
          console.log(`[VOTE-ALERT] Promoted alert ${alertId} to hotspot with ${confirmCount} confirms`);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        confirmCount,
        promoted,
        distanceKm: distanceKm?.toFixed(1),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ===== ACTION: get_pending_alerts =====
    if (action === 'get_pending_alerts') {
      const { data: alerts } = await supabase
        .from('community_alerts')
        .select('id, lat, lng, description, category, severity, icon, photo_url, address, confirm_count, deny_count, promoted_to_hotspot, created_at, user_id')
        .eq('promoted_to_hotspot', false)
        .order('created_at', { ascending: false })
        .limit(50);

      // Get vote counts per alert
      const alertIds = (alerts || []).map(a => a.id);
      let userVotes: string[] = [];
      if (userId && alertIds.length > 0) {
        const { data: votes } = await supabase
          .from('community_alert_votes')
          .select('alert_id')
          .eq('user_id', userId)
          .in('alert_id', alertIds);
        userVotes = (votes || []).map(v => v.alert_id);
      }

      return new Response(JSON.stringify({
        success: true,
        alerts: (alerts || []).map(a => ({
          ...a,
          userHasVoted: userVotes.includes(a.id),
        })),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[VOTE-ALERT] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
