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

// High-risk chronic conditions that increase vulnerability
const HIGH_RISK_CONDITIONS = [
  'diabetes', 'tiểu đường', 'tim mạch', 'cardiovascular', 'heart disease',
  'copd', 'hen suyễn', 'asthma', 'hypertension', 'tăng huyết áp',
  'cancer', 'ung thư', 'hiv', 'kidney', 'thận', 'liver', 'gan',
  'stroke', 'đột quỵ', 'tuberculosis', 'lao phổi',
];

function calcPersonalVulnerability(
  medicalConditions: string[] | null,
  allergies: string[] | null,
  ageGroup: string | null,
  nearbyDiseases: string[],
): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  // Chronic conditions: +10
  const conditions = (medicalConditions || []).map(c => c.toLowerCase());
  const hasChronicCondition = conditions.some(c =>
    HIGH_RISK_CONDITIONS.some(hrc => c.includes(hrc))
  );
  if (hasChronicCondition) {
    score += 10;
    factors.push('Có bệnh nền mạn tính');
  }

  // High-risk age group: +5
  if (ageGroup) {
    const age = ageGroup.toLowerCase();
    if (age.includes('>60') || age.includes('60+') || age.includes('elderly') ||
        age.includes('<5') || age.includes('0-4') || age.includes('infant')) {
      score += 5;
      factors.push(`Nhóm tuổi nguy cơ cao: ${ageGroup}`);
    }
  }

  // Allergy related to nearby disease: +5
  const allergyList = (allergies || []).map(a => a.toLowerCase());
  const hasRelatedAllergy = allergyList.some(a =>
    nearbyDiseases.some(d => a.includes(d.toLowerCase()) || d.toLowerCase().includes(a))
  );
  if (hasRelatedAllergy) {
    score += 5;
    factors.push('Dị ứng liên quan đến dịch bệnh gần đó');
  }

  return { score: Math.min(20, score), factors };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, userId, lat, lng, radiusKm = 50 } = await req.json();

    // ===== ACTION: score_user =====
    if (action === 'score_user') {
      if (!lat || !lng) {
        return new Response(JSON.stringify({ error: 'lat and lng required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Fetch user health profile from user_profiles + user_twin_data
      let healthProfile: any = null;
      if (userId) {
        const [profileRes, twinRes] = await Promise.all([
          supabase.from('user_profiles').select('medical_conditions, allergies, medications, gender, blood_type').eq('user_id', userId).maybeSingle(),
          supabase.from('user_twin_data').select('disease_risks, health_score, data_payload').eq('user_id', userId).eq('data_type', 'health_profile').maybeSingle(),
        ]);
        healthProfile = {
          medicalConditions: profileRes.data?.medical_conditions || [],
          allergies: profileRes.data?.allergies || [],
          medications: profileRes.data?.medications || [],
          gender: profileRes.data?.gender,
          bloodType: profileRes.data?.blood_type,
          diseaseRisks: twinRes.data?.disease_risks || {},
          healthScore: twinRes.data?.health_score,
        };
      }

      // 1. Get active hotspots near user
      const { data: hotspots } = await supabase
        .from('disease_hotspots')
        .select('*')
        .gte('expires_at', new Date().toISOString());

      const nearbyHotspots = (hotspots || [])
        .map(h => ({
          ...h,
          distanceKm: haversine(lat, lng, h.center_lat, h.center_lng),
        }))
        .filter(h => h.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      // 2. Get recent news severity
      const { data: recentNews } = await supabase
        .from('health_news')
        .select('severity, disease_type, location, classification')
        .gte('crawled_at', new Date(Date.now() - 7 * 86400000).toISOString())
        .order('crawled_at', { ascending: false })
        .limit(50);

      const newsSeverity = { critical: 0, high: 0, medium: 0, low: 0 };
      (recentNews || []).forEach((n: any) => {
        const sev = n.severity?.toLowerCase();
        if (sev && sev in newsSeverity) newsSeverity[sev as keyof typeof newsSeverity]++;
      });

      // 3. Get nearby case_events (last 14 days)
      const { data: nearbyCases } = await supabase
        .from('case_events')
        .select('disease_code, lat, lon, occurred_at')
        .not('lat', 'is', null)
        .not('lon', 'is', null)
        .gte('occurred_at', new Date(Date.now() - 14 * 86400000).toISOString())
        .limit(500);

      const casesInRange = (nearbyCases || []).filter((c: any) => {
        return haversine(lat, lng, c.lat, c.lon) <= 10;
      });

      // ===== RISK SCORING (4 factors) =====
      let riskScore = 0;
      const riskFactors: string[] = [];

      // Factor 1: Hotspot proximity (0-35)
      if (nearbyHotspots.length > 0) {
        const closest = nearbyHotspots[0];
        const proximityScore = Math.max(0, 35 - (closest.distanceKm * 3.5));
        const sevMult = closest.severity === 'critical' ? 1.5 : closest.severity === 'high' ? 1.2 : closest.severity === 'medium' ? 1.0 : 0.7;
        riskScore += Math.round(proximityScore * sevMult);
        riskFactors.push(`${nearbyHotspots.length} hotspot gần, gần nhất: ${closest.distanceKm.toFixed(1)}km (${closest.disease_name || closest.disease_code})`);
      }

      // Factor 2: News severity (0-25)
      const newsScore = Math.min(25, (newsSeverity.critical * 8) + (newsSeverity.high * 4) + (newsSeverity.medium * 2));
      riskScore += newsScore;
      if (newsScore > 0) {
        riskFactors.push(`Tin tức: ${newsSeverity.critical} critical, ${newsSeverity.high} high`);
      }

      // Factor 3: Case density (0-20)
      const caseDensityScore = Math.min(20, casesInRange.length * 2);
      riskScore += caseDensityScore;
      if (casesInRange.length > 0) {
        riskFactors.push(`${casesInRange.length} ca trong 10km (14 ngày)`);
      }

      // Factor 4: Personal vulnerability (0-20) - NEW
      const nearbyDiseases = nearbyHotspots.map(h => h.disease_name || h.disease_code || '');
      // Get age_group from user_map_presence
      let ageGroup: string | null = null;
      if (userId) {
        const { data: presData } = await supabase.from('user_map_presence').select('age_group').eq('user_id', userId).maybeSingle();
        ageGroup = presData?.age_group || null;
      }
      const vulnerability = calcPersonalVulnerability(
        healthProfile?.medicalConditions,
        healthProfile?.allergies,
        ageGroup,
        nearbyDiseases,
      );
      riskScore += vulnerability.score;
      riskFactors.push(...vulnerability.factors);

      riskScore = Math.min(100, Math.max(0, riskScore));
      const riskLevel = riskScore >= 60 ? 'high' : riskScore >= 35 ? 'medium' : 'low';

      // Update user_map_presence
      if (userId) {
        await supabase.from('user_map_presence').update({ risk_level: riskLevel }).eq('user_id', userId);
      }

      // ===== AUTO-CREATE ALERT if high risk =====
      let alertCreated = false;
      if (riskScore >= 60 && nearbyHotspots.length > 0 && userId) {
        const today = new Date().toISOString().split('T')[0];
        const closestHotspot = nearbyHotspots[0];
        const diseaseCode = closestHotspot.disease_code || 'unknown';

        // Check if similar alert already exists today
        const { data: existingAlert } = await supabase
          .from('alerts')
          .select('id')
          .eq('disease_code', diseaseCode)
          .eq('day', today)
          .eq('rule', `proximity_${riskLevel}_alert`)
          .eq('status', 'open')
          .limit(1);

        if (!existingAlert || existingAlert.length === 0) {
          const { error: alertErr } = await supabase.from('alerts').insert({
            disease_code: diseaseCode,
            day: today,
            cases: closestHotspot.case_count || 1,
            rule: `proximity_${riskLevel}_alert`,
            status: 'open',
          });

          if (!alertErr) {
            alertCreated = true;
            console.log(`[RISK-SCORER] Auto-alert created: ${diseaseCode} (${riskLevel}) for user ${userId}`);
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        riskScore,
        riskLevel,
        riskFactors,
        healthProfile: healthProfile ? {
          medicalConditions: healthProfile.medicalConditions,
          allergies: healthProfile.allergies,
          healthScore: healthProfile.healthScore,
        } : null,
        vulnerabilityScore: vulnerability.score,
        alertCreated,
        nearbyHotspots: nearbyHotspots.slice(0, 5).map(h => ({
          disease: h.disease_name || h.disease_code,
          severity: h.severity,
          distanceKm: h.distanceKm.toFixed(1),
          caseCount: h.case_count,
        })),
        newsSummary: newsSeverity,
        caseDensity: casesInRange.length,
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ===== ACTION: score_all_users =====
    if (action === 'score_all_users') {
      const { data: activeUsers } = await supabase
        .from('user_map_presence')
        .select('user_id, lat, lng')
        .eq('is_sharing', true)
        .gte('last_active_at', new Date(Date.now() - 86400000).toISOString());

      let scored = 0;
      for (const u of (activeUsers || [])) {
        try {
          const { data: hotspots } = await supabase
            .from('disease_hotspots')
            .select('severity, center_lat, center_lng')
            .gte('expires_at', new Date().toISOString());

          let score = 0;
          (hotspots || []).forEach((h: any) => {
            const d = haversine(u.lat, u.lng, h.center_lat, h.center_lng);
            if (d <= 10) score += h.severity === 'critical' ? 30 : h.severity === 'high' ? 20 : 10;
          });

          const level = score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';
          await supabase.from('user_map_presence').update({ risk_level: level }).eq('user_id', u.user_id);
          scored++;
        } catch (e) {
          console.error(`[RISK-SCORER] Error scoring ${u.user_id}:`, e);
        }
      }

      return new Response(JSON.stringify({ success: true, scored }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ===== ACTION: get_map_users =====
    if (action === 'get_map_users') {
      const { data: users, error } = await supabase
        .from('user_map_presence')
        .select('user_id, lat, lng, age_group, risk_level, last_active_at')
        .eq('is_sharing', true)
        .gte('last_active_at', new Date(Date.now() - 86400000).toISOString());

      if (error) throw error;

      // Enrich with health data from user_profiles (anonymized)
      const userIds = (users || []).map(u => u.user_id);
      let healthMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, medical_conditions, gender')
          .in('user_id', userIds);

        (profiles || []).forEach((p: any) => {
          healthMap[p.user_id] = {
            hasChronic: (p.medical_conditions || []).some((c: string) =>
              HIGH_RISK_CONDITIONS.some(hrc => c.toLowerCase().includes(hrc))
            ),
            conditionCount: (p.medical_conditions || []).length,
            gender: p.gender,
          };
        });
      }

      const enrichedUsers = (users || []).map(u => ({
        ...u,
        has_chronic: healthMap[u.user_id]?.hasChronic || false,
        condition_count: healthMap[u.user_id]?.conditionCount || 0,
        health_gender: healthMap[u.user_id]?.gender || null,
      }));

      return new Response(JSON.stringify({
        success: true,
        users: enrichedUsers,
        count: enrichedUsers.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[RISK-SCORER] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
