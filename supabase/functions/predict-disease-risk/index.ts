import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon } = await req.json();

    if (!lat || !lon) {
      return new Response(
        JSON.stringify({ error: 'Latitude và Longitude là bắt buộc' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Analyzing location: ${lat}, ${lon}`);

    // Fetch nearby cases within ~5km radius (roughly 0.05 degrees)
    const { data: nearbyCases, error: casesError } = await supabase
      .from('case_events')
      .select('*')
      .gte('lat', lat - 0.05)
      .lte('lat', lat + 0.05)
      .gte('lon', lon - 0.05)
      .lte('lon', lon + 0.05)
      .order('occurred_at', { ascending: false })
      .limit(100);

    if (casesError) {
      console.error('Error fetching cases:', casesError);
      throw casesError;
    }

    console.log(`Found ${nearbyCases?.length || 0} nearby cases`);

    // Calculate distance and analyze patterns
    const casesWithDistance = nearbyCases?.map(c => {
      const latDiff = c.lat - lat;
      const lonDiff = c.lon - lon;
      const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111; // Convert to km
      return { ...c, distance };
    }).filter(c => c.distance <= 5) || []; // Within 5km

    // Group by disease and time
    const diseaseStats: Record<string, { count: number; recent: number }> = {};
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    casesWithDistance.forEach(c => {
      const disease = c.disease_code || 'unknown';
      if (!diseaseStats[disease]) {
        diseaseStats[disease] = { count: 0, recent: 0 };
      }
      diseaseStats[disease].count++;
      
      const caseDate = new Date(c.occurred_at);
      if (caseDate >= weekAgo) {
        diseaseStats[disease].recent++;
      }
    });

    // Build analysis context
    const analysisContext = `
DỮ LIỆU PHÂN TÍCH:

VỊ TRÍ KIỂM TRA:
- Latitude: ${lat}
- Longitude: ${lon}

DỊCH BỆNH XUNG QUANH (trong bán kính 5km):
- Tổng ca bệnh: ${casesWithDistance.length}
- Ca gần nhất cách: ${casesWithDistance[0]?.distance.toFixed(2) || 'N/A'} km

PHÂN BỐ THEO BỆNH:
${Object.entries(diseaseStats)
  .sort(([,a], [,b]) => b.count - a.count)
  .map(([disease, stats]) => 
    `- ${disease}: ${stats.count} ca (${stats.recent} ca trong 7 ngày qua)`
  ).join('\n') || 'Không có dữ liệu'}

XU HƯỚNG GẦN ĐÂY:
${Object.entries(diseaseStats)
  .filter(([,stats]) => stats.recent > 0)
  .sort(([,a], [,b]) => b.recent - a.recent)
  .map(([disease, stats]) => 
    `- ${disease}: ${stats.recent} ca mới`
  ).join('\n') || 'Không có ca mới'}
`;

    // Call Lovable AI for prediction
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling AI for prediction...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Bạn là hệ thống AI dự đoán nguy cơ dịch bệnh dựa trên:
1. Phân tích dữ liệu lịch sử các ca bệnh
2. Phân bố không gian (GPS)
3. Xu hướng theo thời gian
4. Mật độ ca bệnh trong khu vực

Nhiệm vụ: Đánh giá mức độ nguy cơ dịch bệnh tại vị trí được chỉ định.

Đưa ra kết quả:
1. Mức độ rủi ro: THẤP / TRUNG BÌNH / CAO
2. Điểm số nguy cơ: 0-100
3. Các bệnh cần chú ý
4. Khuyến nghị phòng ngừa cụ thể
5. Dự đoán xu hướng

Trả lời ngắn gọn, rõ ràng bằng tiếng Việt.`
          },
          {
            role: 'user',
            content: `${analysisContext}\n\nHãy phân tích và dự đoán mức độ nguy cơ dịch bệnh tại vị trí này.`
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent predictions
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Hệ thống quá tải. Vui lòng thử lại sau.',
            riskLevel: 'unknown',
            riskScore: 0
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'Cần nạp credits. Vui lòng liên hệ admin.',
            riskLevel: 'unknown',
            riskScore: 0
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('AI service unavailable');
    }

    const aiData = await response.json();
    const prediction = aiData.choices[0]?.message?.content || 'Không thể dự đoán';

    console.log('AI prediction generated successfully');

    // Calculate simple risk score based on data
    let riskScore = 0;
    if (casesWithDistance.length > 0) {
      riskScore = Math.min(100, casesWithDistance.length * 5);
      
      // Boost score for recent cases
      const recentCases = casesWithDistance.filter(c => {
        const caseDate = new Date(c.occurred_at);
        return caseDate >= weekAgo;
      });
      riskScore += recentCases.length * 10;
      
      // Boost for nearby cases
      const veryCLoseCases = casesWithDistance.filter(c => c.distance < 1);
      riskScore += veryCLoseCases.length * 15;
    }
    riskScore = Math.min(100, riskScore);

    // Determine risk level
    let riskLevel = 'THẤP';
    if (riskScore >= 70) riskLevel = 'CAO';
    else if (riskScore >= 40) riskLevel = 'TRUNG BÌNH';

    return new Response(
      JSON.stringify({ 
        prediction,
        riskScore: Math.round(riskScore),
        riskLevel,
        nearbyCases: casesWithDistance.length,
        topDiseases: Object.entries(diseaseStats)
          .sort(([,a], [,b]) => b.count - a.count)
          .slice(0, 3)
          .map(([disease, stats]) => ({ disease, count: stats.count, recent: stats.recent })),
        success: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in predict-disease-risk:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Đã xảy ra lỗi khi dự đoán',
        prediction: 'Không thể thực hiện dự đoán lúc này.',
        riskScore: 0,
        riskLevel: 'unknown',
        success: false
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});