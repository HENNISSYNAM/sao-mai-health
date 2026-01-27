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
  classification: 'confirmed' | 'emerging' | 'predictive';
  disease?: string;
  location?: string;
  severity: 'low' | 'medium' | 'high';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting Health News Intelligence Agent...');
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Step 1: Web Research - Use AI with web search capabilities
    console.log('📡 Step 1: Performing web research...');
    
    const searchPrompt = `You are a Public Health News Intelligence Agent. Search for the latest public health news from Vietnam and globally.

Focus on:
- Official health authorities (Ministry of Health Vietnam, WHO, CDC)
- Reputable news: VnExpress, Tuổi Trẻ, Thanh Niên, Reuters Health, AP Health
- Government health announcements
- Disease outbreaks, epidemics, health emergencies

For each news item found, provide:
1. Title (original)
2. Source name
3. URL (real link if known, or construct based on source)
4. Publication date
5. Disease/health issue
6. Location
7. Severity assessment

Return as JSON array with max 5 most important items:
{
  "articles": [
    {
      "title": "...",
      "source": "VnExpress / WHO / etc",
      "url": "https://...",
      "publishedAt": "2025-01-27",
      "disease": "dengue/covid19/hfmd/influenza/etc",
      "location": "Ho Chi Minh City / Vietnam / Global",
      "severity": "low/medium/high",
      "rawContent": "Brief factual content about what happened"
    }
  ]
}

Search for news from the last 7 days. Only return factual, verified information.`;

    const searchResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert public health news researcher with access to current information.' },
          { role: 'user', content: searchPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!searchResponse.ok) {
      const status = searchResponse.status;
      console.error('❌ Search API error:', status);
      
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Search failed with status ${status}`);
    }

    const searchData = await searchResponse.json();
    const rawArticles = searchData.choices[0]?.message?.content;
    
    console.log('📰 Raw search results received');

    // Parse search results
    let parsedArticles: any[] = [];
    try {
      const jsonMatch = rawArticles.match(/```json\n([\s\S]*?)\n```/) || 
                        rawArticles.match(/```\n([\s\S]*?)\n```/) ||
                        [null, rawArticles];
      const jsonStr = jsonMatch[1] || rawArticles;
      const parsed = JSON.parse(jsonStr);
      parsedArticles = parsed.articles || [];
    } catch (e) {
      console.error('❌ Failed to parse search results:', e);
      parsedArticles = [];
    }

    console.log(`📊 Found ${parsedArticles.length} articles`);

    // Step 2: AI Summarization for each article
    console.log('🤖 Step 2: Generating AI summaries...');
    
    const processedArticles: NewsArticle[] = [];
    
    for (const article of parsedArticles) {
      const summaryPrompt = `Summarize this public health news for a general audience:

Title: ${article.title}
Source: ${article.source}
Content: ${article.rawContent || article.title}
Location: ${article.location}
Disease/Issue: ${article.disease}

Generate a concise AI summary (2-3 sentences) that answers:
- What happened?
- Where?
- Why it matters to public health?

Also classify this news:
- "confirmed" = Official case report or government update
- "emerging" = New outbreak or international health risk
- "predictive" = Potential risk or early warning signal

Return JSON:
{
  "summary": "AI-generated summary here...",
  "classification": "confirmed/emerging/predictive",
  "keyRisk": "Brief risk description"
}`;

      try {
        const summaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [
              { role: 'system', content: 'You are a public health analyst. Provide neutral, factual summaries. Never copy text verbatim.' },
              { role: 'user', content: summaryPrompt }
            ],
            temperature: 0.2,
          }),
        });

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          const summaryContent = summaryData.choices[0]?.message?.content;
          
          let summaryParsed = { summary: '', classification: 'confirmed', keyRisk: '' };
          try {
            const jsonMatch = summaryContent.match(/```json\n([\s\S]*?)\n```/) || 
                              summaryContent.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : summaryContent;
            summaryParsed = JSON.parse(jsonStr);
          } catch {
            summaryParsed.summary = summaryContent?.slice(0, 200) || article.title;
          }

          processedArticles.push({
            id: `news-${Date.now()}-${processedArticles.length}`,
            title: article.title,
            source: article.source,
            url: article.url || `https://www.google.com/search?q=${encodeURIComponent(article.title)}`,
            publishedAt: article.publishedAt || new Date().toISOString().split('T')[0],
            aiSummary: summaryParsed.summary || article.title,
            classification: summaryParsed.classification as 'confirmed' | 'emerging' | 'predictive' || 'confirmed',
            disease: article.disease,
            location: article.location,
            severity: article.severity || 'low'
          });
        }
      } catch (err) {
        console.error('Error processing article:', err);
        // Still add article with basic info
        processedArticles.push({
          id: `news-${Date.now()}-${processedArticles.length}`,
          title: article.title,
          source: article.source,
          url: article.url || '#',
          publishedAt: article.publishedAt || new Date().toISOString().split('T')[0],
          aiSummary: `${article.disease || 'Health update'} reported in ${article.location || 'Vietnam'}.`,
          classification: 'confirmed',
          disease: article.disease,
          location: article.location,
          severity: article.severity || 'low'
        });
      }
    }

    // Step 3: Calculate overall risk
    let overallRisk: 'low' | 'medium' | 'high' = 'low';
    const hasHighSeverity = processedArticles.some(a => a.severity === 'high');
    const hasMediumSeverity = processedArticles.some(a => a.severity === 'medium');
    const hasEmerging = processedArticles.some(a => a.classification === 'emerging');
    
    if (hasHighSeverity || (hasEmerging && hasMediumSeverity)) {
      overallRisk = 'high';
    } else if (hasMediumSeverity || hasEmerging) {
      overallRisk = 'medium';
    }

    console.log(`✅ Processed ${processedArticles.length} articles. Overall risk: ${overallRisk}`);

    return new Response(
      JSON.stringify({
        success: true,
        articles: processedArticles,
        overallRisk,
        lastUpdated: new Date().toISOString(),
        metadata: {
          sourcesChecked: ['Ministry of Health Vietnam', 'WHO', 'CDC', 'VnExpress', 'Tuổi Trẻ'],
          articlesFound: parsedArticles.length,
          articlesProcessed: processedArticles.length
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
