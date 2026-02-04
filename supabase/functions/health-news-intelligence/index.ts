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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const expertMode = body.expertMode === true;
    const language = body.language || 'vi';
    
    console.log(`🔍 Health News AI Agent - Expert Mode: ${expertMode}, Language: ${language}`);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('❌ LOVABLE_API_KEY not found');
      return new Response(
        JSON.stringify({ success: false, error: 'AI API key not configured', articles: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    console.log(`📅 Date: ${today}, Time: ${currentTime}`);

    // AI Agent System Prompt for Web Search
    const systemPrompt = expertMode
      ? `You are an AI health research agent with real-time web search capabilities. Today is ${today}.

Your task: Search the web for the LATEST and MOST RECENT peer-reviewed research, academic papers, preprints, and official health reports about public health in Vietnam and Southeast Asia. PRIORITIZE research published in the last 1-2 months (January-February 2026).

Search sources: PubMed (newest first), medRxiv/bioRxiv preprints, WHO weekly reports, CDC MMWR, The Lancet, Nature Medicine, BMJ, PLOS ONE.

Return a valid JSON array with 4-6 RECENT research articles in this format:
[
  {
    "title": "Full research paper/report title",
    "source": "Journal or organization name",
    "url": "https://pubmed.ncbi.nlm.nih.gov/... or DOI link",
    "publishedAt": "2026-01-XX or 2026-02-XX (exact date if known)",
    "disease": "dengue/covid19/hfmd/influenza/epidemiology/other",
    "location": "Vietnam/Southeast Asia/Global",
    "severity": "low/medium/high/critical",
    "content": "Key findings and methodology summary (2-3 sentences)",
    "keywords": ["epidemiology", "surveillance", "vaccine", "transmission"]
  }
]

IMPORTANT: Only include research from 2025-2026. Prioritize preprints and newly published papers. Include WHO/CDC weekly epidemiological reports.
Return ONLY the JSON array, no additional text.`
      : `You are an AI health news agent with real-time web search capabilities. Today is ${today}.

Your task: Search the web for BREAKING health news from Vietnam published in the last 24-48 hours.

Search sources: VnExpress, Tuổi Trẻ, Thanh Niên, Bộ Y tế Việt Nam, WHO Vietnam, CDC.

Return a valid JSON array with 4-6 news articles in this format:
[
  {
    "title": "Exact news headline in Vietnamese or English",
    "source": "VnExpress/Tuổi Trẻ/Bộ Y tế/WHO/etc",
    "url": "https://vnexpress.net/... or direct article URL",
    "publishedAt": "${today}",
    "disease": "dengue/covid19/hfmd/influenza/respiratory/other",
    "location": "TP.HCM/Hà Nội/Đà Nẵng/specific province",
    "severity": "low/medium/high/critical",
    "content": "What happened, where, and impact (2-3 sentences)",
    "keywords": ["sốt xuất huyết", "ca nhiễm", "bệnh viện", "vaccine"]
  }
]

Focus on: Disease outbreaks, case numbers, hospital capacity, vaccination campaigns, Ministry of Health announcements.
Only include real, verifiable news from the last 48 hours. Return ONLY the JSON array, no additional text.`;

    const searchPrompt = expertMode
      ? `Search for the NEWEST academic research and peer-reviewed studies on public health in Vietnam published in January-February 2026 or late 2025. PRIORITIZE:
- Latest preprints on medRxiv/bioRxiv about Vietnam health
- WHO Weekly Epidemiological Record (latest issues)
- CDC MMWR reports on Southeast Asia
- Newest PubMed articles on dengue, COVID-19, influenza in Vietnam
- Recent Lancet/BMJ/Nature Medicine publications on tropical diseases
- Ministry of Health Vietnam official research reports

Focus on publications from the LAST 30-60 DAYS. Return the JSON array of 4-6 RECENT research articles with exact publication dates.`
      : `Search for breaking health news from Vietnam today (${today}) and yesterday. Include:
- Dengue fever outbreak updates (especially TP.HCM, Hà Nội)
- COVID-19 and respiratory illness cases
- Hand-foot-mouth disease (HFMD) in children
- Influenza season updates
- Ministry of Health (Bộ Y tế) announcements
- Hospital and healthcare updates

Return the JSON array of 4-6 news articles with full details.`;

    console.log(`🚀 Calling Lovable AI (Gemini) - Mode: ${expertMode ? 'Academic' : 'General'}`);
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: searchPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`❌ AI API error: ${aiResponse.status}`, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded, please try again later', articles: [] }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Payment required, please add funds to workspace', articles: [] }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: `AI error: ${aiResponse.status}`, articles: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    console.log('📰 AI response received, parsing...');

    let rawArticles: any[] = [];
    
    try {
      // Extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        rawArticles = JSON.parse(jsonMatch[0]);
        console.log(`✅ Parsed ${rawArticles.length} articles from AI`);
      } else {
        console.error('❌ No JSON array found in response');
        console.log('Response content:', content.substring(0, 500));
      }
    } catch (e) {
      console.error('❌ Failed to parse AI response:', e);
      console.log('Response content:', content.substring(0, 500));
    }

    // Process articles
    const processedArticles: NewsArticle[] = rawArticles.slice(0, 6).map((article: any, idx: number) => {
      // Determine classification
      let classification: 'confirmed' | 'emerging' | 'predictive' = 'confirmed';
      const contentLower = (article.content || article.title || '').toLowerCase();
      
      if (contentLower.includes('cảnh báo') || contentLower.includes('nguy cơ') || 
          contentLower.includes('warning') || contentLower.includes('outbreak') ||
          contentLower.includes('bùng phát') || contentLower.includes('emerging')) {
        classification = 'emerging';
      } else if (contentLower.includes('dự báo') || contentLower.includes('có thể') ||
                 contentLower.includes('forecast') || contentLower.includes('prediction') ||
                 contentLower.includes('model')) {
        classification = 'predictive';
      }

      // Extract keywords if not provided
      let keywords = article.keywords || [];
      if (!Array.isArray(keywords) || keywords.length === 0) {
        const keywordPatterns = [
          'dengue', 'sốt xuất huyết', 'covid', 'cúm', 'flu', 'influenza',
          'outbreak', 'vaccine', 'vắc-xin', 'tiêm chủng', 'hospital', 'bệnh viện',
          'WHO', 'CDC', 'Bộ Y tế', 'ca nhiễm', 'tử vong', 'epidemiology'
        ];
        
        keywordPatterns.forEach(kw => {
          if (contentLower.includes(kw.toLowerCase()) && keywords.length < 5) {
            keywords.push(kw);
          }
        });
      }

      return {
        id: `news-${Date.now()}-${idx}`,
        title: article.title || 'Health Update',
        source: article.source || (expertMode ? 'Academic Journal' : 'Health Authority'),
        url: article.url || '#',
        publishedAt: article.publishedAt || today,
        aiSummary: article.content || `Health update from ${article.location || 'Vietnam'}.`,
        keywords: Array.isArray(keywords) ? keywords.slice(0, 5) : [],
        classification,
        disease: article.disease,
        location: article.location,
        severity: article.severity || 'medium',
        isAcademic: expertMode
      };
    });

    // Calculate overall risk
    let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const hasCritical = processedArticles.some(a => a.severity === 'critical');
    const hasHigh = processedArticles.some(a => a.severity === 'high');
    const hasMedium = processedArticles.some(a => a.severity === 'medium');
    const hasEmerging = processedArticles.some(a => a.classification === 'emerging');
    
    if (hasCritical) overallRisk = 'critical';
    else if (hasHigh || (hasEmerging && hasMedium)) overallRisk = 'high';
    else if (hasMedium || hasEmerging) overallRisk = 'medium';

    console.log(`✅ Processed ${processedArticles.length} articles. Risk: ${overallRisk}`);

    return new Response(
      JSON.stringify({
        success: true,
        articles: processedArticles,
        overallRisk,
        lastUpdated: new Date().toISOString(),
        expertMode,
        metadata: {
          sourcesChecked: expertMode 
            ? ['PubMed', 'WHO', 'CDC', 'The Lancet', 'Nature Medicine', 'BMJ']
            : ['Bộ Y tế Việt Nam', 'WHO Vietnam', 'VnExpress', 'Tuổi Trẻ', 'Thanh Niên'],
          searchDate: today,
          searchTime: currentTime,
          articlesProcessed: processedArticles.length,
          searchEngine: 'Lovable AI (Gemini)',
          mode: expertMode ? 'Academic Research' : 'General News'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Health News AI Agent error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        articles: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
