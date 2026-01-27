import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Scheduled Public Health Web Search Agent
 * 
 * Execution mode: Runs automatically every 15 minutes via pg_cron
 * 
 * Tasks:
 * - Perform real-time web searches for public health updates
 * - Focus on: new disease cases, outbreak signals, government announcements, environmental risks
 * - Deduplicate articles using SHA256 hash
 * - Store raw articles with timestamps and source URLs
 */

interface RawArticle {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  content: string;
  diseaseType?: string;
  location?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  classification?: 'confirmed' | 'emerging' | 'predictive';
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Generate SHA256 hash for deduplication
async function generateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get last successful run time
async function getLastRunTime(jobName: string): Promise<Date | null> {
  const { data, error } = await supabase
    .from('scheduler_runs')
    .select('completed_at')
    .eq('job_name', jobName)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data?.completed_at) {
    return null;
  }
  return new Date(data.completed_at);
}

// Create scheduler run record
async function createRunRecord(jobName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('scheduler_runs')
    .insert({
      job_name: jobName,
      status: 'running',
      metadata: {
        startedAt: new Date().toISOString(),
        searchEngine: 'Perplexity'
      }
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create run record:', error);
    return null;
  }
  return data?.id;
}

// Update scheduler run record
async function updateRunRecord(
  runId: string, 
  status: 'completed' | 'failed', 
  articlesFound: number, 
  articlesNew: number,
  errorMessage?: string
): Promise<void> {
  const { error } = await supabase
    .from('scheduler_runs')
    .update({
      completed_at: new Date().toISOString(),
      status,
      articles_found: articlesFound,
      articles_new: articlesNew,
      error_message: errorMessage
    })
    .eq('id', runId);

  if (error) {
    console.error('Failed to update run record:', error);
  }
}

// Check if article already exists
async function articleExists(hash: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('health_news_articles')
    .select('id')
    .eq('article_hash', hash)
    .single();

  return !error && !!data;
}

// Store new article
async function storeArticle(article: RawArticle, hash: string): Promise<boolean> {
  const { error } = await supabase
    .from('health_news_articles')
    .insert({
      article_hash: hash,
      title: article.title,
      source: article.source,
      url: article.url,
      published_at: article.publishedAt,
      content_summary: article.content?.substring(0, 500),
      disease_type: article.diseaseType,
      location: article.location,
      severity: article.severity,
      classification: article.classification,
      raw_content: article.content,
      processed: false
    });

  if (error) {
    console.error('Failed to store article:', error);
    return false;
  }
  return true;
}

// Main web search function using Perplexity
async function performWebSearch(sinceTime: Date | null): Promise<RawArticle[]> {
  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
  
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  const now = new Date();
  const vietnamTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const today = vietnamTime.toISOString().split('T')[0];
  
  // Build time-aware search query
  let timeConstraint = 'in the last 15 minutes';
  if (sinceTime) {
    const minutesAgo = Math.round((now.getTime() - sinceTime.getTime()) / (1000 * 60));
    timeConstraint = `in the last ${Math.max(15, minutesAgo)} minutes`;
  }

  const searchQueries = [
    // Disease outbreaks
    `Vietnam disease outbreak cases ${today} dengue COVID-19 HFMD influenza respiratory illness ${timeConstraint}`,
    // Government announcements  
    `Vietnam Ministry of Health announcement disease alert warning ${today} ${timeConstraint}`,
    // Environmental health
    `Vietnam environmental health air quality water contamination food safety ${today} ${timeConstraint}`
  ];

  const allArticles: RawArticle[] = [];

  for (const query of searchQueries) {
    try {
      console.log(`🔍 Searching: ${query.substring(0, 50)}...`);

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
              content: `You are a real-time public health news crawler. Current time: ${vietnamTime.toISOString()}.

CRITICAL: Only return news published or updated in the last 15-30 minutes if available, otherwise within the last few hours.

Return ONLY a valid JSON array with this exact format (no markdown, no explanation):
[
  {
    "title": "Exact news headline",
    "source": "Source name (e.g., VnExpress, Tuổi Trẻ, Ministry of Health)",
    "url": "Direct URL to the article",
    "publishedAt": "ISO 8601 timestamp",
    "content": "Full article summary (2-3 sentences)",
    "diseaseType": "dengue|covid19|hfmd|influenza|ari|environmental|food_safety|other",
    "location": "Specific location if mentioned",
    "severity": "low|medium|high|critical",
    "classification": "confirmed|emerging|predictive"
  }
]

If no recent news found, return empty array: []`
            },
            {
              role: 'user',
              content: query
            }
          ],
          search_recency_filter: 'day',
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        console.error(`Perplexity API error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const citations = data.citations || [];

      // Parse JSON from response
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const articles = JSON.parse(jsonMatch[0]);
          
          // Enhance with citation URLs
          articles.forEach((article: any, idx: number) => {
            if (!article.url && citations[idx]) {
              article.url = citations[idx];
            }
            allArticles.push(article);
          });
        }
      } catch (parseError) {
        console.error('Failed to parse search results:', parseError);
      }

      // Rate limiting between queries
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`Search query failed:`, error);
    }
  }

  console.log(`📰 Found ${allArticles.length} total articles from searches`);
  return allArticles;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const jobName = 'scheduled-health-web-search';
  const vietnamTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
  
  console.log(`🚀 Scheduled Web Search Agent started at ${vietnamTime}`);

  // Create run record
  const runId = await createRunRecord(jobName);
  if (!runId) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to create run record' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get last run time for incremental search
    const lastRunTime = await getLastRunTime(jobName);
    console.log(`📅 Last successful run: ${lastRunTime?.toISOString() || 'Never'}`);

    // Perform web search
    const rawArticles = await performWebSearch(lastRunTime);
    
    let articlesNew = 0;
    const newArticles: RawArticle[] = [];

    // Process and deduplicate articles
    for (const article of rawArticles) {
      // Generate hash from title + URL for deduplication
      const hashInput = `${article.title}|${article.url}`;
      const hash = await generateHash(hashInput);

      // Check if article already exists
      const exists = await articleExists(hash);
      if (exists) {
        console.log(`⏭️ Skipping duplicate: ${article.title?.substring(0, 50)}...`);
        continue;
      }

      // Store new article
      const stored = await storeArticle(article, hash);
      if (stored) {
        articlesNew++;
        newArticles.push(article);
        console.log(`✅ Stored new article: ${article.title?.substring(0, 50)}...`);
      }
    }

    // Update run record with success
    await updateRunRecord(runId, 'completed', rawArticles.length, articlesNew);

    // Broadcast to realtime channel if new articles found
    if (articlesNew > 0) {
      const channel = supabase.channel('health-news-feed');
      await channel.send({
        type: 'broadcast',
        event: 'new-articles',
        payload: {
          timestamp: new Date().toISOString(),
          articlesCount: articlesNew,
          articles: newArticles.slice(0, 5) // Send first 5 for preview
        }
      });
      console.log(`📤 Broadcasted ${articlesNew} new articles to realtime channel`);
    }

    const result = {
      success: true,
      runId,
      timestamp: new Date().toISOString(),
      articlesFound: rawArticles.length,
      articlesNew,
      articlesSkipped: rawArticles.length - articlesNew,
      lastRunTime: lastRunTime?.toISOString() || null,
      newArticles: newArticles.map(a => ({
        title: a.title,
        source: a.source,
        url: a.url,
        diseaseType: a.diseaseType,
        severity: a.severity
      }))
    };

    console.log(`✅ Completed: ${articlesNew} new articles stored, ${rawArticles.length - articlesNew} duplicates skipped`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Scheduled search failed:', error);
    
    await updateRunRecord(runId, 'failed', 0, 0, error.message);

    return new Response(JSON.stringify({ 
      success: false, 
      runId,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
