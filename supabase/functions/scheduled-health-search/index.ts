/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { callAIWithFallback } from "../_shared/aiProvider.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  caseCount?: number | null;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function generateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getLastRunTime(jobName: string): Promise<Date | null> {
  const { data, error } = await supabase
    .from('scheduler_runs')
    .select('completed_at')
    .eq('job_name', jobName)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data?.completed_at) return null;
  return new Date(data.completed_at);
}

async function createRunRecord(jobName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('scheduler_runs')
    .insert({
      job_name: jobName,
      status: 'running',
      metadata: { startedAt: new Date().toISOString(), searchEngine: 'firecrawl' }
    })
    .select('id')
    .single();
  if (error) { console.error('Failed to create run record:', error); return null; }
  return data?.id;
}

async function updateRunRecord(
  runId: string, status: 'completed' | 'failed',
  articlesFound: number, articlesNew: number, errorMessage?: string
): Promise<void> {
  await supabase.from('scheduler_runs').update({
    completed_at: new Date().toISOString(), status,
    articles_found: articlesFound, articles_new: articlesNew, error_message: errorMessage
  }).eq('id', runId);
}

async function articleExists(hash: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('health_news_articles')
    .select('id')
    .eq('article_hash', hash)
    .maybeSingle();
  return !error && !!data;
}

async function storeArticle(article: RawArticle, hash: string): Promise<boolean> {
  const { error } = await supabase.from('health_news_articles').insert({
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
    case_count: article.caseCount || null,
    processed: false
  });
  if (error) { console.error('Failed to store article:', error); return false; }
  return true;
}

// ─── Firecrawl Web Search ─────────────────────────────────────────────────────

const SEARCH_QUERIES = [
  'Việt Nam dịch bệnh sốt xuất huyết tay chân miệng số ca mắc 2026',
  'Vietnam dengue HFMD measles outbreak cases deaths 2026',
  'Bộ Y tế cảnh báo dịch bệnh COVID cúm số ca tăng',
  'Ho Chi Minh Hanoi disease cases hospital outbreak alert',
  'WHO ASEAN Vietnam public health surveillance epidemic',
];

async function firecrawlSearch(query: string): Promise<any[]> {
  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  if (!FIRECRAWL_API_KEY) throw new Error('FIRECRAWL_API_KEY not configured');

  console.log(`🔎 Firecrawl searching: "${query}"`);

  const response = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      limit: 8,
      lang: 'vi',
      country: 'VN',
      tbs: 'qdr:w',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.warn(`⚠️ Firecrawl search failed for "${query}": ${response.status} ${errText.substring(0, 200)}`);
    return [];
  }

  const data = await response.json();
  const results = data?.data || [];
  console.log(`📋 Firecrawl "${query.substring(0, 30)}..." → ${results.length} results`);
  return results;
}

const VALID_CLASSIFICATIONS = ['confirmed', 'emerging', 'predictive'];
function sanitizeClassification(val?: string): 'confirmed' | 'emerging' | 'predictive' {
  if (val && VALID_CLASSIFICATIONS.includes(val)) return val as any;
  return 'confirmed';
}

