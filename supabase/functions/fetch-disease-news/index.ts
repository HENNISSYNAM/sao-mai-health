import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsItem {
  title: string;
  url: string;
  content: string;
  publishedAt: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting disease news fetch...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Search for latest disease news in Vietnam
    const searchQuery = 'dịch bệnh Việt Nam OR sốt xuất huyết OR COVID-19 OR tay chân miệng site:vnexpress.net OR site:tuoitre.vn OR site:thanhnien.vn';
    
    console.log('🌐 Searching for news:', searchQuery);

    // Use AI to search and analyze web content
    const searchResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `Bạn là chuyên gia dịch tễ học phân tích tin tức y tế Việt Nam.

Nhiệm vụ: Tìm kiếm số liệu CA MẮC BỆNH THỰC TẾ từ tin tức chính thống gần nhất.

QUY TẮC TRÍCH XUẤT:
1. Chỉ trích xuất số liệu CÓ NGUỒN RÕ RÀNG (Bộ Y tế, CDC, Sở Y tế, bệnh viện)
2. Phân biệt: ca mắc MỚI (trong ngày/tuần) vs ca TÍCH LŨY (tổng cộng)
3. Ghi nhận xu hướng: tăng/giảm/ổn định so với tuần trước
4. Nếu không tìm thấy số liệu cụ thể, ĐỂ cases = 0 và ghi rõ trong summary

Trả về JSON:
{
  "articles": [
    {
      "disease": "tên bệnh (dengue/covid19/hfmd/influenza/measles/tuberculosis/cholera/rabies)",
      "cases": <số ca mắc MỚI, số nguyên, 0 nếu không rõ>,
      "cumulative_cases": <tổng ca tích lũy nếu có, null nếu không>,
      "deaths": <số tử vong nếu có, 0 nếu không>,
      "location": "địa điểm cụ thể nhất (quận > thành phố > tỉnh)",
      "date": "YYYY-MM-DD",
      "severity": "low/medium/high/critical",
      "trend": "increasing/decreasing/stable",
      "summary": "tóm tắt 1 câu có số liệu và xu hướng",
      "source_name": "tên nguồn (VD: Bộ Y tế, Sở Y tế TP.HCM)"
    }
  ]
}

KHÔNG bịa số liệu. Nếu không chắc chắn, ghi cases=0 và giải thích trong summary.`
          },
          {
            role: 'user',
            content: `Tìm số liệu ca mắc bệnh MỚI NHẤT tại Việt Nam trong 7 ngày qua.
Tập trung: sốt xuất huyết (dengue), COVID-19, tay chân miệng (HFMD), cúm (influenza), sởi (measles).
Ưu tiên nguồn: Bộ Y tế, CDC Việt Nam, Sở Y tế các tỉnh.
Chỉ trả về JSON, không thêm text khác.`
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!searchResponse.ok) {
      console.error('❌ Search API error:', searchResponse.status);
      if (searchResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('Search failed');
    }

    const searchData = await searchResponse.json();
    const aiResponse = searchData.choices[0]?.message?.content;
    
    console.log('🤖 AI Response:', aiResponse?.substring(0, 200));

    if (!aiResponse) {
      throw new Error('No AI response');
    }

    // Parse JSON from AI response
    let articlesData;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || 
                        aiResponse.match(/```\n([\s\S]*?)\n```/) ||
                        [null, aiResponse];
      const jsonStr = jsonMatch[1] || aiResponse;
      articlesData = JSON.parse(jsonStr);
    } catch (e) {
      console.error('❌ Failed to parse JSON:', e);
      console.log('Raw response:', aiResponse);
      throw new Error('Failed to parse AI response');
    }

    console.log('📊 Parsed articles:', articlesData.articles?.length || 0);

    // Insert discovered cases into database
    const casesToInsert = [];
    const alertsToInsert = [];

    for (const article of articlesData.articles || []) {
      if (!article.disease || !article.cases) continue;

      const caseData = {
        disease_code: article.disease.toLowerCase(),
        occurred_at: article.date || new Date().toISOString(),
        district_id: article.location || 'unknown',
        source: 'news',
        patient_hash: `news_${Date.now()}_${Math.random()}`,
      };

      casesToInsert.push(caseData);

      // Create alert if severity is medium or high
      if (article.severity === 'medium' || article.severity === 'high') {
        alertsToInsert.push({
          disease_code: article.disease.toLowerCase(),
          day: article.date || new Date().toISOString().split('T')[0],
          cases: article.cases,
          status: 'open',
          rule: `Phát hiện từ tin tức: ${article.summary}`,
          district_id: article.location || null,
        });
      }
    }

    console.log('💾 Inserting cases:', casesToInsert.length);
    console.log('⚠️ Creating alerts:', alertsToInsert.length);

    // Insert cases
    if (casesToInsert.length > 0) {
      const { error: caseError } = await supabase
        .from('case_events')
        .insert(casesToInsert);
      
      if (caseError) {
        console.error('❌ Error inserting cases:', caseError);
      } else {
        console.log('✅ Cases inserted successfully');
      }
    }

    // Insert alerts
    if (alertsToInsert.length > 0) {
      const { error: alertError } = await supabase
        .from('alerts')
        .insert(alertsToInsert);
      
      if (alertError) {
        console.error('❌ Error inserting alerts:', alertError);
      } else {
        console.log('✅ Alerts created successfully');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        articlesFound: articlesData.articles?.length || 0,
        casesInserted: casesToInsert.length,
        alertsCreated: alertsToInsert.length,
        articles: articlesData.articles || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in fetch-disease-news:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});