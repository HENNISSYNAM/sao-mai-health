import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= TYPES =============
interface ProximityEvent {
  deviceId: string; // Anonymized device hash
  rssi: number; // Signal strength (-100 to 0 dBm)
  txPower?: number; // Transmitted power for distance calc
  timestamp: string;
  duration: number; // Seconds of sustained proximity
}

interface RiskZone {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'crowd' | 'outdoor' | 'transport' | 'unknown';
  riskLevel: number; // 0-100
  factors: string[];
}

interface ProximityContext {
  nearbyDevices: number;
  averageRssi: number;
  estimatedDistance: number; // meters
  crowdDensity: 'low' | 'medium' | 'high' | 'very_high';
  riskZone: RiskZone | null;
  exposureDuration: number; // total seconds
  shouldTriggerReeval: boolean;
}

interface AgentRequest {
  action: 'process_signals' | 'get_risk_zones' | 'evaluate_exposure';
  twinId: string;
  signals?: ProximityEvent[];
  location?: { lat: number; lng: number };
}

// ============= RISK ZONE DATABASE =============
const KNOWN_RISK_ZONES: RiskZone[] = [
  {
    id: 'hospital_zone',
    name: 'Khu vực bệnh viện',
    type: 'hospital',
    riskLevel: 75,
    factors: ['Tiếp xúc bệnh nhân', 'Mầm bệnh đa dạng', 'Không khí kín']
  },
  {
    id: 'clinic_zone',
    name: 'Phòng khám',
    type: 'clinic',
    riskLevel: 60,
    factors: ['Tiếp xúc bệnh nhân', 'Không gian nhỏ']
  },
  {
    id: 'pharmacy_zone',
    name: 'Nhà thuốc',
    type: 'pharmacy',
    riskLevel: 40,
    factors: ['Người bệnh lui tới', 'Thời gian ngắn']
  },
  {
    id: 'crowd_zone',
    name: 'Khu vực đông người',
    type: 'crowd',
    riskLevel: 55,
    factors: ['Mật độ cao', 'Tiếp xúc gần']
  },
  {
    id: 'transport_zone',
    name: 'Phương tiện công cộng',
    type: 'transport',
    riskLevel: 50,
    factors: ['Không gian kín', 'Thay đổi hành khách']
  },
  {
    id: 'outdoor_zone',
    name: 'Khu vực ngoài trời',
    type: 'outdoor',
    riskLevel: 15,
    factors: ['Thông thoáng', 'Phân tán']
  }
];