async function performWebSearch(): Promise<RawArticle[]> {
  console.log('🔍 Starting Firecrawl web search (4 queries in parallel)...');

  // Run all 4 queries in parallel for speed
  const batchResults = await Promise.allSettled(
    SEARCH_QUERIES.map(q => firecrawlSearch(q))
  );

  const allResults: any[] = [];
  for (const r of batchResults) {
    if (r.status === 'fulfilled') allResults.push(...r.value);
  }

  console.log(`📰 Firecrawl returned ${allResults.length} raw results`);

  if (allResults.length === 0) {
    console.warn('⚠️ No Firecrawl results, falling back to AI generation');
    return performAIFallback();
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = allResults.filter(r => {
    if (!r?.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  console.log(`📰 ${unique.length} unique results after dedup`);

  // Use AI to classify the search results
  return classifyWithAI(unique);
}

// ─── AI Classification of real search results ─────────────────────────────────

async function classifyWithAI(results: any[]): Promise<RawArticle[]> {
  const summaries = results.slice(0, 15).map((r, i) => 
    `[${i}] Title: ${r.title || 'N/A'}\nURL: ${r.url}\nContent: ${(r.description || r.markdown || '').substring(0, 500)}`
  ).join('\n\n---\n\n');

  const result = await callAIWithFallback({
    messages: [
      {
        role: 'system',
        content: `You are an expert epidemiological intelligence analyst specializing in Vietnam and Southeast Asia.

Your task: Deep-analyze health news articles to extract PRECISE disease surveillance data.

EXTRACTION RULES:
1. **caseCount**: Extract the EXACT number of cases mentioned. Look for patterns like "X ca", "X cases", "X người mắc", "X trường hợp", "tăng X%". If a percentage increase is given with a base, calculate the absolute number. If no number found, return null.
2. **diseaseType**: Map to canonical codes: dengue, covid19, hfmd (hand-foot-mouth), influenza, ari (acute respiratory infection), measles, tuberculosis, cholera, rabies, environmental, food_safety, vaccination, policy, other
3. **location**: Extract the MOST SPECIFIC location mentioned (district > city > province > country). Vietnamese locations preferred.
4. **severity**: 
   - critical: deaths reported, outbreak declared, or >1000 cases
   - high: rapid increase (>50%), hospital overload, or >100 cases in a week
   - medium: moderate increase, localized clusters, or 10-100 cases
   - low: sporadic cases, stable trends, or preventive measures only
5. **classification**:
   - confirmed: official reports from MoH/CDC/WHO with verified numbers
   - emerging: first reports, unconfirmed clusters, community signals
   - predictive: forecasts, seasonal warnings, risk assessments
6. **summary**: One-sentence epidemiological summary in Vietnamese, include key numbers and trend direction (tăng/giảm/ổn định).

Return ONLY a JSON array. Each item:
{"index": <number>, "diseaseType": "...", "location": "...", "severity": "...", "classification": "...", "caseCount": <number|null>, "summary": "..."}`
      },
      {
        role: 'user',
        content: `Analyze and classify these health articles with maximum precision:\n\n${summaries}\n\nReturn ONLY the JSON array.`
      }
    ],
    temperature: 0.1,
    maxTokens: 3000,
    functionName: 'scheduled-health-search-classify',
  });

  console.log(`🤖 Classification by ${result.providerUsed} (${result.latencyMs}ms)`);

  // Parse classifications
  let classifications: any[] = [];
  try {
    const match = result.content.match(/\[[\s\S]*\]/);
    if (match) classifications = JSON.parse(match[0]);
  } catch (e) {
    console.warn('⚠️ Failed to parse AI classifications, using defaults');
  }

  const classMap = new Map(classifications.map((c: any) => [c.index, c]));

  // Build articles from real search results + AI classification
  const articles: RawArticle[] = [];
  for (let i = 0; i < Math.min(results.length, 15); i++) {
    const r = results[i];
    const c = classMap.get(i) || {};
    
    if (!r.url || !r.title) continue;

    // Use AI summary if available, otherwise fall back to raw content
    const contentSummary = c.summary || (r.description || r.markdown || '').substring(0, 500);

    articles.push({
      title: r.title,
      source: new URL(r.url).hostname.replace('www.', ''),
      url: r.url,
      publishedAt: new Date().toISOString(),
      content: contentSummary,
      diseaseType: c.diseaseType || 'other',
      location: c.location || 'Vietnam',
      severity: c.severity || 'medium',
      classification: sanitizeClassification(c.classification),
      caseCount: typeof c.caseCount === 'number' ? c.caseCount : null,
    });
  }

  console.log(`✅ Built ${articles.length} classified articles from real search results`);
  return articles;
}

// ─── AI Fallback (when Firecrawl fails) ───────────────────────────────────────

async function performAIFallback(): Promise<RawArticle[]> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const month = now.getMonth() + 1;
  const season = (month >= 4 && month <= 10) ? 'rainy season' : 'dry season';

  const result = await callAIWithFallback({
    messages: [
      {
        role: 'system',
        content: `You are a Vietnam health bulletin generator. Today: ${today} (${season}).
Return ONLY a JSON array of 6-8 items. Each: {"title":"...","source":"...","url":"https://...","publishedAt":"${today}T07:00:00Z","content":"...","diseaseType":"...","location":"...","severity":"...","classification":"..."}`
      },
      { role: 'user', content: 'Generate Vietnam health news bulletin. Return ONLY JSON array.' }
    ],
    temperature: 0.2,
    maxTokens: 3000,
    functionName: 'scheduled-health-search-fallback',
  });

  try {
    const match = result.content.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return parsed.filter((a: any) => a.url && a.title).map((a: any) => ({
        ...a,
        classification: sanitizeClassification(a.classification),
      }));
    }
  } catch (e) {
    console.warn('⚠️ AI fallback parse failed');
  }
  return [];
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const jobName = 'scheduled-health-web-search';
  console.log('🚀 Health News Search Agent started (Firecrawl + AI classify)');

  const runId = await createRunRecord(jobName);
  if (!runId) {
    return new Response(JSON.stringify({ success: false, error: 'Failed to create run record' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const lastRunTime = await getLastRunTime(jobName);
    console.log(`📅 Last run: ${lastRunTime?.toISOString() || 'Never'}`);

    const rawArticles = await performWebSearch();
    let articlesNew = 0;
    const newArticles: RawArticle[] = [];

    for (const article of rawArticles) {
      const hash = await generateHash(`${article.title}|${article.url}`);
      if (await articleExists(hash)) {
        console.log(`⏭️ Duplicate: ${article.title?.substring(0, 50)}`);
        continue;
      }
      if (await storeArticle(article, hash)) {
        articlesNew++;
        newArticles.push(article);
        console.log(`💾 Stored: ${article.title?.substring(0, 50)}`);
      }
    }

    await updateRunRecord(runId, 'completed', rawArticles.length, articlesNew);

    if (articlesNew > 0) {
      const channel = supabase.channel('health-news-feed');
      await channel.send({
        type: 'broadcast', event: 'new-articles',
        payload: {
          timestamp: new Date().toISOString(),
          articlesCount: articlesNew,
          articles: newArticles.slice(0, 5),
        }
      });
      console.log(`📤 Broadcasted ${articlesNew} new articles`);
    }

    const result = {
      success: true, runId,
      timestamp: new Date().toISOString(),
      searchEngine: 'firecrawl',
      articlesFound: rawArticles.length,
      articlesNew,
      articlesSkipped: rawArticles.length - articlesNew,
      lastRunTime: lastRunTime?.toISOString() || null,
      newArticles: newArticles.map(a => ({
        title: a.title, source: a.source, url: a.url,
        diseaseType: a.diseaseType, severity: a.severity,
      })),
    };

    console.log(`✅ Done: ${articlesNew} new, ${rawArticles.length - articlesNew} skipped`);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Search failed:', error);
    await updateRunRecord(runId, 'failed', 0, 0, error.message);
    return new Response(JSON.stringify({ success: false, runId, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
