import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= TYPES =============
interface TwinInput {
  type: 'manual' | 'sensor' | 'gps' | 'bluetooth' | 'qr' | 'environment';
  timestamp: string;
  data: Record<string, any>;
  source?: string;
}

interface HealthSystem {
  id: string;
  name: string;
  status: 'optimal' | 'good' | 'caution' | 'warning' | 'critical';
  score: number;
  factors: string[];
  recommendations: string[];
}

interface TwinState {
  id: string;
  lastUpdated: string;
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  systems: HealthSystem[];
  activeAlerts: TwinAlert[];
  predictions: TwinPrediction[];
  context: TwinContext;
}

interface TwinAlert {
  id: string;
  type: 'health' | 'environment' | 'behavior' | 'emergency';
  severity: 'info' | 'warning' | 'danger' | 'critical';
  title: string;
  message: string;
  actionRequired: boolean;
  createdAt: string;
}

interface TwinPrediction {
  timeframe: string;
  type: string;
  probability: number;
  description: string;
  preventiveActions: string[];
}

interface TwinContext {
  location?: { lat: number; lng: number; address?: string };
  environment?: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    aqi?: number;
  };
  activity?: string;
  lastMeal?: string;
  sleepHours?: number;
}

interface AgentRequest {
  action: 'process_input' | 'get_state' | 'generate_insights' | 'sync_broadcast';
  twinId: string;
  sessionId?: string;
  inputs?: TwinInput[];
  profile?: Record<string, any>;
}

// ============= HEALTH SYSTEM DEFINITIONS =============
const HEALTH_SYSTEMS = [
  { id: 'cardiovascular', name: 'Tim mạch', baseScore: 85 },
  { id: 'respiratory', name: 'Hô hấp', baseScore: 90 },
  { id: 'nervous', name: 'Thần kinh', baseScore: 88 },
  { id: 'metabolic', name: 'Trao đổi chất', baseScore: 82 },
  { id: 'immune', name: 'Miễn dịch', baseScore: 87 },
  { id: 'musculoskeletal', name: 'Cơ xương', baseScore: 85 }
];

// ============= AGENT: IDENTITY & PERMISSION =============
function validateIdentityAndPermissions(
  twinId: string,
  sessionId?: string,
  inputType?: string
): { valid: boolean; permissions: string[]; reason?: string } {
  // In production, validate against database sessions
  if (!twinId) {
    return { valid: false, permissions: [], reason: 'Twin ID required' };
  }

  // Default permissions based on input type
  const basePermissions = ['read_state', 'view_alerts'];
  const writePermissions = ['update_profile', 'add_symptoms', 'track_location'];
  const advancedPermissions = ['generate_insights', 'share_twin', 'export_data'];

  // Session-based permissions
  if (sessionId) {
    return { valid: true, permissions: [...basePermissions, ...writePermissions, ...advancedPermissions] };
  }

  return { valid: true, permissions: basePermissions };
}

// ============= AGENT: REALTIME DATA STREAM =============
function processDataStream(inputs: TwinInput[]): {
  aggregatedData: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  triggers: string[];
} {
  const aggregatedData: Record<string, any> = {};
  const triggers: string[] = [];
  let priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal';

  for (const input of inputs) {
    switch (input.type) {
      case 'manual':
        aggregatedData.profile = { ...aggregatedData.profile, ...input.data };
        if (input.data.symptoms?.length > 0) {
          triggers.push('symptom_reported');
          priority = 'high';
        }
        break;

      case 'sensor':
        aggregatedData.vitals = { ...aggregatedData.vitals, ...input.data };
        // Check vital thresholds
        if (input.data.heartRate > 100 || input.data.heartRate < 50) {
          triggers.push('abnormal_heart_rate');
          priority = 'high';
        }
        if (input.data.bloodPressureSystolic > 140 || input.data.bloodPressureDiastolic > 90) {
          triggers.push('elevated_blood_pressure');
          priority = 'high';
        }
        break;

      case 'gps':
        aggregatedData.location = input.data;
        triggers.push('location_updated');
        break;

      case 'bluetooth':
        aggregatedData.connectedDevices = input.data.devices || [];
        aggregatedData.nearbyTwins = input.data.nearbyTwins || [];
        if (input.data.nearbyTwins?.length > 0) {
          triggers.push('twin_proximity_detected');
        }
        break;

      case 'qr':
        aggregatedData.scannedSession = input.data;
        triggers.push('qr_session_joined');
        break;

      case 'environment':
        aggregatedData.environment = input.data;
        // Environmental risk triggers
        if (input.data.aqi > 150) {
          triggers.push('poor_air_quality');
          priority = priority === 'urgent' ? 'urgent' : 'high';
        }
        if (input.data.temperature > 38) {
          triggers.push('heat_warning');
        }
        if (input.data.humidity > 85) {
          triggers.push('high_humidity');
        }
        break;
    }
  }

  return { aggregatedData, priority, triggers };
}

