import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { query, mode } = await req.json().catch(() => ({ query: undefined, mode: 'vietnam' }));
    
    const today = new Date().toISOString().split('T')[0];
    
    const queries: Record<string, string> = {
      vietnam: `Dịch bệnh Việt Nam ${today}. Tin tức mới nhất về sốt xuất huyết, COVID-19, tay chân miệng, sởi, dại, cúm tại Việt Nam. Số ca bệnh, địa điểm, mức độ nguy hiểm.`,
      global: `Disease outbreaks worldwide ${today}. WHO Disease Outbreak News, ProMED alerts. Focus on diseases that could reach Vietnam: dengue, HFMD, measles, avian influenza, MERS.`,
      pharma: `Tin tức vaccine và dược phẩm Việt Nam ${today}. Tiến trình tiêm chủng, thuốc mới, nghiên cứu y tế.`,
    };

    const searchQuery = query || queries[mode] || queries.vietnam;
    
    console.log(`🔍 Perplexity search: ${mode} - ${searchQuery.substring(0, 100)}`);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: `Bạn là chuyên gia phân tích dịch tễ. Trả lời bằng JSON:
{
  "articles": [
    {
      "title": "tiêu đề",
      "disease": "tên bệnh",
      "location": "địa điểm",
      "cases": số ca hoặc null,
      "severity": "low|medium|high|critical",
      "summary": "tóm tắt ngắn",
      "date": "YYYY-MM-DD",
      "source_hint": "tên nguồn gốc"
    }
  ],
  "global_watch": [
    {
      "disease": "tên bệnh",
      "country": "quốc gia",
      "risk_to_vietnam": "low|medium|high",
      "summary": "tóm tắt"
    }
  ]
}
Chỉ trả về JSON, không thêm text.`
          },
          { role: 'user', content: searchQuery }
        ],
        temperature: 0.2,
        search_recency_filter: 'week',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('❌ Perplexity error:', response.status, errText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];
    
    console.log('✅ Perplexity response received');

    let parsed;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1] || content);
    } catch {
      parsed = { articles: [], global_watch: [], raw: content };
    }

    // Store articles to health_news_articles table
    if (parsed.articles?.length > 0) {
      for (const a of parsed.articles) {
        const title = a.title || `Perplexity Alert`;
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(title + (a.date || '')));
        const hashStr = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        
        const { error: insertError } = await supabase
          .from('health_news_articles')
          .upsert({
            article_hash: hashStr,
            title,
            url: citations[parsed.articles.indexOf(a)] || '#',
            source: a.source_hint || 'Perplexity AI',
            published_at: a.date ? new Date(a.date).toISOString() : new Date().toISOString(),
            content_summary: a.summary,
            severity: a.severity || 'medium',
            classification: 'confirmed',
            disease_type: a.disease?.toLowerCase(),
            location: a.location,
            case_count: typeof a.cases === 'number' ? a.cases : null,
            crawled_at: new Date().toISOString(),
          }, { onConflict: 'article_hash' });
        
        if (insertError) console.error('❌ Insert error:', insertError);
      }
      console.log(`✅ Stored ${parsed.articles.length} articles to health_news_articles`);
    }

    return new Response(JSON.stringify({
      success: true,
      mode,
      articles: parsed.articles || [],
      globalWatch: parsed.global_watch || [],
      citations,
      raw: parsed.raw,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Search error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
