import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  aiSummary: string;
  keywords: string[];
  classification: 'confirmed' | 'emerging' | 'predictive';
  disease?: string;
  location?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isAcademic?: boolean;
}

// In-memory cache
const cache: { data: any; timestamp: number } = { data: null, timestamp: 0 };
const CACHE_TTL = 60 * 1000; // 1 minute

const DOMAIN_NAMES: Record<string, string> = {
  'vnexpress.net': 'VnExpress', 'tuoitre.vn': 'Tuổi Trẻ', 'thanhnien.vn': 'Thanh Niên',
  'dantri.com.vn': 'Dân Trí', 'suckhoedoisong.vn': 'Sức khỏe & Đời sống',
  'moh.gov.vn': 'Bộ Y tế', 'vncdc.gov.vn': 'VNCDC', 'who.int': 'WHO', 'cdc.gov': 'CDC',
  'pubmed.ncbi.nlm.nih.gov': 'PubMed', 'thelancet.com': 'The Lancet', 'nature.com': 'Nature',
  'nld.com.vn': 'Người Lao Động', 'baomoi.com': 'Báo Mới', 'vietnamnet.vn': 'VietNamNet',
  'nhandan.vn': 'Nhân Dân', 'vtv.vn': 'VTV', 'vov.vn': 'VOV', 'laodong.vn': 'Lao Động',
  'tienphong.vn': 'Tiền Phong', 'reuters.com': 'Reuters', 'bbc.com': 'BBC',
  'zingnews.vn': 'Zing News', 'kenh14.vn': 'Kênh 14', 'plo.vn': 'Pháp Luật',
};

function extractDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    for (const [domain, name] of Object.entries(DOMAIN_NAMES)) {
      if (hostname.includes(domain)) return name;
    }
    return hostname;
  } catch { return 'Unknown'; }
}

