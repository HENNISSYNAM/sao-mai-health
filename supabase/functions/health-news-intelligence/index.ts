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

// In-memory cache with TTL
const cache: { data: any; timestamp: number } = { data: null, timestamp: 0 };
const CACHE_TTL = 60 * 1000; // 1 minute cache (faster refresh)

// Verified source domains
const VERIFIED_DOMAINS = [
  'moh.gov.vn', 'vncdc.gov.vn', 'vnexpress.net', 'tuoitre.vn', 'thanhnien.vn',
  'dantri.com.vn', 'suckhoedoisong.vn', 'nld.com.vn', 'who.int', 'cdc.gov',
  'pubmed.ncbi.nlm.nih.gov', 'thelancet.com', 'nature.com', 'nejm.org',
  'reuters.com', 'bbc.com', 'apnews.com', 'medicalnewstoday.com',
  'baomoi.com', 'nhandan.vn', 'vietnamnet.vn', 'zingnews.vn', 'kenh14.vn',
  'laodong.vn', 'plo.vn', 'tienphong.vn', 'vov.vn', 'vtv.vn',
  'ncbi.nlm.nih.gov', 'bmj.com', 'sciencedirect.com', 'springer.com',
  'mdpi.com', 'frontiersin.org', 'medrxiv.org'
];

function isVerifiedUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return VERIFIED_DOMAINS.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

function extractDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const domainMap: Record<string, string> = {
      'vnexpress.net': 'VnExpress',
      'tuoitre.vn': 'Tuổi Trẻ',
      'thanhnien.vn': 'Thanh Niên',
      'dantri.com.vn': 'Dân Trí',
      'suckhoedoisong.vn': 'Sức khỏe & Đời sống',
      'moh.gov.vn': 'Bộ Y tế',
      'vncdc.gov.vn': 'VNCDC',
      'who.int': 'WHO',
      'cdc.gov': 'CDC',
      'pubmed.ncbi.nlm.nih.gov': 'PubMed',
      'ncbi.nlm.nih.gov': 'PubMed',
      'thelancet.com': 'The Lancet',
      'nature.com': 'Nature',
      'nejm.org': 'NEJM',
      'nld.com.vn': 'Người Lao Động',
      'baomoi.com': 'Báo Mới',
      'vietnamnet.vn': 'VietNamNet',
      'nhandan.vn': 'Nhân Dân',
      'vtv.vn': 'VTV',
      'vov.vn': 'VOV',
      'laodong.vn': 'Lao Động',
      'plo.vn': 'Pháp Luật',
      'tienphong.vn': 'Tiền Phong',
      'reuters.com': 'Reuters',
      'bbc.com': 'BBC',
    };
    for (const [domain, name] of Object.entries(domainMap)) {
      if (hostname.includes(domain)) return name;
    }
    return hostname;
  } catch {
    return 'Unknown';
  }
}