// ============= SIGNAL PROCESSING =============
function calculateDistance(rssi: number, txPower: number = -59): number {
  // Path loss model for BLE
  // Distance = 10 ^ ((TxPower - RSSI) / (10 * n))
  // n = path loss exponent (2-4, using 2.5 for indoor)
  const n = 2.5;
  const distance = Math.pow(10, (txPower - rssi) / (10 * n));
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

function determineCrowdDensity(deviceCount: number, avgDistance: number): 'low' | 'medium' | 'high' | 'very_high' {
  // Crowd density based on device count and average distance
  if (deviceCount <= 2 && avgDistance > 3) return 'low';
  if (deviceCount <= 5 && avgDistance > 2) return 'medium';
  if (deviceCount <= 10 || avgDistance < 2) return 'high';
  return 'very_high';
}

function inferRiskZone(
  signals: ProximityEvent[],
  location?: { lat: number; lng: number }
): RiskZone | null {
  // Infer risk zone based on signal patterns
  // In production, this would use actual beacon UUIDs and GPS
  
  const deviceCount = signals.length;
  const avgRssi = signals.reduce((sum, s) => sum + s.rssi, 0) / deviceCount;
  const totalDuration = signals.reduce((sum, s) => sum + s.duration, 0);

  // Heuristic inference based on signal patterns
  if (deviceCount > 15 && avgRssi > -70) {
    return KNOWN_RISK_ZONES.find(z => z.type === 'crowd') || null;
  }
  
  if (deviceCount > 8 && totalDuration > 300) {
    // Many devices, long duration - likely indoor facility
    return KNOWN_RISK_ZONES.find(z => z.type === 'clinic') || null;
  }

  if (deviceCount < 5 && avgRssi < -80) {
    return KNOWN_RISK_ZONES.find(z => z.type === 'outdoor') || null;
  }

  if (deviceCount >= 5 && deviceCount <= 15) {
    return KNOWN_RISK_ZONES.find(z => z.type === 'transport') || null;
  }

  return null;
}

function shouldTriggerHealthReeval(context: ProximityContext): boolean {
  // Trigger re-evaluation if:
  // 1. High-risk zone detected
  // 2. Very high crowd density
  // 3. Prolonged close proximity exposure
  // 4. Significant change in exposure context

  if (context.riskZone && context.riskZone.riskLevel >= 60) return true;
  if (context.crowdDensity === 'very_high') return true;
  if (context.exposureDuration > 600 && context.estimatedDistance < 2) return true;
  if (context.nearbyDevices > 10 && context.averageRssi > -60) return true;

  return false;
}

// ============= AGENT: PROCESS SIGNALS =============
function processProximitySignals(signals: ProximityEvent[], location?: { lat: number; lng: number }): ProximityContext {
  if (!signals || signals.length === 0) {
    return {
      nearbyDevices: 0,
      averageRssi: 0,
      estimatedDistance: 999,
      crowdDensity: 'low',
      riskZone: null,
      exposureDuration: 0,
      shouldTriggerReeval: false
    };
  }

  // Calculate metrics
  const nearbyDevices = signals.length;
  const averageRssi = signals.reduce((sum, s) => sum + s.rssi, 0) / nearbyDevices;
  const distances = signals.map(s => calculateDistance(s.rssi, s.txPower));
  const estimatedDistance = Math.min(...distances);
  const exposureDuration = signals.reduce((sum, s) => sum + s.duration, 0);

  // Determine crowd density
  const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
  const crowdDensity = determineCrowdDensity(nearbyDevices, avgDistance);

  // Infer risk zone
  const riskZone = inferRiskZone(signals, location);

  // Build context
  const context: ProximityContext = {
    nearbyDevices,
    averageRssi: Math.round(averageRssi),
    estimatedDistance,
    crowdDensity,
    riskZone,
    exposureDuration,
    shouldTriggerReeval: false
  };

  // Check if health re-evaluation needed
  context.shouldTriggerReeval = shouldTriggerHealthReeval(context);

  return context;
}

// ============= AGENT: EXPOSURE EVALUATION =============
function evaluateExposureRisk(context: ProximityContext): {
  exposureScore: number;
  riskFactors: string[];
  recommendations: string[];
  alertLevel: 'none' | 'info' | 'warning' | 'danger';
} {
  let exposureScore = 0;
  const riskFactors: string[] = [];
  const recommendations: string[] = [];

  // Factor 1: Crowd density
  switch (context.crowdDensity) {
    case 'very_high':
      exposureScore += 35;
      riskFactors.push('Mật độ người rất cao');
      recommendations.push('Di chuyển đến nơi thoáng hơn');
      break;
    case 'high':
      exposureScore += 25;
      riskFactors.push('Mật độ người cao');
      break;
    case 'medium':
      exposureScore += 15;
      break;
  }

  // Factor 2: Proximity distance
  if (context.estimatedDistance < 1) {
    exposureScore += 30;
    riskFactors.push('Khoảng cách rất gần (<1m)');
    recommendations.push('Giữ khoảng cách an toàn');
  } else if (context.estimatedDistance < 2) {
    exposureScore += 20;
    riskFactors.push('Khoảng cách gần (<2m)');
  }

  // Factor 3: Duration
  if (context.exposureDuration > 900) {
    exposureScore += 25;
    riskFactors.push('Tiếp xúc kéo dài (>15 phút)');
  } else if (context.exposureDuration > 300) {
    exposureScore += 15;
    riskFactors.push('Tiếp xúc trung bình (>5 phút)');
  }

  // Factor 4: Risk zone
  if (context.riskZone) {
    exposureScore += context.riskZone.riskLevel * 0.3;
    riskFactors.push(...context.riskZone.factors);
    
    if (context.riskZone.type === 'hospital') {
      recommendations.push('Đeo khẩu trang y tế');
      recommendations.push('Rửa tay thường xuyên');
    }
  }

  // Clamp score
  exposureScore = Math.min(100, Math.max(0, Math.round(exposureScore)));

  // Determine alert level
  let alertLevel: 'none' | 'info' | 'warning' | 'danger' = 'none';
  if (exposureScore >= 70) alertLevel = 'danger';
  else if (exposureScore >= 50) alertLevel = 'warning';
  else if (exposureScore >= 25) alertLevel = 'info';

  // Add default recommendations
  if (recommendations.length === 0 && exposureScore > 30) {
    recommendations.push('Theo dõi sức khỏe trong 24h tới');
  }

  return {
    exposureScore,
    riskFactors: [...new Set(riskFactors)], // Remove duplicates
    recommendations: [...new Set(recommendations)],
    alertLevel
  };
}

// ============= MAIN HANDLER =============
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, twinId, signals, location } = await req.json() as AgentRequest;
    
    console.log(`[PROXIMITY-SIGNAL-AGENT] Action: ${action}, Twin: ${twinId}, Signals: ${signals?.length || 0}`);

    switch (action) {
      case 'process_signals': {
        if (!signals || signals.length === 0) {
          return new Response(
            JSON.stringify({
              success: true,
              context: {
                nearbyDevices: 0,
                crowdDensity: 'low',
                riskZone: null,
                shouldTriggerReeval: false
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Process signals
        const context = processProximitySignals(signals, location);
        
        // Evaluate exposure risk
        const exposure = evaluateExposureRisk(context);

        console.log(`[PROXIMITY-SIGNAL-AGENT] Processed: ${signals.length} signals, Risk: ${exposure.exposureScore}, Alert: ${exposure.alertLevel}`);

        return new Response(
          JSON.stringify({
            success: true,
            context,
            exposure,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_risk_zones': {
        return new Response(
          JSON.stringify({
            success: true,
            zones: KNOWN_RISK_ZONES
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'evaluate_exposure': {
        const context = processProximitySignals(signals || [], location);
        const exposure = evaluateExposureRisk(context);

        return new Response(
          JSON.stringify({
            success: true,
            exposure,
            twinUpdate: context.shouldTriggerReeval ? {
              type: 'proximity_alert',
              severity: exposure.alertLevel,
              data: {
                exposureScore: exposure.exposureScore,
                riskFactors: exposure.riskFactors,
                zone: context.riskZone?.name
              }
            } : null
          }),
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
    console.error('[PROXIMITY-SIGNAL-AGENT] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