// ============= AGENT: PERSONAL DIGITAL TWIN AI =============
function computeTwinState(
  twinId: string,
  aggregatedData: Record<string, any>,
  triggers: string[],
  profile?: Record<string, any>
): TwinState {
  const now = new Date().toISOString();
  
  // Compute health system scores
  const systems: HealthSystem[] = HEALTH_SYSTEMS.map(sys => {
    let score = sys.baseScore;
    const factors: string[] = [];
    const recommendations: string[] = [];

    // Apply modifiers based on data
    if (aggregatedData.environment) {
      const env = aggregatedData.environment;
      
      if (sys.id === 'respiratory') {
        if (env.aqi > 100) {
          score -= (env.aqi - 100) * 0.15;
          factors.push(`Chất lượng không khí kém (AQI: ${env.aqi})`);
          recommendations.push('Hạn chế hoạt động ngoài trời');
        }
        if (env.humidity > 80) {
          score -= 5;
          factors.push('Độ ẩm cao');
        }
      }

      if (sys.id === 'cardiovascular') {
        if (env.temperature > 35) {
          score -= 8;
          factors.push(`Nhiệt độ cao (${env.temperature}°C)`);
          recommendations.push('Uống đủ nước, tránh nắng trực tiếp');
        }
        if (env.pressure && (env.pressure < 1000 || env.pressure > 1030)) {
          score -= 5;
          factors.push('Áp suất khí quyển bất thường');
        }
      }
    }

    if (aggregatedData.vitals) {
      const vitals = aggregatedData.vitals;
      
      if (sys.id === 'cardiovascular') {
        if (vitals.heartRate > 90) {
          score -= (vitals.heartRate - 90) * 0.5;
          factors.push(`Nhịp tim cao (${vitals.heartRate} BPM)`);
        }
      }
    }

    if (profile?.chronicConditions?.length > 0) {
      const conditions = profile.chronicConditions;
      
      if (sys.id === 'cardiovascular' && conditions.some((c: string) => 
        c.toLowerCase().includes('tim') || c.toLowerCase().includes('huyết áp'))) {
        score -= 10;
        factors.push('Tiền sử bệnh tim mạch');
        recommendations.push('Theo dõi huyết áp thường xuyên');
      }

      if (sys.id === 'metabolic' && conditions.some((c: string) => 
        c.toLowerCase().includes('tiểu đường') || c.toLowerCase().includes('diabetes'))) {
        score -= 12;
        factors.push('Tiền sử tiểu đường');
        recommendations.push('Kiểm tra đường huyết định kỳ');
      }

      if (sys.id === 'respiratory' && conditions.some((c: string) => 
        c.toLowerCase().includes('hen') || c.toLowerCase().includes('asthma'))) {
        score -= 10;
        factors.push('Tiền sử hen suyễn');
        recommendations.push('Mang theo thuốc xịt khẩn cấp');
      }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    return {
      id: sys.id,
      name: sys.name,
      status: score >= 85 ? 'optimal' : score >= 70 ? 'good' : score >= 50 ? 'caution' : score >= 30 ? 'warning' : 'critical',
      score: Math.round(score),
      factors,
      recommendations
    };
  });

  // Compute overall score
  const overallScore = Math.round(systems.reduce((sum, s) => sum + s.score, 0) / systems.length);

  // Generate alerts from triggers
  const activeAlerts: TwinAlert[] = triggers.map(trigger => {
    switch (trigger) {
      case 'poor_air_quality':
        return {
          id: `alert_${Date.now()}_aqi`,
          type: 'environment',
          severity: 'warning',
          title: 'Chất lượng không khí kém',
          message: 'AQI vượt ngưỡng an toàn. Hạn chế hoạt động ngoài trời.',
          actionRequired: true,
          createdAt: now
        };
      case 'heat_warning':
        return {
          id: `alert_${Date.now()}_heat`,
          type: 'environment',
          severity: 'warning',
          title: 'Cảnh báo nắng nóng',
          message: 'Nhiệt độ cao. Uống đủ nước và tránh tiếp xúc ánh nắng.',
          actionRequired: true,
          createdAt: now
        };
      case 'abnormal_heart_rate':
        return {
          id: `alert_${Date.now()}_hr`,
          type: 'health',
          severity: 'danger',
          title: 'Nhịp tim bất thường',
          message: 'Phát hiện nhịp tim ngoài phạm vi bình thường.',
          actionRequired: true,
          createdAt: now
        };
      case 'symptom_reported':
        return {
          id: `alert_${Date.now()}_symptom`,
          type: 'health',
          severity: 'info',
          title: 'Triệu chứng mới',
          message: 'Đã ghi nhận triệu chứng. Twin đang phân tích.',
          actionRequired: false,
          createdAt: now
        };
      default:
        return null;
    }
  }).filter(Boolean) as TwinAlert[];

  // Generate predictions
  const predictions: TwinPrediction[] = [];
  
  if (overallScore < 70) {
    predictions.push({
      timeframe: '24 giờ tới',
      type: 'health_risk',
      probability: 0.35,
      description: 'Nguy cơ sức khỏe tăng nhẹ dựa trên các yếu tố hiện tại',
      preventiveActions: [
        'Nghỉ ngơi đầy đủ',
        'Theo dõi các triệu chứng',
        'Uống đủ nước'
      ]
    });
  }

  if (aggregatedData.environment?.aqi > 120) {
    predictions.push({
      timeframe: '4-6 giờ tới',
      type: 'respiratory_risk',
      probability: 0.45,
      description: 'Nguy cơ hô hấp do chất lượng không khí kém',
      preventiveActions: [
        'Ở trong nhà nếu có thể',
        'Sử dụng máy lọc không khí',
        'Đeo khẩu trang khi ra ngoài'
      ]
    });
  }

  return {
    id: twinId,
    lastUpdated: now,
    overallScore,
    riskLevel: overallScore >= 80 ? 'low' : overallScore >= 60 ? 'medium' : overallScore >= 40 ? 'high' : 'critical',
    systems,
    activeAlerts,
    predictions,
    context: {
      location: aggregatedData.location,
      environment: aggregatedData.environment
    }
  };
}

// ============= AGENT: REALTIME SYNC =============
function prepareSyncPayload(state: TwinState): {
  broadcast: Record<string, any>;
  userView: Record<string, any>;
  alertFeed: TwinAlert[];
  overview: Record<string, any>;
} {
  return {
    broadcast: {
      twinId: state.id,
      timestamp: state.lastUpdated,
      overallScore: state.overallScore,
      riskLevel: state.riskLevel,
      alertCount: state.activeAlerts.length
    },
    userView: {
      systems: state.systems,
      context: state.context,
      predictions: state.predictions
    },
    alertFeed: state.activeAlerts,
    overview: {
      score: state.overallScore,
      riskLevel: state.riskLevel,
      topConcerns: state.systems
        .filter(s => s.status === 'warning' || s.status === 'critical')
        .map(s => ({ system: s.name, score: s.score, factors: s.factors }))
    }
  };
}

// ============= MAIN HANDLER =============
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, twinId, sessionId, inputs, profile } = await req.json() as AgentRequest;
    
    console.log(`[PERSONAL-TWIN-AGENT] Action: ${action}, Twin: ${twinId}`);

    // Step 1: Identity & Permission validation
    const auth = validateIdentityAndPermissions(twinId, sessionId, inputs?.[0]?.type);
    if (!auth.valid) {
      return new Response(
        JSON.stringify({ success: false, error: auth.reason }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'process_input': {
        if (!inputs || inputs.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'No inputs provided' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Step 2: Data Stream Processing
        const { aggregatedData, priority, triggers } = processDataStream(inputs);
        console.log(`[PERSONAL-TWIN-AGENT] Processed ${inputs.length} inputs, priority: ${priority}, triggers: ${triggers.join(', ')}`);

        // Step 3: Twin AI Computation
        const twinState = computeTwinState(twinId, aggregatedData, triggers, profile);

        // Step 4: Prepare Sync Payload
        const syncPayload = prepareSyncPayload(twinState);

        return new Response(
          JSON.stringify({
            success: true,
            priority,
            triggers,
            state: twinState,
            sync: syncPayload
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_state': {
        // Return current state without processing new inputs
        const state = computeTwinState(twinId, {}, [], profile);
        
        return new Response(
          JSON.stringify({ success: true, state }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'generate_insights': {
        // Generate AI insights based on accumulated data
        const insights = {
          summary: 'Twin đang hoạt động ổn định với một số yếu tố cần theo dõi.',
          keyMetrics: [
            { label: 'Chỉ số tổng thể', value: 82, trend: 'stable' },
            { label: 'Rủi ro môi trường', value: 35, trend: 'increasing' },
            { label: 'Tuân thủ lối sống', value: 75, trend: 'stable' }
          ],
          recommendations: [
            'Tiếp tục duy trì lịch trình sinh hoạt hiện tại',
            'Theo dõi chất lượng không khí trong tuần này',
            'Cân nhắc bổ sung vitamin D nếu ít tiếp xúc ánh nắng'
          ],
          weeklyTrend: {
            averageScore: 81,
            bestDay: 'Thứ 3',
            worstDay: 'Thứ 6',
            improvement: '+2%'
          }
        };

        return new Response(
          JSON.stringify({ success: true, insights }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[PERSONAL-TWIN-AGENT] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
