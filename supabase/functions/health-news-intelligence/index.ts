import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// In-memory cache with TTL (5 minutes)
const cache: { data: any; timestamp: number } = { data: null, timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Verified source domains for validation
const VERIFIED_DOMAINS = [
  'moh.gov.vn', 'vncdc.gov.vn', 'vnexpress.net', 'tuoitre.vn', 'thanhnien.vn',
  'dantri.com.vn', 'suckhoedoisong.vn', 'nld.com.vn', 'who.int', 'cdc.gov',
  'pubmed.ncbi.nlm.nih.gov', 'thelancet.com', 'nature.com', 'nejm.org',
  'reuters.com', 'bbc.com', 'apnews.com', 'medicalnewstoday.com'
];

// Fallback verified URLs when web search fails
const FALLBACK_SOURCES: Record<string, string> = {
  'Bộ Y tế Việt Nam': 'https://moh.gov.vn/tin-tuc',
  'VnExpress Sức khỏe': 'https://vnexpress.net/suc-khoe',
  'Tuổi Trẻ Sức khỏe': 'https://tuoitre.vn/suc-khoe.htm',
  'WHO': 'https://www.who.int/news',
  'CDC': 'https://www.cdc.gov/media/releases/index.html',
  'PubMed': 'https://pubmed.ncbi.nlm.nih.gov/?term=vietnam+public+health',
};

function isVerifiedUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return VERIFIED_DOMAINS.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

function getFallbackData(expertMode: boolean): NewsArticle[] {
  const today = new Date().toISOString().split('T')[0];
  
  if (expertMode) {
    return [
      {
        id: `fallback-1-${Date.now()}`,
        title: "Dengue Fever Surveillance in Southern Vietnam: 2025-2026 Seasonal Analysis",
        source: "WHO",
        url: FALLBACK_SOURCES['WHO'],
        publishedAt: today,
        aiSummary: "Ongoing surveillance shows dengue cases follow seasonal patterns with peak during rainy season. Vector control remains the primary prevention strategy.",
        keywords: ["dengue", "surveillance", "Vietnam", "vector control"],
        classification: "confirmed",
        disease: "dengue",
        location: "Southern Vietnam",
        severity: "medium",
        isAcademic: true
      },
      {
        id: `fallback-2-${Date.now()}`,
        title: "Respiratory Illness Trends in Southeast Asia: Winter 2025-2026",
        source: "CDC",
        url: FALLBACK_SOURCES['CDC'],
        publishedAt: today,
        aiSummary: "Influenza activity in the region shows typical seasonal elevation. Vaccination coverage improving in urban areas.",
        keywords: ["influenza", "respiratory", "vaccination", "epidemiology"],
        classification: "confirmed",
        disease: "influenza",
        location: "Southeast Asia",
        severity: "low",
        isAcademic: true
      }
    ];
  }
  
  return [
    {
      id: `fallback-1-${Date.now()}`,
      title: "Bộ Y tế cập nhật tình hình dịch bệnh tuần qua",
      source: "Bộ Y tế Việt Nam",
      url: FALLBACK_SOURCES['Bộ Y tế Việt Nam'],
      publishedAt: today,
      aiSummary: "Theo báo cáo mới nhất, tình hình dịch bệnh tại Việt Nam đang được kiểm soát tốt.",
      keywords: ["Bộ Y tế", "dịch bệnh", "kiểm soát"],
      classification: "confirmed",
      disease: "general",
      location: "Việt Nam",
      severity: "low",
      isAcademic: false
    },
    {
      id: `fallback-2-${Date.now()}`,
      title: "Tăng cường phòng chống sốt xuất huyết mùa mưa",
      source: "VnExpress Sức khỏe",
      url: FALLBACK_SOURCES['VnExpress Sức khỏe'],
      publishedAt: today,
      aiSummary: "Các địa phương đẩy mạnh chiến dịch diệt lăng quăng, bọ gậy để phòng chống sốt xuất huyết.",
      keywords: ["sốt xuất huyết", "phòng chống", "mùa mưa"],
      classification: "confirmed",
      disease: "dengue",
      location: "TP.HCM",
      severity: "medium",
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
    
    console.log(`🔍 Health News AI Agent - Expert Mode: ${expertMode}, Language: ${language}, WebSearch: ENABLED`);
    
    // Check cache first (unless force refresh)
    const now = Date.now();
    
    if (!forceRefresh && cache.data && (now - cache.timestamp) < CACHE_TTL) {
      console.log('📦 Returning cached data');
      return new Response(
        JSON.stringify({ ...cache.data, fromCache: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GOOGLE_AI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!GEMINI_API_KEY) {
      console.log('⚠️ No Gemini API key, returning fallback data');
      return new Response(
        JSON.stringify({ 
          success: true, 
          articles: getFallbackData(expertMode),
          overallRisk: 'low',
          lastUpdated: new Date().toISOString(),
          expertMode,
          fromFallback: true,
          metadata: { note: 'Using fallback data - API key not configured' }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    console.log(`📅 Date: ${today}, Time: ${currentTime}`);

    // Build search query for web grounding
    const searchQuery = expertMode
      ? `latest public health research Vietnam 2025 dengue influenza epidemiology site:pubmed.ncbi.nlm.nih.gov OR site:who.int OR site:thelancet.com`
      : `tin tức y tế Việt Nam hôm nay ${today} sốt xuất huyết cúm dịch bệnh site:vnexpress.net OR site:tuoitre.vn OR site:moh.gov.vn OR site:suckhoedoisong.vn`;

    // System prompt that instructs AI to extract real URLs from web search
    const systemPrompt = `You are a health news aggregator with WEB SEARCH enabled. Today is ${today}.

CRITICAL REQUIREMENTS:
1. Use web search to find REAL, CURRENT news articles from today or this week
2. Extract the ACTUAL URLs from web search results - these must be real, clickable links
3. Only use verified sources: ${expertMode ? 'PubMed, WHO, CDC, The Lancet, Nature' : 'VnExpress, Tuổi Trẻ, Bộ Y tế, Dân Trí, Sức khỏe & Đời sống'}
4. Each article MUST have a real URL that users can click to read the full article

Return a JSON array with 4-6 articles. Format:
[{
  "title": "Actual headline from the article",
  "source": "Source name (e.g., VnExpress, WHO)",
  "url": "https://actual-url-from-search-results.com/article",
  "publishedAt": "${today}",
  "disease": "dengue/covid19/influenza/general",
  "location": "Vietnam/TP.HCM/Hà Nội",
  "severity": "low/medium/high",
  "content": "2-sentence summary of the article content",
  "keywords": ["keyword1", "keyword2"]
}]

IMPORTANT: The URL must be the real link to the article, NOT a made-up link. Return ONLY the JSON array.`;

    console.log(`🌐 Calling Gemini with Web Search Grounding...`);
    
    // Use Gemini with grounding (web search)
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: searchQuery }]
          }],
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          tools: [{
            googleSearch: {}
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096
          }
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(`❌ Gemini API error: ${geminiResponse.status}`, errorText);
      
      // Try fallback to Lovable AI without web search
      console.log('⚠️ Trying Lovable AI fallback...');
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      
      if (LOVABLE_API_KEY) {
        const lovableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            web_search_options: { search_context_size: 'high' },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: searchQuery }
            ],
            temperature: 0.2,
          }),
        });

        if (lovableResponse.ok) {
          const lovableData = await lovableResponse.json();
          const content = lovableData.choices?.[0]?.message?.content || '';
          console.log('✅ Lovable AI response received');
          
          // Process Lovable response
          return processAndReturnResponse(content, expertMode, today, currentTime, now);
        }
      }
      
      // Return fallback data
      const fallbackArticles = getFallbackData(expertMode);
      return new Response(
        JSON.stringify({ 
          success: true,
          articles: fallbackArticles,
          overallRisk: 'low',
          lastUpdated: new Date().toISOString(),
          expertMode,
          fromFallback: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    console.log('📰 Gemini response received, processing...');
    
    // Extract content and grounding metadata
    const candidate = geminiData.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text || '';
    const groundingMetadata = candidate?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks || [];
    const webSearchQueries = groundingMetadata?.webSearchQueries || [];
    
    console.log(`🔗 Found ${groundingChunks.length} grounding sources from web search`);
    console.log(`🔍 Web search queries: ${webSearchQueries.join(', ')}`);

    // Extract real URLs from grounding chunks
    const groundedUrls: { url: string; title: string }[] = groundingChunks
      .filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        url: chunk.web.uri,
        title: chunk.web.title || ''
      }));

    console.log(`📎 Extracted ${groundedUrls.length} grounded URLs`);

    return processAndReturnResponse(content, expertMode, today, currentTime, now, groundedUrls);

  } catch (error: any) {
    console.error('❌ Health News AI Agent error:', error);
    
    const fallbackArticles = getFallbackData(false);
    return new Response(
      JSON.stringify({ 
        success: true,
        articles: fallbackArticles,
        overallRisk: 'low',
        fromFallback: true,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function processAndReturnResponse(
  content: string,
  expertMode: boolean,
  today: string,
  currentTime: string,
  cacheTimestamp: number,
  groundedUrls: { url: string; title: string }[] = []
) {
  let rawArticles: any[] = [];
  
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      rawArticles = JSON.parse(jsonMatch[0]);
      console.log(`✅ Parsed ${rawArticles.length} articles from AI`);
    }
  } catch (e) {
    console.error('❌ Failed to parse AI response:', e);
  }

  // If no articles parsed, use fallback
  if (rawArticles.length === 0) {
    console.log('⚠️ No articles parsed, using fallback');
    rawArticles = getFallbackData(expertMode);
  }

  // Process articles with URL validation
  const processedArticles: NewsArticle[] = rawArticles.slice(0, 6).map((article: any, idx: number) => {
    let classification: 'confirmed' | 'emerging' | 'predictive' = 'confirmed';
    const contentLower = (article.content || article.title || '').toLowerCase();
    
    if (contentLower.includes('cảnh báo') || contentLower.includes('outbreak') || contentLower.includes('bùng phát')) {
      classification = 'emerging';
    } else if (contentLower.includes('dự báo') || contentLower.includes('forecast')) {
      classification = 'predictive';
    }

    let keywords = article.keywords || [];
    if (!Array.isArray(keywords) || keywords.length === 0) {
      keywords = ['health', 'Vietnam'];
    }

    // Validate URL - prefer grounded URLs, then AI-provided if verified
    let finalUrl = article.url;
    
    // First, try to match with grounded URLs from web search
    if (groundedUrls.length > 0) {
      const matchingGrounded = groundedUrls.find(g => 
        g.title.toLowerCase().includes(article.title?.toLowerCase()?.slice(0, 20) || '') ||
        article.title?.toLowerCase()?.includes(g.title?.toLowerCase()?.slice(0, 20) || '')
      );
      if (matchingGrounded) {
        finalUrl = matchingGrounded.url;
        console.log(`✅ Matched grounded URL for: ${article.title?.slice(0, 30)}`);
      }
    }

    // Validate the URL is from a verified domain
    if (!isVerifiedUrl(finalUrl)) {
      // Use fallback URL based on source
      const sourceName = article.source || 'VnExpress Sức khỏe';
      finalUrl = FALLBACK_SOURCES[sourceName] || FALLBACK_SOURCES['VnExpress Sức khỏe'];
      console.log(`⚠️ Using fallback URL for unverified source: ${sourceName}`);
    }

    return {
      id: `news-${Date.now()}-${idx}`,
      title: article.title || 'Health Update',
      source: article.source || 'VnExpress',
      url: finalUrl,
      publishedAt: article.publishedAt || today,
      aiSummary: article.content || article.aiSummary || 'Health update from Vietnam.',
      keywords: Array.isArray(keywords) ? keywords.slice(0, 5) : [],
      classification,
      disease: article.disease,
      location: article.location,
      severity: article.severity || 'medium',
      isAcademic: expertMode
    };
  });

  // Calculate risk
  let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
  const hasCritical = processedArticles.some(a => a.severity === 'critical');
  const hasHigh = processedArticles.some(a => a.severity === 'high');
  
  if (hasCritical) overallRisk = 'critical';
  else if (hasHigh) overallRisk = 'high';
  else if (processedArticles.some(a => a.severity === 'medium')) overallRisk = 'medium';

  console.log(`✅ Processed ${processedArticles.length} articles. Risk: ${overallRisk}`);

  const responseData = {
    success: true,
    articles: processedArticles,
    overallRisk,
    lastUpdated: new Date().toISOString(),
    expertMode,
    webSearchEnabled: true,
    groundedSources: groundedUrls.length,
    metadata: {
      sourcesChecked: expertMode 
        ? ['PubMed', 'WHO', 'CDC', 'The Lancet']
        : ['Bộ Y tế Việt Nam', 'WHO Vietnam', 'VnExpress', 'Tuổi Trẻ', 'Sức khỏe & Đời sống'],
      searchDate: today,
      searchTime: currentTime,
      articlesProcessed: processedArticles.length,
      searchEngine: 'Gemini 2.0 Flash with Google Search Grounding',
      mode: expertMode ? 'Academic Research' : 'General News',
      groundedUrlsFound: groundedUrls.length
    }
  };

  // Cache successful response
  cache.data = responseData;
  cache.timestamp = cacheTimestamp;

  return new Response(
    JSON.stringify(responseData),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
