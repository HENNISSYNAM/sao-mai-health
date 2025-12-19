import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationData {
  lat: number;
  lon: number;
  gpsAccuracy: number | null;
  gpsHistory?: Array<{ lat: number; lon: number; accuracy: number; timestamp: number }>;
  environment?: {
    temperature: number | null;
    humidity: number | null;
    aqi: number | null;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { locationData }: { locationData: LocationData } = await req.json();
    
    const { lat, lon, gpsAccuracy, gpsHistory = [], environment } = locationData;
    
    // Indoor/Outdoor detection heuristics
    let indoorScore = 0;
    let outdoorScore = 0;
    const factors: string[] = [];
    
    // 1. Check GPS movement first - MOVEMENT = OUTDOOR (strongest signal)
    let isMoving = false;
    let totalDistance = 0;
    let avgSpeed = 0;
    
    if (gpsHistory.length >= 2) {
      const recentPoints = gpsHistory.slice(-10);
      let sumDistance = 0;
      let sumTime = 0;
      
      for (let i = 1; i < recentPoints.length; i++) {
        const dx = (recentPoints[i].lat - recentPoints[i-1].lat) * 111320; // meters
        const dy = (recentPoints[i].lon - recentPoints[i-1].lon) * 111320 * Math.cos(lat * Math.PI / 180);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const timeDiff = (recentPoints[i].timestamp - recentPoints[i-1].timestamp) / 1000; // seconds
        
        sumDistance += distance;
        sumTime += timeDiff;
      }
      
      totalDistance = sumDistance;
      avgSpeed = sumTime > 0 ? (sumDistance / sumTime) * 3.6 : 0; // km/h
      
      // If moving more than 10 meters total or speed > 1 km/h, consider outdoor
      if (totalDistance > 10 || avgSpeed > 1) {
        isMoving = true;
        outdoorScore += 60; // Strong outdoor signal
        factors.push(`Đang di chuyển (${totalDistance.toFixed(0)}m, ${avgSpeed.toFixed(1)} km/h) - ngoài trời`);
      } else if (totalDistance > 3) {
        // Small movement
        outdoorScore += 25;
        factors.push(`Di chuyển nhẹ (${totalDistance.toFixed(1)}m)`);
      }
    }
    
    // 2. GPS Accuracy - but give less weight if already moving
    if (gpsAccuracy !== null && !isMoving) {
      if (gpsAccuracy > 50) {
        indoorScore += 40;
        factors.push(`GPS kém (${Math.round(gpsAccuracy)}m) - có thể trong nhà`);
      } else if (gpsAccuracy > 30) {
        indoorScore += 25;
        factors.push(`GPS trung bình (${Math.round(gpsAccuracy)}m)`);
      } else if (gpsAccuracy > 15) {
        outdoorScore += 20;
        factors.push(`GPS tốt (${Math.round(gpsAccuracy)}m)`);
      } else {
        outdoorScore += 40;
        factors.push(`GPS rất tốt (${Math.round(gpsAccuracy)}m) - ngoài trời`);
      }
    } else if (gpsAccuracy !== null && isMoving) {
      // When moving, accuracy matters less but still a factor
      if (gpsAccuracy < 30) {
        outdoorScore += 15;
        factors.push(`GPS ổn định khi di chuyển (${Math.round(gpsAccuracy)}m)`);
      }
    }
    
    // 3. Accuracy stability pattern analysis
    if (gpsHistory.length >= 3) {
      const recentPoints = gpsHistory.slice(-10);
      let accuracyVariation = 0;
      
      for (let i = 1; i < recentPoints.length; i++) {
        accuracyVariation += Math.abs(recentPoints[i].accuracy - recentPoints[i-1].accuracy);
      }
      
      const avgVariation = accuracyVariation / (recentPoints.length - 1);
      
      // Indoor: high accuracy variation (GPS signal bouncing)
      // Outdoor: stable accuracy
      if (avgVariation > 20 && !isMoving) {
        indoorScore += 20;
        factors.push('Độ chính xác dao động nhiều - trong nhà');
      } else if (avgVariation < 5 && totalDistance > 5) {
        outdoorScore += 15;
        factors.push('Độ chính xác ổn định - ngoài trời');
      }
    }
    
    // 3. Check if location is likely in a building area (simple heuristic)
    // In urban areas with specific coordinates patterns
    // This could be enhanced with reverse geocoding or POI data
    
    // Calculate final determination
    const totalScore = indoorScore + outdoorScore;
    const indoorProbability = totalScore > 0 ? (indoorScore / totalScore) * 100 : 50;
    
    let locationType: 'indoor' | 'outdoor' | 'uncertain';
    let confidence: number;
    
    if (indoorProbability >= 65) {
      locationType = 'indoor';
      confidence = indoorProbability;
    } else if (indoorProbability <= 35) {
      locationType = 'outdoor';
      confidence = 100 - indoorProbability;
    } else {
      locationType = 'uncertain';
      confidence = 50 + Math.abs(50 - indoorProbability);
    }
    
    // Determine if it's safe to be outside based on environment
    let safeOutdoorMinutes = 120; // Default 2 hours
    let outdoorWarning: string | null = null;
    
    if (environment?.aqi !== null) {
      if (environment.aqi > 200) {
        safeOutdoorMinutes = 15;
        outdoorWarning = 'AQI nguy hiểm! Hạn chế tối đa thời gian ngoài trời';
      } else if (environment.aqi > 150) {
        safeOutdoorMinutes = 30;
        outdoorWarning = 'Chất lượng không khí kém, nên hạn chế hoạt động ngoài trời';
      } else if (environment.aqi > 100) {
        safeOutdoorMinutes = 60;
        outdoorWarning = 'Nhóm nhạy cảm nên hạn chế thời gian ngoài trời';
      }
    }
    
    if (environment?.temperature !== null) {
      if (environment.temperature > 38) {
        safeOutdoorMinutes = Math.min(safeOutdoorMinutes, 30);
        outdoorWarning = outdoorWarning || 'Nhiệt độ quá cao, tránh hoạt động ngoài trời kéo dài';
      } else if (environment.temperature > 35) {
        safeOutdoorMinutes = Math.min(safeOutdoorMinutes, 60);
      }
    }
    
    console.log(`Location detection: ${locationType} (${confidence.toFixed(0)}% confidence)`);
    console.log(`Factors: ${factors.join(', ')}`);
    
    return new Response(
      JSON.stringify({
        locationType,
        confidence: Math.round(confidence),
        indoorProbability: Math.round(indoorProbability),
        factors,
        safeOutdoorMinutes,
        outdoorWarning,
        shouldCountOutdoorTime: locationType === 'outdoor' || locationType === 'uncertain'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error detecting location type:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        locationType: 'uncertain',
        shouldCountOutdoorTime: true,
        safeOutdoorMinutes: 120
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
