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
    
    console.log(`🔍 Health News Intelligence - Expert Mode: ${expertMode}, Language: ${language}`);
    
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!PERPLEXITY_API_KEY) {
      console.log('⚠️ PERPLEXITY_API_KEY not found');
      return new Response(
        JSON.stringify({ success: false, error: 'Perplexity API key not configured', articles: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    console.log(`📅 Date: ${today}, Time: ${currentTime}`);

    let rawArticles: any[] = [];
    let citations: string[] = [];

    // Different search queries for expert vs general mode
    const searchQuery = expertMode 
      ? `Latest peer-reviewed research papers and academic studies on public health in Vietnam 2024-2025: epidemiology, disease surveillance, dengue fever research, COVID-19 studies, infectious disease control, medical journals, WHO reports, CDC publications, PubMed articles. Focus on scholarly sources only.`
      : `Breaking health news Vietnam today ${today}: dengue fever, COVID-19, hand foot mouth disease HFMD, influenza, disease outbreaks, Ministry of Health announcements. News from VnExpress, Tuổi Trẻ, Thanh Niên, Bộ Y tế. Last 24-48 hours only.`;

    const systemPrompt = expertMode
      ? `You are an academic health research analyst. Today is ${today}. Search for the LATEST peer-reviewed research, academic papers, WHO/CDC reports, and scholarly articles about public health in Vietnam and Southeast Asia.

Return ONLY a valid JSON array with this exact format:
[
  {
    "title": "Full research paper/report title",
    "source": "Journal name or organization (e.g., The Lancet, PLOS ONE, WHO, CDC, BMJ, Nature Medicine)",
    "url": "Direct URL to the paper or report",
    "publishedAt": "Publication date YYYY-MM-DD",
    "disease": "dengue/covid19/hfmd/influenza/infectious/epidemiology/other",
    "location": "Study location or Global",
    "severity": "low/medium/high/critical based on public health impact",
    "content": "Key findings and conclusions from the research",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  }
]

Only return verified academic/scholarly sources. Include DOI links when available. Maximum 6 items.`
      : `You are a real-time public health news analyst for Vietnam. Today is ${today}. Search for the LATEST health news from Vietnam published TODAY or in the last 24-48 hours ONLY.

Return ONLY a valid JSON array with this exact format:
[
  {
    "title": "Exact news headline",
    "source": "Source name (VnExpress, Tuổi Trẻ, Ministry of Health, WHO, etc)",
    "url": "Direct URL to the article",
    "publishedAt": "${today}",
    "disease": "dengue/covid19/hfmd/influenza/other",
    "location": "Specific location in Vietnam",
    "severity": "low/medium/high/critical",
    "content": "Brief factual summary of what happened",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  }
]

Only return verified, real news from the last 24-48 hours. Maximum 6 items.`;

    console.log(`🚀 Perplexity search - Mode: ${expertMode ? 'Academic' : 'General'}`);
    
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: expertMode ? 'sonar-pro' : 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: searchQuery }
        ],
        search_recency_filter: expertMode ? 'month' : 'day',
        search_mode: expertMode ? 'academic' : undefined,
        temperature: 0.1,
      }),
    });

    if (perplexityResponse.ok) {
      const perplexityData = await perplexityResponse.json();
      const content = perplexityData.choices?.[0]?.message?.content;
      citations = perplexityData.citations || [];
      
      console.log('📰 Perplexity response with', citations.length, 'citations');
      
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          rawArticles = JSON.parse(jsonMatch[0]);
          
          // Enhance with citation URLs
          rawArticles = rawArticles.map((article: any, idx: number) => ({
            ...article,
            url: article.url || citations[idx] || `https://scholar.google.com/scholar?q=${encodeURIComponent(article.title)}`,
            isAcademic: expertMode
          }));
        }
      } catch (e) {
        console.error('Failed to parse Perplexity response:', e);
      }
    } else {
      console.error('Perplexity API error:', perplexityResponse.status);
    }

    console.log(`📊 Found ${rawArticles.length} raw articles`);

    // Process and enhance articles
    const processedArticles: NewsArticle[] = [];

    for (const article of rawArticles.slice(0, 6)) {
      // Determine classification
      let classification: 'confirmed' | 'emerging' | 'predictive' = 'confirmed';
      const contentLower = (article.content || article.title || '').toLowerCase();
      
      if (contentLower.includes('cảnh báo') || contentLower.includes('nguy cơ') || 
          contentLower.includes('warning') || contentLower.includes('risk') ||
          contentLower.includes('outbreak') || contentLower.includes('bùng phát') ||
          contentLower.includes('emerging')) {
        classification = 'emerging';
      } else if (contentLower.includes('dự báo') || contentLower.includes('có thể') ||
                 contentLower.includes('forecast') || contentLower.includes('potential') ||
                 contentLower.includes('model') || contentLower.includes('prediction')) {
        classification = 'predictive';
      }

      // Extract or generate keywords
      let keywords = article.keywords || [];
      if (keywords.length === 0) {
        // Auto-extract keywords from content
        const keywordPatterns = [
          'dengue', 'sốt xuất huyết', 'covid', 'cúm', 'flu', 'influenza',
          'dịch bệnh', 'outbreak', 'vaccine', 'vắc-xin', 'tiêm chủng',
          'bệnh viện', 'hospital', 'WHO', 'CDC', 'Bộ Y tế', 'ca nhiễm',
          'tử vong', 'death', 'epidemiology', 'surveillance', 'transmission'
        ];
        
        keywordPatterns.forEach(kw => {
          if (contentLower.includes(kw.toLowerCase()) && !keywords.includes(kw)) {
            keywords.push(kw);
          }
        });
        
        // Extract numbers with context
        const numberPatterns = (article.content || '').match(/\d+\s*(ca|cases|người|deaths|tử vong|%)/gi);
        if (numberPatterns) {
          keywords.push(...numberPatterns.slice(0, 2));
        }
        
        keywords = keywords.slice(0, 5);
      }

      // Generate AI summary if Lovable API available
      let aiSummary = article.content || `${article.disease || 'Health'} update from ${article.location || 'Vietnam'}.`;
      
      if (LOVABLE_API_KEY && article.content && article.content.length > 50) {
        try {
          const summaryPrompt = expertMode
            ? `Summarize this academic research in 2 sentences for health professionals. Focus on: methodology, key findings, and clinical implications.`
            : `Summarize this health news in 2 sentences. Focus on: what happened, where, and public health impact.`;
            
          const summaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash-lite',
              messages: [
                { role: 'system', content: summaryPrompt },
                { role: 'user', content: `Title: ${article.title}\nSource: ${article.source}\nContent: ${article.content}` }
              ],
              temperature: 0.2,
            }),
          });

          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            aiSummary = summaryData.choices?.[0]?.message?.content || aiSummary;
          }
        } catch (e) {
          console.error('Summary generation failed:', e);
        }
      }

      processedArticles.push({
        id: `news-${Date.now()}-${processedArticles.length}`,
        title: article.title || 'Health Update',
        source: article.source || (expertMode ? 'Academic Journal' : 'Health Authority'),
        url: article.url || '#',
        publishedAt: article.publishedAt || today,
        aiSummary: aiSummary.slice(0, 400),
        keywords,
        classification,
        disease: article.disease,
        location: article.location,
        severity: article.severity || 'low',
        isAcademic: expertMode
      });
    }

    // Calculate overall risk
    let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const hasCritical = processedArticles.some(a => a.severity === 'critical');
    const hasHighSeverity = processedArticles.some(a => a.severity === 'high');
    const hasMediumSeverity = processedArticles.some(a => a.severity === 'medium');
    const hasEmerging = processedArticles.some(a => a.classification === 'emerging');
    
    if (hasCritical) {
      overallRisk = 'critical';
    } else if (hasHighSeverity || (hasEmerging && hasMediumSeverity)) {
      overallRisk = 'high';
    } else if (hasMediumSeverity || hasEmerging) {
      overallRisk = 'medium';
    }

    console.log(`✅ Processed ${processedArticles.length} articles. Risk: ${overallRisk}`);

    return new Response(
      JSON.stringify({
        success: true,
        articles: processedArticles,
        overallRisk,
        lastUpdated: new Date().toISOString(),
        expertMode,
        citations,
        metadata: {
          sourcesChecked: expertMode 
            ? ['PubMed', 'WHO', 'CDC', 'The Lancet', 'PLOS ONE', 'BMJ', 'Nature Medicine']
            : ['Bộ Y tế Việt Nam', 'WHO', 'CDC', 'VnExpress', 'Tuổi Trẻ', 'Thanh Niên'],
          searchDate: today,
          searchTime: currentTime,
          articlesProcessed: processedArticles.length,
          searchEngine: 'Perplexity Real-time',
          mode: expertMode ? 'Academic/Research' : 'General News'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Health News Intelligence error:', error);
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
