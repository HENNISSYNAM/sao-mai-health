import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SynthesisRequest {
  userId: string;
  environmentData?: {
    temperature?: number;
    humidity?: number;
    aqi?: number;
    pressure?: number;
    uv?: number;
    pressureChange1h?: number;
  };
  strokeRiskScore?: number;
  diseaseRisks?: Array<{
    diseaseCode: string;
    diseaseName: string;
    riskLevel: number;
    nearbyCase: number;
    distanceKm: number;
  }>;
  location?: { lat: number; lng: number };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { userId, environmentData, strokeRiskScore, diseaseRisks, location } = await req.json() as SynthesisRequest;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[TWIN-SYNTHESIS] Processing for user: ${userId}`);

    // Get user profile for personalization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('age_group, health_sensitivity, primary_interests')
      .eq('user_id', userId)
      .maybeSingle();

    // Generate insights based on available data
    const insights: any[] = [];
    const predictions: any[] = [];
    const actions: any[] = [];

    // Environment-based insights
    if (environmentData) {
      // AQI insights
      if (environmentData.aqi !== undefined) {
        if (environmentData.aqi > 150) {
          insights.push({
            id: `env-aqi-${Date.now()}`,
            type: 'warning',
            title: 'Chất lượng không khí kém',
            description: `AQI hiện tại: ${environmentData.aqi}. Hạn chế hoạt động ngoài trời.`,
            source: 'environment',
            confidence: 0.95,
            generatedAt: new Date().toISOString(),
          });
          actions.push({
            id: `act-aqi-${Date.now()}`,
            priority: 'high',
            action: 'Đeo khẩu trang N95 khi ra ngoài',
            reason: 'AQI vượt ngưỡng an toàn',
          });
        } else if (environmentData.aqi > 100) {
          insights.push({
            id: `env-aqi-${Date.now()}`,
            type: 'info',
            title: 'Chất lượng không khí trung bình',
            description: `AQI: ${environmentData.aqi}. Nhóm nhạy cảm nên hạn chế ngoài trời.`,
            source: 'environment',
            confidence: 0.9,
            generatedAt: new Date().toISOString(),
          });
        }
      }

      // Temperature insights
      if (environmentData.temperature !== undefined) {
        if (environmentData.temperature > 35) {
          insights.push({
            id: `env-temp-${Date.now()}`,
            type: 'warning',
            title: 'Nhiệt độ cao',
            description: `${environmentData.temperature}°C - Nguy cơ say nắng, sốc nhiệt.`,
            source: 'environment',
            confidence: 0.9,
            generatedAt: new Date().toISOString(),
          });
          actions.push({
            id: `act-temp-${Date.now()}`,
            priority: 'high',
            action: 'Uống đủ nước, tránh nắng 11h-15h',
            reason: 'Nhiệt độ vượt ngưỡng an toàn',
          });
        }
      }

      // Pressure change insights (stroke risk)
      if (environmentData.pressureChange1h !== undefined) {
        const absChange = Math.abs(environmentData.pressureChange1h);
        if (absChange > 3) {
          insights.push({
            id: `env-pressure-${Date.now()}`,
            type: 'warning',
            title: 'Biến động áp suất mạnh',
            description: `Thay đổi ${environmentData.pressureChange1h.toFixed(1)} hPa/giờ. Tăng nguy cơ đột quỵ.`,
            source: 'environment',
            confidence: 0.85,
            generatedAt: new Date().toISOString(),
          });
          
          predictions.push({
            id: `pred-stroke-${Date.now()}`,
            type: 'stroke_risk',
            probability: Math.min(0.7, absChange * 0.15),
            timeframe: '24 giờ tới',
            description: 'Nguy cơ đột quỵ tăng do biến động áp suất',
            preventiveActions: [
              'Theo dõi huyết áp thường xuyên',
              'Tránh hoạt động gắng sức',
              'Uống đủ nước',
              'Nghỉ ngơi đầy đủ'
            ],
          });
        }
      }
    }

    // Stroke risk score insights
    if (strokeRiskScore !== undefined && strokeRiskScore !== null) {
      if (strokeRiskScore >= 70) {
        insights.push({
          id: `stroke-high-${Date.now()}`,
          type: 'warning',
          title: 'Cảnh báo rủi ro đột quỵ cao',
          description: `Điểm rủi ro: ${strokeRiskScore}/100. Cần theo dõi sát sức khỏe.`,
          source: 'personal',
          confidence: 0.9,
          generatedAt: new Date().toISOString(),
        });
        actions.push({
          id: `act-stroke-${Date.now()}`,
          priority: 'urgent',
          action: 'Kiểm tra huyết áp ngay',
          reason: 'Điểm rủi ro đột quỵ ở mức cao',
        });
      } else if (strokeRiskScore >= 40) {
        insights.push({
          id: `stroke-medium-${Date.now()}`,
          type: 'info',
          title: 'Rủi ro đột quỵ trung bình',
          description: `Điểm rủi ro: ${strokeRiskScore}/100. Duy trì lối sống lành mạnh.`,
          source: 'personal',
          confidence: 0.85,
          generatedAt: new Date().toISOString(),
        });
      }
    }

    // Disease risk insights
    if (diseaseRisks && diseaseRisks.length > 0) {
      const highRiskDiseases = diseaseRisks.filter(d => d.riskLevel >= 60);
      
      for (const disease of highRiskDiseases) {
        insights.push({
          id: `disease-${disease.diseaseCode}-${Date.now()}`,
          type: 'warning',
          title: `Cảnh báo ${disease.diseaseName}`,
          description: `${disease.nearbyCase} ca trong bán kính ${disease.distanceKm}km. Mức rủi ro: ${disease.riskLevel}%`,
          source: 'disease',
          confidence: 0.8,
          generatedAt: new Date().toISOString(),
        });
        
        // Add preventive actions based on disease
        if (disease.diseaseCode.includes('dengue') || disease.diseaseName.toLowerCase().includes('sốt xuất huyết')) {
          actions.push({
            id: `act-dengue-${Date.now()}`,
            priority: 'medium',
            action: 'Sử dụng kem chống muỗi, mặc áo dài tay',
            reason: `Dịch ${disease.diseaseName} đang hoạt động trong khu vực`,
          });
        }
      }

      // Prediction based on disease density
      if (highRiskDiseases.length > 0) {
        predictions.push({
          id: `pred-disease-${Date.now()}`,
          type: 'disease_outbreak',
          probability: Math.min(0.6, highRiskDiseases.length * 0.2),
          timeframe: '7 ngày tới',
          description: `Khả năng gia tăng ca bệnh trong khu vực`,
          preventiveActions: [
            'Rửa tay thường xuyên',
            'Hạn chế đến nơi đông người',
            'Đeo khẩu trang khi ra ngoài',
            'Theo dõi triệu chứng sức khỏe'
          ],
        });
      }
    }

    // Use AI for more sophisticated insights if API key available
    if (lovableApiKey && insights.length > 0) {
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                content: `Bạn là AI y tế cá nhân hóa. Dựa trên dữ liệu môi trường và dịch tễ, đưa ra 1-2 khuyến nghị ngắn gọn bằng tiếng Việt. Chỉ trả lời JSON array với format: [{"action": "...", "reason": "..."}]`
              },
              {
                role: 'user',
                content: JSON.stringify({
                  environment: environmentData,
                  strokeRisk: strokeRiskScore,
                  nearbyDiseases: diseaseRisks?.slice(0, 3),
                  userAgeGroup: profile?.age_group,
                  userSensitivity: profile?.health_sensitivity,
                })
              }
            ],
            max_tokens: 300,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          
          if (content) {
            try {
              const aiActions = JSON.parse(content);
              if (Array.isArray(aiActions)) {
                aiActions.forEach((a: any, i: number) => {
                  actions.push({
                    id: `ai-act-${Date.now()}-${i}`,
                    priority: 'medium',
                    action: a.action,
                    reason: a.reason,
                  });
                });
              }
            } catch (e) {
              console.log('[TWIN-SYNTHESIS] AI response not JSON, skipping');
            }
          }
        }
      } catch (aiError) {
        console.error('[TWIN-SYNTHESIS] AI enhancement error:', aiError);
      }
    }

    // Save to database
    await supabase
      .from('user_twin_data')
      .upsert({
        user_id: userId,
        ai_generated_insights: insights,
        health_predictions: predictions,
        personalized_actions: actions,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    console.log(`[TWIN-SYNTHESIS] Generated ${insights.length} insights, ${predictions.length} predictions, ${actions.length} actions`);

    return new Response(JSON.stringify({
      success: true,
      insights,
      predictions,
      actions,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[TWIN-SYNTHESIS] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