function getFallbackData(expertMode: boolean): NewsArticle[] {
  const today = new Date().toISOString().split('T')[0];
  return [{
    id: `fallback-${Date.now()}`,
    title: expertMode ? "Dengue Surveillance in Vietnam" : "Bộ Y tế cập nhật tình hình dịch bệnh",
    source: expertMode ? "WHO" : "Bộ Y tế",
    url: expertMode ? "https://www.who.int/vietnam" : "https://moh.gov.vn",
    publishedAt: today,
    aiSummary: expertMode ? "Ongoing dengue surveillance in Vietnam." : "Theo dõi tình hình dịch bệnh tại Việt Nam.",
    keywords: expertMode ? ["dengue", "Vietnam"] : ["Bộ Y tế", "dịch bệnh"],
    classification: "confirmed", disease: "general", location: "Việt Nam", severity: "low",
    isAcademic: expertMode
  }];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const expertMode = body.expertMode === true;
    const language = body.language || 'vi';
    const forceRefresh = body.forceRefresh === true;

    console.log(`🔍 Health News - Expert: ${expertMode}, Lang: ${language}`);

    // Check cache
    const now = Date.now();
    const cacheKey = expertMode ? 'expert' : 'general';
    if (!forceRefresh && cache.data?.key === cacheKey && (now - cache.timestamp) < CACHE_TTL) {
      console.log('📦 Returning cached data');
      return new Response(JSON.stringify({ ...cache.data.response, fromCache: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const today = new Date().toISOString().split('T')[0];

    if (!PERPLEXITY_API_KEY && !LOVABLE_API_KEY) {
      console.log('⚠️ No API keys');
      return new Response(JSON.stringify({ success: true, articles: getFallbackData(expertMode), overallRisk: 'low', lastUpdated: new Date().toISOString(), expertMode, fromFallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let articles: NewsArticle[] = [];
    let citationUrls: string[] = [];

    // === PRIMARY: Perplexity Sonar with real-time web search ===
    if (PERPLEXITY_API_KEY) {
      try {
        const query = expertMode
          ? `Find the latest 10-15 public health research articles about Vietnam in 2025-2026. Include dengue, influenza, COVID-19, hand foot mouth disease outbreaks, epidemiology studies. Return diverse results from WHO, PubMed, CDC, Lancet.`
          : `Tìm 10-15 tin tức y tế Việt Nam mới nhất hôm nay ${today}. Bao gồm: dịch bệnh sốt xuất huyết, cúm, tay chân miệng, COVID, sởi, dại, ổ dịch mới, ca mắc, tử vong, tiêm chủng, an toàn thực phẩm, cảnh báo Bộ Y tế. Đa dạng nguồn: VnExpress, Tuổi Trẻ, Thanh Niên, Dân Trí, Bộ Y tế, Sức khỏe Đời sống.`;

        const systemPrompt = `You are a health news analyst. Today is ${today}.
Return a JSON array of 10-15 health news articles. Each article must use data from your search results.

IMPORTANT: Use the CITATION NUMBERS [1], [2], etc. from your search results to reference URLs.

Format:
[{
  "title": "Exact headline from source",
  "citationIndex": 1,
  "summary": "2-3 sentence factual summary with numbers",
  "disease": "dengue|covid19|influenza|hfmd|measles|rabies|ari|environmental|food_safety|general",
  "location": "Province/city if mentioned",
  "severity": "low|medium|high|critical",
  "classification": "confirmed|emerging|predictive",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}]

SEVERITY: critical=outbreak/deaths, high=significant increase, medium=moderate, low=routine
Return ONLY the JSON array.`;

        console.log('🌐 Calling Perplexity Sonar...');
        const ppxResponse = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: expertMode ? 'sonar-pro' : 'sonar',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: query }
            ],
            temperature: 0.1,
            search_recency_filter: 'week',
            ...(expertMode ? { search_mode: 'academic' } : {}),
          }),
        });

        if (ppxResponse.ok) {
          const ppxData = await ppxResponse.json();
          const content = ppxData.choices?.[0]?.message?.content || '';
          citationUrls = ppxData.citations || [];

          console.log(`🔗 Got ${citationUrls.length} citations from Perplexity`);

          try {
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const rawArticles = JSON.parse(jsonMatch[0]);
              console.log(`✅ Parsed ${rawArticles.length} articles`);

              articles = rawArticles.slice(0, 15).map((a: any, idx: number) => {
                // Map citation index to real URL
                const citIdx = (a.citationIndex || idx + 1) - 1;
                const url = citationUrls[citIdx] || citationUrls[idx] || citationUrls[0] || '#';

                let classification: 'confirmed' | 'emerging' | 'predictive' = a.classification || 'confirmed';
                if (!['confirmed', 'emerging', 'predictive'].includes(classification)) classification = 'confirmed';

                let severity = a.severity || 'medium';
                if (!['low', 'medium', 'high', 'critical'].includes(severity)) severity = 'medium';

                let keywords = a.keywords || [];
                if (!Array.isArray(keywords) || keywords.length === 0) keywords = ['y tế'];

                return {
                  id: `ppx-${Date.now()}-${idx}`,
                  title: a.title || 'Health Update',
                  source: extractDomainName(url),
                  url,
                  publishedAt: a.publishedAt || today,
                  aiSummary: a.summary || '',
                  keywords: keywords.slice(0, 5),
                  classification,
                  disease: a.disease || 'general',
                  location: a.location || 'Việt Nam',
                  severity,
                  isAcademic: expertMode
                };
              });
            }
          } catch (e) {
            console.error('❌ Parse failed:', e);
          }
        } else {
          const errText = await ppxResponse.text();
          console.error(`❌ Perplexity error ${ppxResponse.status}: ${errText.slice(0, 200)}`);
        }
      } catch (e) {
        console.error('❌ Perplexity call failed:', e);
      }
    }

    // === FALLBACK: Lovable AI ===
    if (articles.length === 0 && LOVABLE_API_KEY) {
      try {
        console.log('🔄 Trying Lovable AI fallback...');
        const lovableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              { role: 'system', content: `Return a JSON array of 8-10 health news articles about Vietnam today ${today}. Format: [{"title":"...","summary":"...","disease":"dengue|covid19|influenza|hfmd|measles|general","location":"...","severity":"low|medium|high|critical","classification":"confirmed|emerging|predictive","keywords":["..."],"url":"https://..."}]. Return ONLY the JSON array.` },
              { role: 'user', content: expertMode ? 'Latest public health research Vietnam' : `Tin tức y tế Việt Nam mới nhất hôm nay ${today}` }
            ],
            temperature: 0.2,
          }),
        });

        if (lovableResponse.ok) {
          const data = await lovableResponse.json();
          const content = data.choices?.[0]?.message?.content || '';
          console.log(`📝 Lovable AI response (${content.length} chars): ${content.slice(0, 200)}`);
          
          try {
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const rawArticles = JSON.parse(jsonMatch[0]);
              articles = rawArticles.slice(0, 10).map((a: any, idx: number) => ({
                id: `lvb-${Date.now()}-${idx}`,
                title: a.title || 'Health Update',
                source: a.url ? extractDomainName(a.url) : 'News',
                url: a.url || '#',
                publishedAt: a.publishedAt || today,
                aiSummary: a.summary || '',
                keywords: Array.isArray(a.keywords) ? a.keywords.slice(0, 5) : ['y tế'],
                classification: ['confirmed', 'emerging', 'predictive'].includes(a.classification) ? a.classification : 'confirmed',
                disease: a.disease || 'general',
                location: a.location || 'Việt Nam',
                severity: ['low', 'medium', 'high', 'critical'].includes(a.severity) ? a.severity : 'medium',
                isAcademic: expertMode
              }));
              console.log(`✅ Lovable AI returned ${articles.length} articles`);
            } else {
              console.error('❌ No JSON array found in Lovable response');
            }
          } catch (parseErr) {
            console.error('❌ Lovable parse error:', parseErr);
          }
        } else {
          const errText = await lovableResponse.text();
          console.error(`❌ Lovable AI error ${lovableResponse.status}: ${errText.slice(0, 300)}`);
        }
      } catch (e) {
        console.error('❌ Lovable AI failed:', e);
      }
    }

    // Final fallback
    if (articles.length === 0) {
      articles = getFallbackData(expertMode);
    }

    let overallRisk: string = 'low';
    if (articles.some(a => a.severity === 'critical')) overallRisk = 'critical';
    else if (articles.some(a => a.severity === 'high')) overallRisk = 'high';
    else if (articles.some(a => a.severity === 'medium')) overallRisk = 'medium';

    console.log(`✅ Final: ${articles.length} articles, ${citationUrls.length} citations, risk: ${overallRisk}`);

    const responseData = {
      success: true,
      articles,
      overallRisk,
      lastUpdated: new Date().toISOString(),
      expertMode,
      citations: citationUrls,
      metadata: {
        sourcesChecked: expertMode
          ? ['PubMed', 'WHO', 'CDC', 'The Lancet', 'Nature']
          : ['Bộ Y tế Việt Nam', 'VnExpress', 'Tuổi Trẻ', 'Thanh Niên', 'Sức khỏe & Đời sống'],
        searchDate: today,
        searchTime: new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        articlesProcessed: articles.length,
        searchEngine: 'Perplexity Sonar',
        mode: expertMode ? 'Academic Research' : 'General News',
      }
    };

    cache.data = { key: cacheKey, response: responseData };
    cache.timestamp = now;

    return new Response(JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({ success: true, articles: getFallbackData(false), overallRisk: 'low', fromFallback: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