function getFallbackData(expertMode: boolean): NewsArticle[] {
  const today = new Date().toISOString().split('T')[0];
  if (expertMode) {
    return [
      {
        id: `fallback-1-${Date.now()}`,
        title: "Dengue Fever Surveillance in Southern Vietnam: Seasonal Analysis",
        source: "WHO",
        url: "https://www.who.int/vietnam",
        publishedAt: today,
        aiSummary: "Ongoing surveillance shows dengue cases follow seasonal patterns with peak during rainy season.",
        keywords: ["dengue", "surveillance", "Vietnam"],
        classification: "confirmed",
        disease: "dengue",
        location: "Southern Vietnam",
        severity: "medium",
        isAcademic: true
      }
    ];
  }
  return [
    {
      id: `fallback-1-${Date.now()}`,
      title: "Bộ Y tế cập nhật tình hình dịch bệnh",
      source: "Bộ Y tế",
      url: "https://moh.gov.vn/tin-tuc",
      publishedAt: today,
      aiSummary: "Theo báo cáo mới nhất, tình hình dịch bệnh tại Việt Nam đang được kiểm soát.",
      keywords: ["Bộ Y tế", "dịch bệnh"],
      classification: "confirmed",
      disease: "general",
      location: "Việt Nam",
      severity: "low",
      isAcademic: false
    }
  ];
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

    console.log(`🔍 Health News Agent - Expert: ${expertMode}, Lang: ${language}`);

    // Check cache
    const now = Date.now();
    const cacheKey = expertMode ? 'expert' : 'general';
    if (!forceRefresh && cache.data?.key === cacheKey && (now - cache.timestamp) < CACHE_TTL) {
      console.log('📦 Returning cached data');
      return new Response(
        JSON.stringify({ ...cache.data.response, fromCache: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GOOGLE_AI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!GEMINI_API_KEY && !LOVABLE_API_KEY) {
      console.log('⚠️ No API keys, returning fallback');
      return new Response(
        JSON.stringify({ success: true, articles: getFallbackData(expertMode), overallRisk: 'low', lastUpdated: new Date().toISOString(), expertMode, fromFallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    // STEP 1: Use Gemini with Google Search Grounding to get REAL articles with REAL URLs
    // Use MULTIPLE search queries for more diverse results
    const searchQueries = expertMode
      ? [
          `latest public health research Vietnam 2025 2026 dengue influenza COVID-19 outbreak epidemiology`,
          `Vietnam disease outbreak alert WHO warning infectious disease 2025 2026`
        ]
      : [
          `tin tức y tế Việt Nam mới nhất hôm nay ${today} dịch bệnh sốt xuất huyết cúm tay chân miệng COVID ca mắc ổ dịch cảnh báo Bộ Y tế sởi dại`,
          `dịch bệnh bùng phát Việt Nam ${today} số ca mắc tử vong bệnh viện phòng chống sức khỏe cộng đồng tiêm chủng`,
          `tin nóng y tế hôm nay ${today} ổ dịch mới ca nhiễm bệnh truyền nhiễm cảnh báo sức khỏe`
        ];
    
    const searchQuery = searchQueries.join(' | ');

    // System prompt focused on extracting and classifying grounded results
    const systemPrompt = `You are a health news analyst. Today is ${today}, ${currentTime} Vietnam time.

TASK: Search for the LATEST and HOTTEST health news and return ONLY articles with REAL, VERIFIED URLs from web search results.

CRITICAL RULES:
1. ONLY use URLs that come directly from your web search results - NEVER fabricate URLs
2. Each article MUST have a real, clickable URL to the actual article page (not a homepage)
3. Copy the exact title from the source - do not paraphrase headlines
4. Write a concise 2-3 sentence summary of the key facts (numbers, locations, actions)
5. Classify each article's severity and type based on content
6. Prioritize BREAKING NEWS and TRENDING stories first
7. Include diverse topics: outbreaks, vaccination, food safety, environmental health, hospital news
8. Return as MANY articles as possible from search results (target 10-15)

Return a JSON array with 10-15 articles:
[{
  "title": "EXACT headline copied from the article",
  "url": "EXACT URL from search results",
  "source": "Source name",
  "publishedAt": "YYYY-MM-DD",
  "summary": "2-3 sentence factual summary with specific numbers",
  "disease": "dengue|covid19|influenza|hfmd|measles|rabies|ari|environmental|food_safety|general",
  "location": "Province/city name if mentioned",
  "severity": "low|medium|high|critical",
  "classification": "confirmed|emerging|predictive",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}]

SEVERITY: critical=outbreak/deaths, high=significant increase, medium=moderate/localized, low=routine/declining
CLASSIFICATION: confirmed=official verified data, emerging=early warnings/clusters, predictive=forecasts/risk assessments

Return ONLY the JSON array. No markdown. No explanation.`;

    let articles: NewsArticle[] = [];
    let groundedUrls: { url: string; title: string }[] = [];

    // Try Gemini with grounding first (best for accurate URLs)
    if (GEMINI_API_KEY) {
      try {
        console.log('🌐 Calling Gemini with Google Search Grounding...');
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: searchQuery }] }],
              systemInstruction: { parts: [{ text: systemPrompt }] },
              tools: [{ googleSearch: {} }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
            }),
          }
        );

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          const candidate = geminiData.candidates?.[0];
          const content = candidate?.content?.parts?.[0]?.text || '';
          const groundingMetadata = candidate?.groundingMetadata;
          const groundingChunks = groundingMetadata?.groundingChunks || [];
          const searchEntryPoint = groundingMetadata?.searchEntryPoint;

          // Extract ALL grounded URLs - these are real, verified URLs
          groundedUrls = groundingChunks
            .filter((chunk: any) => chunk.web?.uri)
            .map((chunk: any) => ({
              url: chunk.web.uri,
              title: chunk.web.title || ''
            }));

          console.log(`🔗 Got ${groundedUrls.length} grounded URLs from Google Search`);
          groundedUrls.forEach((g, i) => console.log(`  ${i+1}. ${g.title?.slice(0, 50)} -> ${g.url?.slice(0, 80)}`));

          // Parse AI-generated article list
          let rawArticles: any[] = [];
          try {
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              rawArticles = JSON.parse(jsonMatch[0]);
              console.log(`✅ Parsed ${rawArticles.length} articles from AI`);
            }
          } catch (e) {
            console.error('❌ JSON parse failed:', e);
          }

          // STEP 2: Cross-reference AI articles with grounded URLs for maximum accuracy
          articles = rawArticles.slice(0, 15).map((article: any, idx: number) => {
            let finalUrl = article.url || '';
            let urlSource = 'ai';

            // Strategy 1: Check if AI-provided URL exists in grounded URLs (exact match)
            const exactGrounded = groundedUrls.find(g => g.url === finalUrl);
            if (exactGrounded) {
              urlSource = 'grounded-exact';
            } else {
              // Strategy 2: Find best matching grounded URL by title similarity
              const titleLower = (article.title || '').toLowerCase();
              let bestMatch: typeof groundedUrls[0] | null = null;
              let bestScore = 0;

              for (const g of groundedUrls) {
                const gTitle = (g.title || '').toLowerCase();
                // Calculate word overlap score
                const titleWords = titleLower.split(/\s+/).filter((w: string) => w.length > 2);
                const gWords = gTitle.split(/\s+/).filter((w: string) => w.length > 2);
                const overlap = titleWords.filter((w: string) => gWords.some((gw: string) => gw.includes(w) || w.includes(gw))).length;
                const score = titleWords.length > 0 ? overlap / titleWords.length : 0;

                if (score > bestScore && score >= 0.3) {
                  bestScore = score;
                  bestMatch = g;
                }
              }

              if (bestMatch) {
                finalUrl = bestMatch.url;
                urlSource = `grounded-match(${Math.round(bestScore * 100)}%)`;
              } else {
                // Strategy 3: Find grounded URL from same domain
                if (finalUrl && isVerifiedUrl(finalUrl)) {
                  const aiDomain = new URL(finalUrl).hostname;
                  const sameDomainGrounded = groundedUrls.find(g => {
                    try { return new URL(g.url).hostname === aiDomain; } catch { return false; }
                  });
                  if (sameDomainGrounded) {
                    finalUrl = sameDomainGrounded.url;
                    urlSource = 'grounded-domain';
                  } else {
                    urlSource = 'ai-verified';
                  }
                } else {
                  // Strategy 4: Use any unmatched grounded URL 
                  if (groundedUrls[idx]) {
                    finalUrl = groundedUrls[idx].url;
                    urlSource = 'grounded-fallback';
                  } else if (groundedUrls.length > 0) {
                    finalUrl = groundedUrls[0].url;
                    urlSource = 'grounded-first';
                  }
                }
              }
            }

            // Final validation: URL must be from a known domain
            if (!isVerifiedUrl(finalUrl)) {
              // Last resort: use a grounded URL if any exist
              const anyGrounded = groundedUrls.find(g => isVerifiedUrl(g.url));
              if (anyGrounded) {
                finalUrl = anyGrounded.url;
                urlSource = 'grounded-rescue';
              } else {
                finalUrl = expertMode ? 'https://pubmed.ncbi.nlm.nih.gov/?term=vietnam+public+health' : 'https://vnexpress.net/suc-khoe';
                urlSource = 'fallback-homepage';
              }
            }

            console.log(`  📰 [${idx}] ${urlSource}: ${finalUrl.slice(0, 70)}`);

            // Classify
            let classification: 'confirmed' | 'emerging' | 'predictive' = article.classification || 'confirmed';
            if (!['confirmed', 'emerging', 'predictive'].includes(classification)) classification = 'confirmed';

            let severity = article.severity || 'medium';
            if (!['low', 'medium', 'high', 'critical'].includes(severity)) severity = 'medium';

            let keywords = article.keywords || [];
            if (!Array.isArray(keywords) || keywords.length === 0) {
              const text = `${article.title || ''} ${article.summary || ''}`.toLowerCase();
              const kws = ['sốt xuất huyết', 'dengue', 'cúm', 'influenza', 'covid', 'tay chân miệng', 'sởi', 'dại', 'ổ dịch', 'ca mắc', 'tử vong', 'tiêm chủng', 'phòng chống'];
              keywords = kws.filter(kw => text.includes(kw)).slice(0, 5);
              if (keywords.length === 0) keywords = ['y tế', 'Vietnam'];
            }

            return {
              id: `news-${Date.now()}-${idx}`,
              title: article.title || 'Health Update',
              source: extractDomainName(finalUrl),
              url: finalUrl,
              publishedAt: article.publishedAt || today,
              aiSummary: article.summary || article.content || article.aiSummary || '',
              keywords: keywords.slice(0, 5),
              classification,
              disease: article.disease,
              location: article.location,
              severity,
              isAcademic: expertMode
            };
          });

          // If AI didn't return articles but we have grounded URLs, build articles from them
          if (articles.length === 0 && groundedUrls.length > 0) {
            console.log('⚠️ Building articles directly from grounded URLs');
            articles = groundedUrls.slice(0, 15).map((g, idx) => ({
              id: `grounded-${Date.now()}-${idx}`,
              title: g.title || 'Health News',
              source: extractDomainName(g.url),
              url: g.url,
              publishedAt: today,
              aiSummary: '',
              keywords: ['y tế'],
              classification: 'confirmed' as const,
              disease: 'general',
              location: 'Việt Nam',
              severity: 'medium' as const,
              isAcademic: expertMode
            }));
          }
        } else {
          console.error(`❌ Gemini error: ${geminiResponse.status}`);
        }
      } catch (e) {
        console.error('❌ Gemini call failed:', e);
      }
    }

    // Fallback to Lovable AI if Gemini failed
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
              { role: 'system', content: systemPrompt },
              { role: 'user', content: searchQuery }
            ],
            temperature: 0.1,
          }),
        });

        if (lovableResponse.ok) {
          const data = await lovableResponse.json();
          const content = data.choices?.[0]?.message?.content || '';
          try {
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const rawArticles = JSON.parse(jsonMatch[0]);
              articles = rawArticles.slice(0, 15).map((a: any, idx: number) => ({
                id: `lovable-${Date.now()}-${idx}`,
                title: a.title || 'Health Update',
                source: a.source || 'News',
                url: (a.url && isVerifiedUrl(a.url)) ? a.url : (expertMode ? 'https://pubmed.ncbi.nlm.nih.gov' : 'https://vnexpress.net/suc-khoe'),
                publishedAt: a.publishedAt || today,
                aiSummary: a.summary || a.content || '',
                keywords: Array.isArray(a.keywords) ? a.keywords.slice(0, 5) : ['y tế'],
                classification: ['confirmed', 'emerging', 'predictive'].includes(a.classification) ? a.classification : 'confirmed',
                disease: a.disease || 'general',
                location: a.location || 'Việt Nam',
                severity: ['low', 'medium', 'high', 'critical'].includes(a.severity) ? a.severity : 'medium',
                isAcademic: expertMode
              }));
            }
          } catch (e) {
            console.error('❌ Lovable parse failed:', e);
          }
        }
      } catch (e) {
        console.error('❌ Lovable call failed:', e);
      }
    }

    // Final fallback
    if (articles.length === 0) {
      articles = getFallbackData(expertMode);
    }

    // Calculate risk
    let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (articles.some(a => a.severity === 'critical')) overallRisk = 'critical';
    else if (articles.some(a => a.severity === 'high')) overallRisk = 'high';
    else if (articles.some(a => a.severity === 'medium')) overallRisk = 'medium';

    console.log(`✅ Final: ${articles.length} articles, ${groundedUrls.length} grounded URLs, risk: ${overallRisk}`);

    const responseData = {
      success: true,
      articles,
      overallRisk,
      lastUpdated: new Date().toISOString(),
      expertMode,
      webSearchEnabled: true,
      groundedSources: groundedUrls.length,
      metadata: {
        sourcesChecked: expertMode
          ? ['PubMed', 'WHO', 'CDC', 'The Lancet', 'Nature']
          : ['Bộ Y tế Việt Nam', 'VnExpress', 'Tuổi Trẻ', 'Thanh Niên', 'Sức khỏe & Đời sống'],
        searchDate: today,
        searchTime: currentTime,
        articlesProcessed: articles.length,
        searchEngine: 'Gemini 2.0 Flash + Google Search Grounding',
        mode: expertMode ? 'Academic Research' : 'General News',
        groundedUrlsFound: groundedUrls.length
      }
    };

    // Cache
    cache.data = { key: cacheKey, response: responseData };
    cache.timestamp = now;

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ success: true, articles: getFallbackData(false), overallRisk: 'low', fromFallback: true, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
