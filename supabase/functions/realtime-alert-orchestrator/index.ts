import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Risk thresholds for alert generation
const RISK_THRESHOLDS = {
  critical: 80,
  high: 60,
  medium: 40,
  low: 20
};

// Auto-close threshold - if risk drops below this, close the alert
const AUTO_CLOSE_THRESHOLD = 30;

// Disease risk baseline adjustments
const DISEASE_BASELINES: Record<string, number> = {
  'dengue': 15,
  'covid-19': 10,
  'influenza': 8,
  'hfmd': 12,
  'ari': 5,
  'cholera': 20,
  'typhoid': 18,
  'measles': 25,
  'D01': 15,
  'D02': 10,
  'D03': 8,
  'D04': 12,
  'D05': 5,
  'D06': 20
};

// Map disease names to DB codes
const DISEASE_CODE_MAP: Record<string, string> = {
  'dengue': 'D01',
  'covid-19': 'D02',
  'influenza': 'D03',
  'hfmd': 'D04',
  'ari': 'D05',
  'cholera': 'D06',
  'typhoid': 'D01',
  'measles': 'D02'
};

function mapDiseaseCode(disease: string): string {
  const lower = disease.toLowerCase();
  return DISEASE_CODE_MAP[lower] || 'D01'; // Default to D01 if unknown
}

interface AlertCandidate {
  id: string;
  disease_code: string;
  region: string;
  district_id?: string;
  ward_id?: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  cases: number;
  avg7: number;
  source: string;
  created_at: string;
  auto_generated: boolean;
}

interface AlertAction {
  action: 'create' | 'update' | 'close';
  alert_id?: string;
  candidate: AlertCandidate;
  reason: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🚨 Realtime Alert Orchestrator triggered...');

    const body = await req.json().catch(() => ({}));
    const { 
      trigger_source = 'manual',
      risk_data,
      delta_data,
      region_filter
    } = body;

    console.log(`📡 Trigger source: ${trigger_source}`);

    // Step 1: Gather current risk state from multiple sources
    const currentRiskState = await gatherRiskState(supabase, risk_data, delta_data);
    console.log(`📊 Gathered ${currentRiskState.length} risk data points`);

    // Step 2: Get existing open alerts
    const { data: existingAlerts, error: alertsError } = await supabase
      .from('alerts')
      .select('*')
      .eq('status', 'open');

    if (alertsError) {
      console.error('Error fetching existing alerts:', alertsError);
      throw alertsError;
    }

    console.log(`📋 Found ${existingAlerts?.length || 0} existing open alerts`);

    // Step 3: Generate alert candidates from risk state
    const alertCandidates = generateAlertCandidates(currentRiskState, region_filter);
    console.log(`🎯 Generated ${alertCandidates.length} alert candidates`);

    // Step 4: Determine alert actions (create, update, close)
    const alertActions = determineAlertActions(alertCandidates, existingAlerts || []);
    console.log(`⚡ Determined ${alertActions.length} alert actions`);

    // Step 5: Execute alert actions
    const executedActions = await executeAlertActions(supabase, alertActions);
    console.log(`✅ Executed ${executedActions.length} alert actions`);

    // Step 6: Update alert summary counts
    const alertSummary = await computeAlertSummary(supabase);

    // Step 7: Broadcast updates via Realtime
    const broadcastPayload = {
      type: 'alert_orchestration',
      timestamp: new Date().toISOString(),
      trigger_source,
      actions_taken: executedActions.length,
      summary: alertSummary,
      actions: executedActions.map(a => ({
        action: a.action,
        disease: a.candidate.disease_code,
        region: a.candidate.region,
        risk_level: a.candidate.risk_level,
        reason: a.reason
      }))
    };

    // Broadcast to alert-orchestration channel
    const channel = supabase.channel('alert-orchestration');
    await channel.send({
      type: 'broadcast',
      event: 'alert_update',
      payload: broadcastPayload
    });

    console.log('📢 Broadcast sent to alert-orchestration channel');

    return new Response(JSON.stringify({
      success: true,
      trigger_source,
      timestamp: new Date().toISOString(),
      candidates_evaluated: alertCandidates.length,
      actions_taken: executedActions.length,
      summary: alertSummary,
      actions: executedActions.map(a => ({
        action: a.action,
        alert_id: a.alert_id,
        disease: a.candidate.disease_code,
        region: a.candidate.region,
        risk_level: a.candidate.risk_level,
        reason: a.reason
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Alert Orchestrator error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function gatherRiskState(
  supabase: any, 
  externalRiskData?: any, 
  deltaData?: any
): Promise<any[]> {
  const riskState: any[] = [];

  // Source 1: External risk data passed directly
  if (externalRiskData?.risks) {
    externalRiskData.risks.forEach((risk: any) => {
      riskState.push({
        source: 'risk_classifier',
        disease_code: risk.disease?.toLowerCase() || 'unknown',
        region: externalRiskData.region || 'Vietnam',
        district_id: risk.district_id,
        risk_score: risk.riskScore || risk.risk_score || 0,
        cases: risk.cases || 0,
        avg7: risk.avg7 || 0,
        timestamp: new Date().toISOString()
      });
    });
  }

  // Source 2: Delta data with case counts
  if (deltaData?.deltas) {
    deltaData.deltas.forEach((delta: any) => {
      const existingIdx = riskState.findIndex(
        r => r.disease_code === delta.disease_code && r.district_id === delta.district_id
      );
      
      if (existingIdx >= 0) {
        riskState[existingIdx].cases += delta.cases || 0;
      } else {
        riskState.push({
          source: 'delta_agent',
          disease_code: delta.disease_code?.toLowerCase() || 'unknown',
          region: delta.location || 'Vietnam',
          district_id: delta.district_id,
          risk_score: calculateRiskFromCases(delta.cases, delta.disease_code),
          cases: delta.cases || 0,
          avg7: delta.avg7 || 0,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  // Source 3: Fetch recent daily_counts from database
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data: recentCounts, error } = await supabase
    .from('daily_counts')
    .select('*')
    .gte('day', sevenDaysAgo.toISOString().split('T')[0])
    .order('day', { ascending: false });

  if (!error && recentCounts) {
    // Aggregate by disease and district
    const aggregated: Record<string, any> = {};
    
    recentCounts.forEach((row: any) => {
      const key = `${row.disease_code}-${row.district_id}`;
      if (!aggregated[key]) {
        aggregated[key] = {
          disease_code: row.disease_code,
          district_id: row.district_id,
          total_cases: 0,
          days: 0
        };
      }
      aggregated[key].total_cases += row.cases || 0;
      aggregated[key].days += 1;
    });

    Object.values(aggregated).forEach((agg: any) => {
      const avg7 = agg.days > 0 ? agg.total_cases / agg.days : 0;
      const existingIdx = riskState.findIndex(
        r => r.disease_code === agg.disease_code && r.district_id === agg.district_id
      );
      
      if (existingIdx < 0) {
        riskState.push({
          source: 'daily_counts',
          disease_code: agg.disease_code,
          region: 'Vietnam',
          district_id: agg.district_id,
          risk_score: calculateRiskFromCases(agg.total_cases, agg.disease_code),
          cases: agg.total_cases,
          avg7: avg7,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  return riskState;
}

function calculateRiskFromCases(cases: number, diseaseCode: string): number {
  const baseline = DISEASE_BASELINES[diseaseCode?.toLowerCase()] || 10;
  
  // Risk scoring formula
  if (cases === 0) return 0;
  if (cases < baseline * 0.5) return 15;
  if (cases < baseline) return 35;
  if (cases < baseline * 2) return 55;
  if (cases < baseline * 5) return 75;
  return 90;
}

function generateAlertCandidates(riskState: any[], regionFilter?: string): AlertCandidate[] {
  const candidates: AlertCandidate[] = [];
  
  riskState.forEach((risk, idx) => {
    // Apply region filter if provided
    if (regionFilter && !risk.region?.toLowerCase().includes(regionFilter.toLowerCase())) {
      return;
    }

    // Only generate candidates for risks above low threshold
    if (risk.risk_score < RISK_THRESHOLDS.low) {
      return;
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (risk.risk_score >= RISK_THRESHOLDS.critical) riskLevel = 'critical';
    else if (risk.risk_score >= RISK_THRESHOLDS.high) riskLevel = 'high';
    else if (risk.risk_score >= RISK_THRESHOLDS.medium) riskLevel = 'medium';

    // Map disease code to valid DB code
    const mappedDiseaseCode = mapDiseaseCode(risk.disease_code);

    candidates.push({
      id: `candidate-${idx}-${Date.now()}`,
      disease_code: mappedDiseaseCode,
      region: risk.region,
      district_id: risk.district_id,
      ward_id: risk.ward_id,
      risk_level: riskLevel,
      risk_score: risk.risk_score,
      cases: risk.cases,
      avg7: risk.avg7,
      source: risk.source,
      created_at: new Date().toISOString(),
      auto_generated: true
    });
  });

  return candidates;
}

function determineAlertActions(
  candidates: AlertCandidate[], 
  existingAlerts: any[]
): AlertAction[] {
  const actions: AlertAction[] = [];
  const processedAlertIds = new Set<string>();

  // Check each candidate against existing alerts
  candidates.forEach(candidate => {
    const matchingAlert = existingAlerts.find(alert => 
      alert.disease_code === candidate.disease_code &&
      (alert.district_id === candidate.district_id || 
       (!alert.district_id && !candidate.district_id))
    );

    if (matchingAlert) {
      processedAlertIds.add(matchingAlert.id);
      
      // Update existing alert if risk level changed significantly
      const currentRiskLevel = getRiskLevelFromAlert(matchingAlert);
      if (candidate.risk_level !== currentRiskLevel || 
          Math.abs(candidate.cases - matchingAlert.cases) > 5) {
        actions.push({
          action: 'update',
          alert_id: matchingAlert.id,
          candidate,
          reason: `Risk level changed: ${currentRiskLevel} → ${candidate.risk_level}`
        });
      }
    } else {
      // Create new alert if risk is medium or higher
      if (candidate.risk_score >= RISK_THRESHOLDS.medium) {
        actions.push({
          action: 'create',
          candidate,
          reason: `New ${candidate.risk_level} risk detected: ${candidate.disease_code} in ${candidate.region}`
        });
      }
    }
  });

  // Auto-close alerts that are no longer in the risk state
  existingAlerts.forEach(alert => {
    if (!processedAlertIds.has(alert.id)) {
      // Check if there's still a candidate for this alert
      const stillActive = candidates.some(c => 
        c.disease_code === alert.disease_code &&
        (c.district_id === alert.district_id || (!c.district_id && !alert.district_id))
      );

      if (!stillActive) {
        actions.push({
          action: 'close',
          alert_id: alert.id,
          candidate: {
            id: alert.id,
            disease_code: alert.disease_code,
            region: alert.district_id || 'Unknown',
            risk_level: 'low',
            risk_score: 0,
            cases: alert.cases,
            avg7: alert.avg7 || 0,
            source: 'auto_close',
            created_at: alert.created_at,
            auto_generated: true
          },
          reason: 'Risk level dropped below threshold - auto-closing'
        });
      }
    }
  });

  return actions;
}

function getRiskLevelFromAlert(alert: any): 'low' | 'medium' | 'high' | 'critical' {
  // Infer risk level from rule field or cases
  if (alert.rule?.includes('critical')) return 'critical';
  if (alert.rule?.includes('high') || alert.cases > 50) return 'high';
  if (alert.rule?.includes('medium') || alert.cases > 20) return 'medium';
  return 'low';
}

async function executeAlertActions(
  supabase: any, 
  actions: AlertAction[]
): Promise<AlertAction[]> {
  const executed: AlertAction[] = [];
  const today = new Date().toISOString().split('T')[0];

  console.log(`🔄 Executing ${actions.length} actions...`);

  for (const action of actions) {
    try {
      console.log(`  → Processing action: ${action.action} for ${action.candidate.disease_code}`);
      
      if (action.action === 'create') {
        const insertData = {
          disease_code: action.candidate.disease_code,
          district_id: action.candidate.district_id || null,
          ward_id: action.candidate.ward_id || null,
          cases: action.candidate.cases,
          avg7: action.candidate.avg7,
          day: today,
          status: 'open',
          rule: `auto_${action.candidate.risk_level}_risk`
        };
        
        console.log(`  → Inserting alert:`, JSON.stringify(insertData));
        
        const { data, error } = await supabase
          .from('alerts')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error(`  ❌ Error creating alert:`, error.message, error.details);
        } else if (data) {
          action.alert_id = data.id;
          executed.push(action);
          console.log(`  ✅ Created alert: ${data.id} for ${action.candidate.disease_code}`);
        }
      } else if (action.action === 'update' && action.alert_id) {
        const { error } = await supabase
          .from('alerts')
          .update({
            cases: action.candidate.cases,
            avg7: action.candidate.avg7,
            rule: `auto_${action.candidate.risk_level}_risk`
          })
          .eq('id', action.alert_id);

        if (!error) {
          executed.push(action);
          console.log(`✅ Updated alert: ${action.alert_id}`);
        }
      } else if (action.action === 'close' && action.alert_id) {
        const { error } = await supabase
          .from('alerts')
          .update({
            status: 'closed',
            closed_at: new Date().toISOString()
          })
          .eq('id', action.alert_id);

        if (!error) {
          executed.push(action);
          console.log(`✅ Closed alert: ${action.alert_id}`);
        }
      }
    } catch (err) {
      console.error(`Error executing action ${action.action}:`, err);
    }
  }

  return executed;
}

async function computeAlertSummary(supabase: any): Promise<any> {
  // Get all open alerts
  const { data: openAlerts, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('status', 'open');

  if (error) {
    console.error('Error computing alert summary:', error);
    return { total: 0, by_level: {}, by_disease: {} };
  }

  const alerts = openAlerts || [];
  
  // Categorize by risk level
  const byLevel = {
    critical: alerts.filter((a: any) => a.rule?.includes('critical')).length,
    high: alerts.filter((a: any) => a.rule?.includes('high')).length,
    medium: alerts.filter((a: any) => a.rule?.includes('medium')).length,
    low: alerts.filter((a: any) => !a.rule?.includes('critical') && !a.rule?.includes('high') && !a.rule?.includes('medium')).length
  };

  // Categorize by disease
  const byDisease: Record<string, number> = {};
  alerts.forEach((a: any) => {
    const disease = a.disease_code || 'unknown';
    byDisease[disease] = (byDisease[disease] || 0) + 1;
  });

  return {
    total: alerts.length,
    by_level: byLevel,
    by_disease: byDisease,
    last_updated: new Date().toISOString()
  };
}
